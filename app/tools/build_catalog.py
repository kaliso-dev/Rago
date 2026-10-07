#!/usr/bin/env python3
"""Génère le catalogue de Rago Hub à partir du .bat legacy et de meta.py.

    python3 tools/build_catalog.py

Sorties :
  src/data/catalog.json          ce que l'interface affiche (sans les scripts)
  src-tauri/scripts/scripts.json les scripts batch, embarqués dans le binaire Rust
  docs/CORRECTIONS.md            la liste des corrections appliquées au .bat
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from extract_bat import LegacyBat, NPI_CALL  # noqa: E402
from meta import MODULES, PRESETS  # noqa: E402

BAT = os.path.join(ROOT, 'legacy', 'Premium v5.2 - Rago Hub.bat')
bat = LegacyBat(BAT)

TEMP_CLEAN = r'''echo - Cleaning C:\Windows\Temp
set folder="C:\Windows\Temp"
IF EXIST "%folder%" (
    cd /d %folder%
    for /F "delims=" %%i in ('dir /b') do (rmdir "%%i" /s/q 2>nul || del "%%i" /s/q 2>nul)
)
echo - Cleaning %TEMP%
set folder="%LOCALAPPDATA%\Temp"
IF EXIST "%folder%" (
    cd /d %folder%
    for /F "delims=" %%i in ('dir /b') do (rmdir "%%i" /s/q 2>nul || del "%%i" /s/q 2>nul)
)'''

# Corrections ciblées, en plus des corrections génériques de extract_bat.fix_line.
# (tweak id ou id:variante) -> liste de (avant, après) ; "après" = None supprime la ligne.
PATCHES = {
    # Restaurer les atténuations : le .bat remettait DisableExceptionChainValidation à 1 et
    # MoveImages à 0, c'est-à-dire qu'il laissait SEHOP et l'ASLR désactivés.
    'exp_mitigations:on': [
        ('/v "DisableExceptionChainValidation" /t REG_DWORD /d "1"', '/v "DisableExceptionChainValidation" /t REG_DWORD /d "0"'),
        ('Reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "MoveImages" /t REG_DWORD /d "0" /f',
         'Reg.exe delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "MoveImages" /f'),
    ],
}

# Scripts réécrits quand le .bat ne peut pas être repris tel quel.
def rbw_script(base):
    """Le .bat visait CDPUserSvc_5d3cf, un suffixe propre au PC de l'auteur."""
    lines = []
    for l in base.split('\n'):
        if 'CDPUserSvc_5d3cf' in l:
            cmd = 'config %%s start= auto' if 'start= auto' in l else (
                'config %%s start= demand' if 'start= demand' in l else 'start %%s')
            l = ('for /f "tokens=2" %%s in (\'sc query state^= all ^| findstr /r /c:"SERVICE_NAME: CDPUserSvc_"\') '
                 f'do sc {cmd}')
        lines.append(l)
    return '\n'.join(lines)


EDGE_FIX = r'''echo - Closing Edge
taskkill /f /im msedge.exe >nul 2>&1
echo - Uninstalling Edge
for /d %%d in ("%ProgramFiles(x86)%\Microsoft\Edge\Application\*") do (
    if exist "%%d\Installer\setup.exe" "%%d\Installer\setup.exe" --uninstall --system-level --verbose-logging --force-uninstall
)'''


def paren_delta(line):
    st = line.strip()
    if re.match(r'^(rem\s|::|echo[\s.])', st, re.I):
        return 0
    d, q = 0, False
    for i, ch in enumerate(st):
        if ch == '"':
            q = not q
        elif not q and (i == 0 or st[i - 1] != '^'):
            d += (ch == '(') - (ch == ')')
    return d


def tidy(script):
    """Retire les « ) » orphelines laissées par le découpage et le code mort après le premier
    exit /b de premier niveau (le moteur ajoute déjà son propre exit /b 0)."""
    jumps = re.search(r'\b(goto|call\s+:)', script, re.I)
    out, depth = [], 0
    for line in script.split('\n'):
        d = paren_delta(line)
        if depth + d < 0 and line.strip() == ')':
            continue
        if depth == 0 and not jumps and re.match(r'^\s*exit\s+/b\b', line, re.I):
            break
        depth += d
        out.append(line)
    return '\n'.join(out).rstrip()


