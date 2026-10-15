"""Chemins dans les scripts : `!VAR!` plutôt que `%VAR%`, et rien n'est supprimé sur un chemin vide ou abîmé
(revue du 2026-10-13, P1 et P2). Branché dans tools/build_catalog_v6.py : scripts (postprocess, après le RBW Mod),
relevés et annulations (main).

Le moteur lance chaque script après `setlocal EnableExtensions EnableDelayedExpansion` (runner.rs, PREAMBLE). cmd
remplace `%VAR%` en lisant la ligne, avant de la découper, puis remplace les `!…!` du texte obtenu : un `!` dans le nom
du compte (« Jean! ») est retiré, le texte entre deux `!` devient une autre variable. `"%temp%\\*"` peut alors viser le
dossier temporaire d'un AUTRE compte, et `del /s` ou `rd /s` agir au mauvais endroit. `!VAR!` est remplacé après le
découpage et son texte n'est jamais relu : ni `!`, ni `&`, ni parenthèses ne comptent.

1. convert : `%VAR%` → `!VAR!` pour les variables de chemin (PATH_VARS), partout (les `%%` restent : variable de boucle
   ou `%` écrit tel quel, comme `%%SystemRoot%%` des annulations). Refusé sur une ligne qui a déjà un `!` (il se
   mélangerait aux nouveaux), une ligne `call` (relue une deuxième fois) et une variable posée dans un bloc (`%VAR%`
   y garde la valeur d'avant le bloc, `!VAR!` non).
2. guards : `if defined VAR` devant chaque commande qui supprime ou change les droits (del, erase, rd, rmdir, forfiles,
   takeown, icacls) sur un chemin tiré de VAR, ou devant le bloc qui la contient : vide, `"!temp!\\*"` deviendrait
   `"\\*"`, la racine du disque.
3. toggles : une variable de boucle (`%%d`) est remplacée AVANT les `!…!`. Un dossier nommé `!SystemRoot!` dans
   C:\\Windows\\Temp (où un compte standard peut créer des dossiers) faisait lancer `rmdir "C:\\Windows" /s/q` par cln_temp,
   en administrateur ; un profil « Jean! » faisait vider le dossier temporaire de « Jean ». Les commandes qui suppriment
   sur une variable de boucle tournent avec `setlocal DisableDelayedExpansion` … `endlocal` : sur la ligne
   (`do (setlocal DisableDelayedExpansion & … & endlocal)`), ou autour du bloc `do ( … )`.
check relit le résultat avec les règles du test Rust `deletions_never_use_a_percent_path` (catalog.rs).

Avant tout ça, folders() récrit le nettoyage par `set folder="…"` (cln_temp, mc_optifine) : avec un espace dans le
chemin, `IF EXIST "%folder%"` (guillemets doublés) était lu de travers, le `cd` suivant pouvait échouer et la boucle
vidait alors le dossier où l'app lance ses scripts. Le chemin est écrit entre guillemets une fois, et la boucle ne tourne
que si le `cd` a réussi (`&&`).
"""
import re

# variables de Windows qui donnent un chemin (relevées sur les JSON générés, plus celles du profil), et celles que les
# scripts posent avec un chemin (sto_general)
WINDOWS_VARS = ('TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC',
                'SYSTEMROOT', 'WINDIR', 'SYSTEMDRIVE', 'HOMEDRIVE', 'HOMEPATH', 'USERNAME', 'ONEDRIVE', 'PROGRAMFILES',
                'PROGRAMFILES(X86)', 'PROGRAMW6432', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)')
SCRIPT_VARS = ('PROFILES_DIR',)
PATH_VARS = frozenset(WINDOWS_VARS + SCRIPT_VARS)

