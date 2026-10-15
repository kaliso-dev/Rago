"""Scripts de relevé : ce que chaque réglage va modifier, pour sauvegarder l'état réel avant de l'appliquer.

Le moteur lance d'abord ce script « à blanc » : mêmes boucles, mêmes variables, mêmes conditions que le vrai script,
mais chaque commande qui modifie quelque chose est remplacée par une ligne `echo @@RAGO <type> "<arg>" …` qui dit ce
qu'elle va toucher, et toute autre commande par `ver >nul` (rien). Le moteur lit ces lignes, relève les valeurs
actuelles (registre, démarrage des services, valeurs fsutil, bcdedit, tâches planifiées, alimentation), puis lance le
vrai script. Décocher le réglage remet ces valeurs.

Types émis (lus par src-tauri/src/backup.rs) :
  reg "CLÉ" "NOM"      valeur de registre (NOM vide : valeur par défaut) ; aussi services, fsutil et setx
  regkey "CLÉ"         clé créée par `reg add CLÉ /f` sans valeur
  regvals "CLÉ"        toutes les valeurs d'une clé (`reg delete CLÉ /va`)
  regtree "CLÉ"        clé entière supprimée (`reg delete CLÉ /f`)
  bcd "{id}" "NOM"     élément bcdedit
  task "CHEMIN"        tâche planifiée activée ou désactivée
  pwr "SCHÉMA" "SOUS-GROUPE" "RÉGLAGE"   index secteur et batterie d'un réglage d'alimentation
  pwractive            plan d'alimentation actif
  hib                  mise en veille prolongée
  plan "GUID"          plan d'alimentation supprimé (exporté avec powercfg /export avant)
  state "NOM"          état lu par le moteur (PowerShell, net accounts, NVAPI), voir STATE_PS ; décocher le réglage
                       remet seulement ce que le script a changé et que personne n'a touché depuis
  untouched "NOM"      état que le script ne change plus (ajouté par build_catalog_v6.state_guards) : rien n'est lu,
                       rest saute la commande inverse gardée pour les PC passés par l'ancien script
  appx "NOM"           applis du Store dont le nom correspond (jokers *) : celles installées pour le joueur sont
                       relevées (nom, famille, dossier) et réenregistrées au retour (`Get-AppxPackage … | Remove-AppxPackage`)

    python3 tools/probes.py          # vérifie et affiche la couverture
"""
import json
import os
import re
import sys