# Lignes retirées pour la sécurité du joueur (audit du 2026-10-05, audit/avis-tweaks.md).
SAFETY_DROPS = [
    # WebView2 fait tourner Rago Hub lui-même ; Edge Update le tient à jour.
    (('dbl_edge',), r'Microsoft\\(EdgeWebView|EdgeUpdate|EdgeCore|Temp)"'),
    # Spectre/Meltdown coupés sans le dire, sous une étiquette Safe.
    (('mem_profile', 'mem_registry', 'hitreg_suite'), r'FeatureSettingsOverride'),
    # Prefetch vidé et BAM coupé ressemblent à des traces effacées lors d'un screenshare.
    (('game_mode',), r'\\Prefetch\\'),
    (('win_background', 'hitreg_suite'), r'Services\\bam"'),
]


def harden(script, tid):
    # USER_SID n'était défini nulle part dans le .bat : le moteur tourne sous le compte du joueur.
    script = script.replace('HKU\\!USER_SID!\\', 'HKCU\\')
    for ids, pattern in SAFETY_DROPS:
        if tid in ids:
            kept = [l for l in script.split('\n') if not re.search(pattern, l, re.I)]
            script = '\n'.join(kept)
    return script


def resolve_src(src, tid, vid=None):
    script = _resolve_src(src, tid, vid)
    return harden(tidy(script), tid) if script is not None else None


def _resolve_src(src, tid, vid=None):
    if src is None:
        return None
    if src == 'Performance@13768:temp':
        return TEMP_CLEAN
    name, line = src.split('@')
    line = int(line)
    if name in ('lwpc1', 'ltpc1', 'ggpc1', 'mdpc1'):
        # Hitreg : le .bat lance d'abord les réglages de la carte réseau (label BASE), puis demande
        # le type de PC. Les choix 3 et 4 du .bat renvoyaient vers les choix 1 et 2 (bug) : ils
        # sont branchés sur leurs vrais labels ici.
        pre = bat.collect_until_menu(bat.find('BASE', 13026))
        script, _ = bat.leaf(name, line)
        return pre + '\n' + script
    script, _ = bat.leaf(name, line)
    if name == 'd8':
        script = '\n'.join(l for l in script.split('\n')
                           if not re.match(r'^\s*(taskkill|cd |setup\.exe)', l, re.I))
        script = EDGE_FIX + '\n' + script
    if name in ('On', 'off'):
        script = rbw_script(script)
    if name == 'DISABLE8':
        # le mode jeu coupe le spouleur d'impression mais ne le relançait jamais
        script += '\necho - Turning printing back on\nsc config Spooler start= auto >nul\nnet start Spooler >nul 2>&1'
    if name == 'nv3':
        script = NPI_CALL
    key = f'{tid}:{vid}' if vid else tid
    for before, after in PATCHES.get(key, []):
        assert before in script, (key, before)
        script = script.replace(before, after) if after is not None else script.replace(before + '\n', '')
    return script


def requirements(script):
    req = set()
    low = script.lower()
    if 'wmic' in low:
        req.add('wmic')
    if 'smartctl' in low:
        req.add('res:smartctl.exe')
    if 'lowlatency.pow' in low:
        req.add('res:LowLatency.pow')
    if 'nvidiaprofileinspector' in low:
        req.add('res:nvidiaProfileInspector.exe')
    return req


def optifine_preset(name, line):
    i = bat.find(name, line)
    out = {}
    for k in range(i + 1, bat.block_end(i)):
        m = re.match(r'^\s*echo\s+([A-Za-z0-9_.]+):(\S*)\s*>>\s*optionsof\.txt', bat.L[k])
        if m:
            out[m.group(1)] = m.group(2)
    return out


scripts = {}
catalog_modules = []
all_ids = set()
for mod in MODULES:
    msecs = []
    for sec in mod['sections']:
        items = []
        for t in sec['tweaks']:
            if 'ref' in t:
                items.append({'ref': t['ref']})
                continue
            tid = t['id']
            assert tid not in all_ids, tid
            all_ids.add(tid)
            entry = {k: v for k, v in t.items() if k not in ('src',) and v is not None}
            req = set(t['requires'])
            src_lines = []
            if t['variants']:
                scripts[tid] = {}
                vs = []
                for v in t['variants']:
                    s = resolve_src(v['src'], tid, v['id'])
                    if s is not None:
                        scripts[tid][v['id']] = s
                        req |= requirements(s)
                    src_lines.append(v['src'])
                    vs.append({k: val for k, val in v.items() if k != 'src' and val is not None})
                entry['variants'] = vs
            else:
                s = resolve_src(t['src'], tid)
                if s is not None:
                    scripts[tid] = {'_': s}
                    req |= requirements(s)
                src_lines.append(t['src'])
            if tid == 'mc_optifine':
                entry['optifine'] = {
                    'performance': optifine_preset('Performance', 13768),
                    'quality': optifine_preset('Quality', 13875),
                }
            if t.get('native') == 'nvidia_profile':
                req.add('res:nvidiaProfileInspector.exe')
            entry['requires'] = sorted(req)
            entry['legacy'] = [s for s in src_lines if s]
            entry['lines'] = sum(len(x.split('\n')) for x in (scripts.get(tid) or {}).values())
            items.append(entry)
        msecs.append({k: v for k, v in sec.items() if k != 'tweaks'} | {'tweaks': items})
    catalog_modules.append({k: v for k, v in mod.items() if k != 'sections'} | {'sections': msecs})