PERCENT = re.compile(r'%%|%([A-Za-z_][\w()#$.-]*)%')
BANG = re.compile(r'!([A-Za-z_][\w()#$.-]*)!')
FOR_VAR = re.compile(r'%%[~A-Za-z]')
ACTION = re.compile(r'(?i)(?:^|[\s&|(@])(del|erase|rd|rmdir|forfiles|takeown|icacls)(?:\.exe)?(?=\s|$)')
GUARD = re.compile(r'(?i)\bif\s+(?:/i\s+)?defined\s+([^\s"()&|]+)')
DDE_OFF = 'setlocal DisableDelayedExpansion'
FOR_HEAD = re.compile(r'(?i)(?:^|[\s&|(@])for\s')
IS_FOR = re.compile(r'(?i)^\s*@?\s*(?:if\s+(?:/i\s+)?(?:not\s+)?defined\s+\S+\s+)*for\s')

FOLDER = re.compile(
    r'^set folder="(?P<path>[^"\r\n]+)"(?P<sep>\r?\n)'
    r'IF EXIST "%folder%" \((?P=sep)'
    r'(?P<ind>[ \t]+)cd /d %folder%(?P=sep)'
    r'(?P=ind)(?P<loop>for /F "delims=" %%i in \(\'dir /b\'\) do [^\r\n]+)(?P=sep)'
    r'\)$', re.M)


def masked(line):
    """Le texte entre guillemets remplacé par des x (mêmes positions)."""
    return re.sub(r'"[^"]*"', lambda m: '"' + 'x' * (len(m.group(0)) - 2) + '"', line)


def kind(line):
    t = line.strip().lstrip('@').strip()
    low = t.lower()
    if t.startswith(':'):
        return 'label'
    if re.match(r'rem(\s|$)', low):
        return 'rem'
    if re.match(r'echo([\s.(:/]|$)', low):
        return 'echo'
    return 'cmd'


def parens(line):
    """+1 / -1 pour chaque parenthèse hors guillemets et hors ^ (comme block_errors de catalog.rs)."""
    if kind(line) != 'cmd':
        return []
    out, quoted, i = [], False, 0
    while i < len(line):
        c = line[i]
        if c == '"':
            quoted = not quoted
        elif c == '^' and not quoted:
            i += 1
        elif c == '(' and not quoted:
            out.append(1)
        elif c == ')' and not quoted:
            out.append(-1)
        i += 1
    return out


def block_end(lines, i):
    """Index de la ligne qui ferme le bloc ouvert par la ligne i."""
    depth = sum(parens(lines[i]))
    for j in range(i + 1, len(lines)):
        depth += sum(parens(lines[j]))
        if depth <= 0:
            return j
    raise ValueError(f'bloc jamais fermé : {lines[i]}')


def first_action(line):
    """Position de la première commande qui supprime ou prend possession, ou None. Un commentaire ne lance rien ; le
    texte d'un echo non plus, jusqu'au premier `&` ou `|` hors guillemets (« echo - DEL Sata controllers… »)."""
    k = kind(line)
    if k in ('label', 'rem'):
        return None
    bare, start = masked(line), 0
    if k == 'echo':
        m = re.search(r'[&|]', bare)
        if not m:
            return None
        start = m.start()
    m = ACTION.search(bare, start)
    return m.start(1) if m else None


def is_action(line):
    return first_action(line) is not None


def path_refs(line):
    """Variables de chemin écrites `!VAR!`, dans l'ordre, sans doublon (casse de la ligne)."""
    out, seen = [], set()
    for m in BANG.finditer(line):
        if m.group(1).upper() in PATH_VARS and m.group(1).upper() not in seen:
            seen.add(m.group(1).upper())
            out.append(m.group(1))
    return out


def percent_refs(line):
    return [m.group(1) for m in PERCENT.finditer(line) if m.group(1)]


def guarded(line, before=None):
    text = line if before is None else line[:before]
    return {m.group(1).upper() for m in GUARD.finditer(text)}


def depths(lines):
    out, d = [], 0
    for l in lines:
        out.append(d)
        d += sum(parens(l))
    return out