# fsutil behavior set NOM → valeur du registre qu'il écrit (HKLM\SYSTEM\CurrentControlSet\Control\FileSystem)
FS = r'HKLM\SYSTEM\CurrentControlSet\Control\FileSystem'
FSUTIL = {
    'disablelastaccess': 'NtfsDisableLastAccessUpdate',
    'disable8dot3': 'NtfsDisable8dot3NameCreation',
    'memoryusage': 'NtfsMemoryUsage',
    'mftzone': 'NtfsMftZoneReservation',
    'encryptpagingfile': 'NtfsEncryptPagingFile',
    'disabledeletenotify': 'DisableDeleteNotification',
    'disablecompression': 'NtfsDisableCompression',
    'disableencryption': 'NtfsDisableEncryption',
    'allowextchar': 'NtfsAllowExtendedCharacterIn8dot3Name',
    'bugcheckoncorrupt': 'NtfsBugcheckOnCorrupt',
    'quotanotify': 'NtfsQuotaNotifyRate',
    'symlinkevaluation': 'SymlinkLocalToLocalEvaluation',
    'disabletxf': 'NtfsDisableTxf',
}
# powercfg -change <alias> → sous-groupe et réglage
PWR_CHANGE = {
    'monitor-timeout': ('SUB_VIDEO', 'VIDEOIDLE'),
    'disk-timeout': ('SUB_DISK', 'DISKIDLE'),
    'standby-timeout': ('SUB_SLEEP', 'STANDBYIDLE'),
    'hibernate-timeout': ('SUB_SLEEP', 'HIBERNATEIDLE'),
}
NOOP = 'ver >nul'
# commandes PowerShell dont l'état d'avant est lu par le moteur (backup.rs, Probe::State), audit du 2026-10-07 :
# compression mémoire (Get-MMAgent), SMB (Get-SmbClient/ServerConfiguration, SMB1), propriétés des cartes réseau
# (Get-NetAdapterAdvancedProperty, Get-NetAdapterPowerManagement), « Autoriser l'ordinateur à éteindre ce
# périphérique » (MSPower_DeviceEnable)
STATE_PS = [
    ('mmagent', r'(dis|en)able-mmagent'),
    ('smb', r'set-smb(client|server)configuration|(dis|en)able-windowsoptionalfeature\b.*smb1'),
    ('nic', r'set-netadapteradvancedproperty|(dis|en)able-netadapterpowermanagement|set-netadapterpowermanagement'
            r'|(dis|en)able-netadapterlso|reset-netadapteradvancedproperty'),
    ('pnppower', r'mspower_deviceenable'),
]
# tous les états connus du moteur (backup.rs, STATES) : ceux de PowerShell, net accounts et le profil NVIDIA
STATES = [n for n, _ in STATE_PS] + ['maxpwage', 'nvbase']
GUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
# PowerShell qui désinstalle une appli du Store pour le joueur : `Get-AppxPackage [-AllUsers] [-Name] MOTIF [ÉDITEUR]
# | Remove-AppxPackage`. MOTIF est le nom du paquet (jokers *) ; un second mot sans guillemets (« *Drawboard PDF* »)
# est pris par PowerShell comme éditeur et n'élargit pas la recherche : seul MOTIF est relevé.
APPX_REMOVE = re.compile(r'(?i)Get-AppxPackage\s+(?:-AllUsers\s+)?(?:-Name\s+)?([^\s|"}\'-][^\s|"}\']*)[^|]*\|\s*Remove-AppxPackage\b')


def appx_patterns(script):
    """Noms d'applis du Store que le script désinstalle, dans l'ordre, sans doublon (casse ignorée)."""
    out, seen = [], set()
    for line in script.replace('\r\n', '\n').split('\n'):
        s = line.strip()
        if re.match(r'(?i)^(echo|rem\b|::)', s):
            continue
        for m in APPX_REMOVE.finditer(s):
            pat = m.group(1)
            if pat.lower() not in seen:
                seen.add(pat.lower())
                out.append(pat)
    return out
# commandes lancées dans la partie IN d'un for /f : lecture seule
IN_OK = re.compile(r'(?i)^\s*(reg(\.exe)?\s+query|sc\s+query\b|find\b|sort\b|more\b|wmic\b.*\bget\b|findstr|dir\b|type\b|echo\b|ver\b|call\s+"%RAGO_RES%\\smartctl\.exe"\s+--scan'
                   r'|powershell(\.exe)?\s+(-\w+\s+)*"?(&\s*\{\s*)?\(?\s*Get-)')


def split_top(s, ops=('&&', '||', '&', '|')):
    """Découpe aux opérateurs hors guillemets. Renvoie [(morceau, opérateur qui suit)]."""
    out, cur, q, i = [], '', False, 0
    while i < len(s):
        c = s[i]
        if c == '"':
            q = not q
        if not q and c == '^' and i + 1 < len(s):
            cur += s[i:i + 2]
            i += 2
            continue
        if not q:
            op = next((o for o in ops if s.startswith(o, i)), None)
            if op and not (op.startswith('&') and cur.endswith('>')):
                out.append((cur, op))
                cur = ''
                i += len(op)
                continue
        cur += c
        i += 1
    out.append((cur, ''))
    return out


def unquoted(s):
    return re.sub(r'"[^"]*"', '""', s)


def tokens(s):
    """Arguments d'une commande, guillemets gardés."""
    return re.findall(r'"[^"]*"|[^\s"]+(?:"[^"]*")?[^\s"]*', s)


def unq(t):
    return t[1:-1] if len(t) >= 2 and t[0] == t[-1] == '"' else t


def q(t):
    t = unq(t)
    return f'"{t}"'


def strip_redir(s):
    # >nul 2>&1, > NUL 2>&1, 2>nul, > $null 2>&1, >> fichier
    return re.sub(r'\s*\d?>>?\s*&?\s*(\$?null|nul|NUL|&\d|"[^"]*"|\S+)', '', s).strip()