# vérifie les références
for mod in catalog_modules:
    for sec in mod['sections']:
        for t in sec['tweaks']:
            if 'ref' in t:
                assert t['ref'] in all_ids, t['ref']
for p in PRESETS:
    for x in p['tweaks']:
        assert x.split(':')[0] in all_ids, x

catalog = {'version': 1, 'modules': catalog_modules, 'presets': PRESETS}
os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'src-tauri', 'scripts'), exist_ok=True)
with open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=1)
with open(os.path.join(ROOT, 'src-tauri', 'scripts', 'scripts.json'), 'w', encoding='utf-8') as f:
    json.dump(scripts, f, ensure_ascii=False, indent=1)

n_tweaks = len(all_ids)
n_scripts = sum(len(v) for v in scripts.values())
n_lines = sum(len(s.split('\n')) for v in scripts.values() for s in v.values())

# rapport des corrections
fixes = sorted(set(bat.fixes))
by_kind = {
    'disable': [f for f in fixes if 'Disabling' in f[1] or 'Enabling' in f[1]],
    'delete': [f for f in fixes if 'reg delete' in f[2] and 'reg delete' not in f[1].lower()],
    'loops': [f for f in fixes if '& (' in f[2] and '& (' not in f[1]],
    'paths': [f for f in fixes if 'RAGO_RES' in f[2]],
}
os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
with open(os.path.join(ROOT, 'docs', 'CORRECTIONS.md'), 'w', encoding='utf-8') as f:
    f.write(f'''# Corrections apportées au .bat Premium v5.2

Généré par `tools/build_catalog.py`. Rago Hub reprend les {n_scripts} scripts du .bat
({n_lines} lignes de commandes) pour {n_tweaks} réglages, en corrigeant ce qui ne marchait pas.

| Problème | Lignes corrigées |
|---|---|
| Rechercher/remplacer global « Disable » → « Disabling », « Enable » → « Enabling » : clés de registre, `schtasks /Disable`, `auditpol`, `Disable-MMAgent` cassés, donc sans effet | {len(by_kind['disable'])} |
| `reg add ... /v DevicePriority /f` sans valeur (écrit une chaîne vide au lieu de supprimer) | {len(by_kind['delete'])} |
| Boucles `for` dont le corps n'était pas rattaché (`do set "str=%%i" (`) : MSI GPU appliqué sur une clé `%i` inexistante | {len(by_kind['loops'])} |
| Chemins codés en dur sur le PC de l'auteur (profil NVIDIA, plan d'alimentation, smartctl) | {len(by_kind['paths'])} |

Corrections ciblées :
- Hitreg : les choix « PC modeste » et « PC portable » renvoyaient vers « PC puissant » et « PC moyen » (doublon des touches 1 et 2). Ils appliquent maintenant leur propre réglage.
- Restaurer les atténuations : SEHOP et l'ASLR restaient désactivés après le « revert ».
- Mode jeu : l'impression était coupée à l'activation et jamais relancée à la désactivation.
- `UserPreferencesMask` écrit avec des espaces (`90 00 00 00`), refusé par `reg`.
- RBW Mod : le service `CDPUserSvc_5d3cf` n'existe que sur le PC de l'auteur, remplacé par une recherche du bon nom.
- Désinstallation de Edge : chemin figé sur la version 125.0.2535.79, remplacé par une recherche de la version installée.
- Lignes collées depuis un assistant de chat (`:contentReference[oaicite:0]`) et lignes `reg add` tronquées retirées.
- Option NVIDIA « Profile Inspector » : affichait juste un message, elle importe maintenant le profil.

Retirés de l'app :
- « Windows Update Blocker » : le label existe mais ne contient aucune commande.
- « Additional Service Priorities » : écrit une variable `!mitigation_mask!` jamais définie dans `MitigationOptions` de lsass, svchost, winlogon...
- Les entrées « Apply All » : l'app permet de tout sélectionner dans une section, avec le détail de chaque réglage.

## Détail ligne par ligne

''')
    for ln, before, after in fixes:
        f.write(f'- L{ln}: `{before}`\n  → `{after}`\n')

print(f'{n_tweaks} réglages, {n_scripts} scripts, {n_lines} lignes, {len(fixes)} lignes corrigées')