def folders(text, where):
    """Nettoyage par `set folder="…"` : chemin entre guillemets une fois, boucle seulement si le `cd` a réussi."""
    def sub(m):
        p, sep, ind = m.group('path'), m.group('sep'), m.group('ind')
        return sep.join([f'if exist "{p}" (', f'{ind}cd /d "{p}" && {m.group("loop")}', ')'])
    out, n = FOLDER.subn(sub, text)
    assert '%folder%' not in out.lower(), (where, 'set folder= non récrit')
    return out, n


def convert(lines, where):
    ds = depths(lines)
    for l, d in zip(lines, ds):
        for m in re.finditer(r'(?i)\bset\s+"?([A-Za-z_][\w()#$.-]*)=', l):
            name = m.group(1).upper()
            if name in PATH_VARS:
                assert name in SCRIPT_VARS, (where, 'variable de Windows changée par le script', l)
                assert d == 0, (where, 'variable de chemin posée dans un bloc', l)
                assert name not in {x.upper() for x in percent_refs(l)}, (where, 'posée et lue sur la même ligne', l)
    out = []
    for l in lines:
        n = PERCENT.sub(lambda m: f'!{m.group(1)}!' if m.group(1) and m.group(1).upper() in PATH_VARS else m.group(0), l)
        if n != l:
            assert '!' not in l, (where, 'ligne qui a déjà un !', l)
            assert not re.search(r'(?i)(?:^|[\s&|(@])call\s', masked(l)), (where, 'ligne call relue deux fois', l)
            assert DDE_OFF.lower() not in l.lower(), (where, l)
        out.append(n)
    return out


def guards(lines, where):
    out, stack = [], []
    for i, l in enumerate(lines):
        above = stack[-1] if stack else frozenset()
        acts = any(is_action(x) for x in lines[i:block_end(lines, i) + 1]) if sum(parens(l)) > 0 else is_action(l)
        if acts:
            need = [n for n in path_refs(l) if n.upper() not in above and n.upper() not in guarded(l)]
            if need:
                assert not l.strip().startswith(')'), (where, l)
                ind = re.match(r'\s*', l).group(0)
                l = ind + ''.join(f'if defined {n} ' for n in need) + l[len(ind):]
        here = above | guarded(l)
        for p in parens(l):
            if p > 0:
                stack.append(here)
            else:
                stack.pop()
        out.append(l)
    return out


def encloses(body):
    """Le texte est un seul groupe `( … )` : sa première parenthèse se ferme sur le dernier caractère."""
    if not body.startswith('('):
        return False
    depth, quoted = 0, False
    for k, c in enumerate(body):
        if c == '"':
            quoted = not quoted
        elif not quoted and c in '()':
            depth += 1 if c == '(' else -1
            if depth == 0:
                return k == len(body) - 1
    return False


def wrap(line, where):
    """`for … do CORPS` → `for … do (setlocal DisableDelayedExpansion & CORPS & endlocal)`."""
    import probes
    m = FOR_HEAD.search(masked(line))
    assert m, (where, 'suppression sur une variable de boucle hors d\'un for', line)
    start = m.end() - 4
    a, b = probes.find_in_clause(line[start:])
    assert a is not None, (where, line)
    d = re.match(r'(?i)\s*do\s+', line[start + b + 1:])
    assert d, (where, line)
    cut = start + b + 1 + d.end()
    body = line[cut:].strip()
    assert '!' not in body, (where, 'un !…! ne serait plus développé', line)
    if not encloses(body) and re.search(r'&&|\|', masked(body)):
        body = f'({body})'
    return f'{line[:cut]}({DDE_OFF} & {body} & endlocal)'