def marker(*parts):
    return 'echo @@RAGO ' + ' '.join(parts)


def dry_cmd(cmd):
    """Une commande simple → ligne de relevé, ou NOOP."""
    raw = cmd.strip()
    if not raw:
        return ''
    c = strip_redir(raw)
    toks = tokens(c)
    if not toks:
        return NOOP
    head = re.sub(r'(?i)\.exe$', '', unq(toks[0]).split('\\')[-1]).lower()
    args = toks[1:]
    low = [a.lower() for a in args]
    if head in ('set', 'setlocal', 'endlocal', 'exit', 'shift'):
        return raw
    if head == 'reg' and low and low[0] in ('add', 'delete') and len(args) >= 2:
        key = q(args[1])
        if '/v' in low:
            name = args[low.index('/v') + 1] if low.index('/v') + 1 < len(args) else '""'
            return marker('reg', key, q(name))
        if '/ve' in low:
            return marker('reg', key, '""')
        if low[0] == 'delete' and '/va' in low:
            return marker('regvals', key)
        return marker('regkey' if low[0] == 'add' else 'regtree', key)
    if head == 'setx' and args:
        k = r'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' if '/m' in low else r'HKCU\Environment'
        return marker('reg', f'"{k}"', q(args[0]))
    if head == 'sc' and low and low[0] == 'config' and len(args) >= 2 and any(a.startswith('start=') for a in low):
        svc = unq(args[1])
        k = f'"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{svc}"'
        return marker('reg', k, '"Start"') + ' & ' + marker('reg', k, '"DelayedAutostart"')
    if head == 'fsutil' and len(low) >= 3 and low[0] == 'behavior' and low[1] == 'set':
        name = FSUTIL.get(low[2])
        return marker('reg', f'"{FS}"', f'"{name}"') if name else NOOP
    if head == 'bcdedit' and low:
        sub = low[0]
        if sub in ('/set', '-set', '/deletevalue', '-deletevalue') and len(args) >= 2:
            if args[1].startswith('{') and len(args) >= 3:
                return marker('bcd', q(args[1]), q(args[2].lower()))
            return marker('bcd', '"{current}"', q(args[1].lower()))
        if sub in ('/timeout', '-timeout'):
            return marker('bcd', '"{bootmgr}"', '"timeout"')
        return NOOP
    if head == 'schtasks' and low and low[0] in ('/change', '-change') and ('/disable' in low or '/enable' in low) and '/tn' in low:
        return marker('task', q(args[low.index('/tn') + 1]))
    if head == 'powercfg' and low:
        sub = low[0].lstrip('/-')
        if sub in ('setacvalueindex', 'setdcvalueindex') and len(args) >= 4:
            return marker('pwr', q(args[1]), q(args[2]), q(args[3]))
        if sub in ('setactive', 's'):
            return marker('pwractive')
        if sub in ('h', 'hibernate'):
            return marker('hib')
        if sub in ('change', 'x') and len(low) >= 2:
            alias = re.sub(r'-(ac|dc)$', '', low[1].lstrip('-/'))
            if alias in PWR_CHANGE:
                return marker('pwr', '"scheme_current"', *(f'"{x}"' for x in PWR_CHANGE[alias]))
        if sub in ('duplicatescheme', 'import'):
            return marker('pwractive')
        if sub in ('delete', 'd') and len(args) >= 2 and GUID.fullmatch(unq(args[1]).lower()):
            return marker('plan', q(unq(args[1]).lower()))
        return NOOP
    if head in ('powershell', 'pwsh'):
        pats = appx_patterns(raw)
        if pats:
            return ' & '.join(marker('appx', f'"{p}"') for p in pats)
        t = c.lower()
        name = next((n for n, pat in STATE_PS if re.search(pat, t)), None)
        return marker('state', f'"{name}"') if name else NOOP
    if head == 'net' and low[:1] == ['accounts'] and any(a.startswith('/maxpwage') for a in low):
        return marker('state', '"maxpwage"')
    if head == 'nvidiaprofileinspector':
        # profil importé dans le pilote : réglages du profil de base lus avant (NVAPI)
        return marker('state', '"nvbase"')
    return NOOP