def toggles(lines, where, on=True):
    out, i = [], 0
    while i < len(lines):
        l = lines[i]
        if on and sum(parens(l)) > 0 and IS_FOR.match(l):
            j = block_end(lines, i)
            inner = lines[i + 1:j]
            if any(is_action(x) and FOR_VAR.search(x) for x in inner):
                assert lines[j].strip() == ')', (where, lines[j])
                for x in inner:
                    assert '!' not in x, (where, 'un !…! ne serait plus développé', x)
                    assert not re.match(r'(?i)^\s*@?\s*(set|cd|chdir|pushd|popd|goto|exit|call)\b', x), (where, 'perdu au endlocal', x)
                ind = re.match(r'\s*', inner[0]).group(0) if inner else ''
                out += [l, ind + DDE_OFF, *toggles(inner, where, False), ind + 'endlocal', lines[j]]
                i = j + 1
                continue
        if on and is_action(l) and FOR_VAR.search(l):
            l = wrap(l, where)
        out.append(l)
        i += 1
    return out


def check(text):
    """Défauts des commandes qui suppriment ou prennent possession (ACTION), mêmes règles que le test Rust
    `deletions_never_use_a_percent_path` : chemin `%VAR%` (sur la ligne ou dans la ligne qui ouvre son bloc) ; `!VAR!`
    sans `if defined VAR` devant (sur la ligne ou sur une ligne qui ouvre son bloc) ; variable de boucle avec le
    développement retardé actif ; `!…!` là où il n'est plus développé ; variable hors guillemets."""
    errors = []
    stack = []  # par parenthèse ouverte : (variables %…%, variables !…!, gardes) de sa ligne et des blocs au-dessus
    dde = [True]  # PREAMBLE de runner.rs ; lignes setlocal / endlocal entières
    for n, l in enumerate(text.replace('\r\n', '\n').split('\n'), 1):
        t = l.strip()
        low = t.lstrip('@').strip().lower()
        if re.match(r'setlocal\b', low) and '&' not in low:
            dde.append(False if 'disabledelayedexpansion' in low else True if 'enabledelayedexpansion' in low else dde[-1])
        elif re.match(r'endlocal\b', low) and '&' not in low and len(dde) > 1:
            dde.pop()
        pct, refs, gd = stack[-1] if stack else (frozenset(), frozenset(), frozenset())
        line_pct = {x.upper() for x in percent_refs(l)}
        line_refs = {m.group(1).upper() for m in BANG.finditer(l)}
        pos = first_action(l)
        if pos is not None:
            if pct | line_pct:
                errors.append(f'{n}: suppression sur %{"%, %".join(sorted(pct | line_pct))}% : {t}')
            need = (refs | line_refs) - gd - guarded(l, pos)
            if need:
                errors.append(f'{n}: suppression sans if defined {", ".join(sorted(need))} : {t}')
            off = l.lower().find(DDE_OFF.lower())
            if FOR_VAR.search(l[pos:]) and dde[-1] and not 0 <= off < pos:
                errors.append(f'{n}: variable de boucle avec le développement retardé actif : {t}')
            if (not dde[-1] and '!' in l) or (off >= 0 and '!' in l[off:]):
                errors.append(f'{n}: !…! qui ne serait plus développé : {t}')
            bare = masked(l)
            if BANG.search(bare) or any(m.group(1) for m in PERCENT.finditer(bare)):
                errors.append(f'{n}: variable hors guillemets : {t}')
        here = (pct | line_pct, refs | line_refs, gd | guarded(l))
        for p in parens(l):
            if p > 0:
                stack.append(here)
            elif stack:
                stack.pop()
    return errors


def apply_text(text, where):
    sep = '\r\n' if '\r\n' in text else '\n'
    text, folded = folders(text, where)
    lines = text.split(sep)
    lines = toggles(guards(convert(lines, where), where), where)
    out = sep.join(lines)
    errors = check(out)
    assert not errors, (where, errors)
    return out, folded


def apply(tree, where=''):
    """Chaque texte d'un dictionnaire de scripts ({réglage: {variante: texte}}, ou annulations {…: {full, rest}})."""
    folded = 0
    for k, v in tree.items():
        if isinstance(v, str):
            tree[k], f = apply_text(v, f'{where}{k}')
            folded += f
        elif isinstance(v, dict):
            folded += apply(v, f'{where}{k}:')
    return folded