def dry_chain(text):
    out = []
    for piece, op in split_top(text, ('&&', '||', '&')):
        p = piece.strip()
        lead = ''
        while p.startswith('('):
            lead += '('
            p = p[1:].lstrip()
        trail = ''
        while p.endswith(')') and unquoted(p).count('(') < unquoted(p).count(')'):
            trail = ')' + trail
            p = p[:-1].rstrip()
        if not p:
            body = ''
        elif '|' in [o for _, o in split_top(p, ('|',))][:-1]:
            body = NOOP
        elif re.match(r'(?i)^(if|for)\b', p):
            body = dry_line(p)
        else:
            body = dry_cmd(p)
        seg = (lead + ' ' + body if lead and body else lead + body) + (' ' + trail if trail and body else trail)
        out.append(seg.strip())
        if op:
            out.append('&')
    return ' '.join(x for x in out if x).strip(' &')


def find_in_clause(s):
    """Position de la parenthèse fermante de `in (...)`."""
    m = re.search(r'(?i)\bin\s*\(', s)
    if not m:
        return None, None
    i, depth, q1, q2 = m.end(), 1, False, False
    while i < len(s):
        c = s[i]
        if c == "'" and not q2:
            q1 = not q1
        elif c == '"' and not q1:
            q2 = not q2
        elif not q1 and not q2:
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    return m.end(), i
        i += 1
    return None, None


def check_in(clause):
    c = clause.strip()
    if not (c.startswith("'") and c.endswith("'")):
        return  # liste de mots ou fichier : rien n'est lancé
    for piece, _ in split_top(c[1:-1].replace('^|', '|').replace('^&', '&'), ('|', '&')):
        if piece.strip() and not IN_OK.match(piece.strip()):
            raise ValueError(f'commande dans un for /f : {piece.strip()}')


def dry_line(line):
    s = line.strip()
    low = s.lower()
    if not s or low.startswith(('echo', 'rem ', '::', '@echo', 'title', 'color', 'cls', 'chcp', 'pause', 'timeout')) or low == 'rem' or s.startswith(':'):
        return ''
    if s.startswith('@'):
        s = s[1:]
        low = s.lower()
    if re.match(r'^\)\s*else\s*\(\s*$', low) or s in ('(', ')'):
        return s
    if strip_redir(s) == ')':
        return ')'  # « ) > nul » ferme toujours le bloc (avant : devenait « ver >nul », bloc jamais fermé)
    if low.startswith('for ') or low.startswith('for\t'):
        a, b = find_in_clause(s)
        if a is None:
            raise ValueError(f'for sans in (...) : {s}')
        check_in(s[a:b])
        m = re.match(r'(?i)\s*do\s+', s[b + 1:])
        if not m:
            raise ValueError(f'for sans do : {s}')
        head = s[:b + 1 + m.end()]
        body = s[b + 1 + m.end():]
        return head + (dry_chain(body) or NOOP)
    if low.startswith('if '):
        toks = tokens(s)
        i = 1
        if i < len(toks) and toks[i].lower() == '/i':
            i += 1
        if i < len(toks) and toks[i].lower() == 'not':
            i += 1
        if toks[i].lower() in ('exist', 'defined', 'errorlevel'):
            i += 2
        elif i + 1 < len(toks) and toks[i + 1].startswith('==') and len(toks[i + 1]) > 2:
            i += 2
        elif '==' in toks[i] and not toks[i].endswith('=='):
            i += 1
        elif i + 1 < len(toks) and toks[i + 1].lower() in ('==', 'equ', 'neq', 'lss', 'leq', 'gtr', 'geq'):
            i += 3
        elif toks[i].endswith('=='):
            i += 2
        else:
            raise ValueError(f'if illisible : {s}')
        # reconstruit la condition depuis le texte d'origine (espaces gardés)
        pos = 0
        for t in toks[:i]:
            pos = s.index(t, pos) + len(t)
        cond, rest = s[:pos], s[pos:].strip()
        if rest.lower().startswith('else'):
            raise ValueError(f'if sans commande : {s}')
        body = dry_chain(rest) if rest not in ('(',) else '('
        return f'{cond} {body or NOOP}'
    return dry_chain(s)


def dry_script(script):
    out = []
    in_list = False
    for line in script.replace('\r\n', '\n').split('\n'):
        s = line.strip()
        # for %%a in ( sur plusieurs lignes : la liste est gardée telle quelle jusqu'à ") do"
        if in_list:
            m = re.match(r'(?i)^\)\s*do\s+', s)
            if m:
                in_list = False
                out.append(s[:m.end()] + (dry_chain(s[m.end():]) or NOOP))
            elif s:
                if not re.match(r'^[\w.*"{}\\-]+$', s):
                    raise ValueError(f'liste de for inattendue : {s}')
                out.append(s)
            continue
        if re.match(r'(?i)^for\b.*\bin\s*\(\s*$', s):
            in_list = True
            out.append(s)
            continue
        d = dry_line(line)
        if d:
            # bloc dont toutes les lignes étaient des echo ou des commentaires : « ( » puis « ) » est une erreur de
            # syntaxe pour cmd, qui arrête le relevé là (RAG-68, 2026-10-13 : hitreg_suite ne relevait plus rien)
            if d.startswith(')') and out and opens_block(out[-1]):
                out.append(NOOP)
            out.append(d)
    return '\r\n'.join(out)


def opens_block(line):
    """La ligne se termine par une « ( » qui ouvre un bloc (hors guillemets, pas « ^( »)."""
    bare = re.sub(r'"[^"]*"', '""', line).rstrip()
    return bare.endswith('(') and not bare.endswith('^(')


ALLOWED_HEADS = re.compile(r'(?i)^(echo @@RAGO\b|ver >nul|set\b|setlocal\b|endlocal\b|exit\b|shift\b|for\b|if\b|\(|\)|&)')


def lint(dry):
    """Le relevé ne doit rien modifier : seules les commandes de la liste blanche restent."""
    in_list = False
    for line in dry.split('\r\n'):
        rest = line
        if in_list:
            m = re.match(r'(?i)^\)\s*do\s+', rest)
            if not m:
                if not re.match(r'^[\w.*"{}\\-]+$', rest.strip()):
                    raise ValueError(f'liste de for inattendue : {rest!r}')
                continue
            in_list = False
            rest = rest[m.end():]
        elif re.match(r'(?i)^for\b.*\bin\s*\(\s*$', rest.strip()):
            in_list = True
            continue
        # retire les en-têtes for ... do et if ... qui ont été vérifiés à la génération
        m = re.match(r'(?is)^\s*for\b.*?\bdo\s+(.*)$', rest)
        while m:
            a, b = find_in_clause(rest)
            rest = rest[b + 1:]
            rest = re.sub(r'(?i)^\s*do\s+', '', rest)
            m = re.match(r'(?is)^\s*for\b.*?\bdo\s+(.*)$', rest)
        for piece, _ in split_top(rest, ('&&', '||', '&')):
            p = piece.strip().lstrip('(').strip().rstrip(')').strip()
            if not p or re.match(r'^\)?\s*else\s*\(?$', p, re.I):
                continue
            if re.match(r'(?i)^if\b', p):
                continue
            if re.match(r'(?i)^for\b', p):
                continue
            if not ALLOWED_HEADS.match(p):
                raise ValueError(f'commande interdite dans un relevé : {p!r} ({line!r})')


def build(scripts):
    out = {}
    for tid, variants in scripts.items():
        out[tid] = {}
        for v, body in variants.items():
            d = dry_script(body)
            lint(d)
            out[tid][v] = d
    return out


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(__file__), '..')
    scripts = json.load(open(os.path.join(root, 'src-tauri', 'scripts', 'scripts.json')))
    probes = build(scripts)
    n = sum(d.count('@@RAGO') for v in probes.values() for d in v.values())
    print(f'{n} lignes de relevé')
    if len(sys.argv) > 1:
        for v, d in probes[sys.argv[1]].items():
            print('--', v)
            print(d)
