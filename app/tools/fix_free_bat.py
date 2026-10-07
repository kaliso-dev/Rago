"""Version gratuite corrigée de l'ancien .bat (Rago Free), pour le téléchargement du site.

Reprend les corrections mécaniques de tools/extract_bat.py, sans toucher au contenu des réglages :
  1. « Disabling »/« Enabling » remis en « Disable »/« Enable » hors des lignes echo/commentaires ;
  2. `reg add ... /v DevicePriority|MessageNumberLimit /f` sans valeur → `reg delete` (ce qu'annoncent les messages) ;
  3. REG_BINARY avec espaces ; 4. USER_SID jamais défini → HKCU ;
  5. chemin du profil NVIDIA codé en dur sur le PC de l'auteur → dossier du .bat ;
  6. en-tête « Thanks for your Purchase » et « Premium Version » → Rago Free ;
  7. neutralise ce qui casse l'app ou la machine sans prévenir, sans retirer d'option du menu :
     - « Debloat All » et l'option Edge ne suppriment plus EdgeWebView, EdgeUpdate, EdgeCore
       (WebView2 fait tourner Rago Optimizer), comme SAFETY_DROPS de build_catalog.py ;
     - le vidage de C:\Windows\Prefetch est retiré (lu comme des traces effacées en screenshare) ;
     - la réinitialisation du pare-feu et la coupure de Spectre/Meltdown (FeatureSettingsOverride=3)
       ne s'appliquent que si l'utilisateur les accepte, à une question posée une fois au lancement.
Les octets d'origine (y compris l'en-tête FF FE) sont conservés.

    python3 tools/fix_free_bat.py [sortie]
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'legacy', 'Premium v5.2 - Rago Hub.bat')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'free', 'rago-free-v5.2.bat')
NIP = r'if exist "%~dp0extremelatencylow.nip" ( start "" /wait "%~dp0extremelatencylow.nip" ) else ( echo [skip] extremelatencylow.nip introuvable a cote du .bat )'

text = open(SRC, 'rb').read().decode('latin-1')
lines = text.split('\r\n')
counts = {k: 0 for k in ('disable', 'delete', 'binary', 'sid', 'path', 'header', 'edge', 'prefetch', 'firewall', 'spectre')}
EDGE = re.compile(r'^\s*rd\s+/s\s+/q\s+"C:\\Program Files \(x86\)\\Microsoft\\(EdgeWebView|EdgeUpdate|EdgeCore|Temp)"\s*$', re.I)
SPECTRE = re.compile(r'^\s*reg(?:\.exe)?\s+add\s.*Memory Management"?\s+/v\s+"?FeatureSettings(Override|OverrideMask)?"?\s+/t\s+REG_DWORD\s+/d\s+"?[13]"?', re.I)
for i, l in enumerate(lines):
    orig = l
    s = l.strip().lower()
    if not (s.startswith('echo') or s.startswith('::') or s.startswith('rem ') or s.startswith('set "$message')):
        if 'Disabling' in l or 'Enabling' in l:
            l = l.replace('Disabling', 'Disable').replace('Enabling', 'Enable')
            counts['disable'] += 1
        m = re.match(r'^(\s*)reg(?:\.exe)?\s+add\s+("[^"]+")\s+/v\s+"?(DevicePriority|MessageNumberLimit)"?\s+/f\s*$', l, re.I)
        if m:
            l = f'{m.group(1)}reg delete {m.group(2)} /v "{m.group(3)}" /f >nul 2>&1'
            counts['delete'] += 1
        if '/t REG_BINARY /d 90 00 00 00' in l:
            l = l.replace('/t REG_BINARY /d 90 00 00 00', '/t REG_BINARY /d 9012038010000000')
            counts['binary'] += 1
        if 'HKU\\!USER_SID!\\' in l:
            l = l.replace('HKU\\!USER_SID!\\', 'HKCU\\')
            counts['sid'] += 1
        if re.search(r'start\s+""\s+/wait\s+"C:\\Users\\Full\s+PC\s+Gamer\\', l, re.I):
            l = re.sub(r'start\s+""\s+/wait\s+"C:\\Users\\Full\s+PC\s+Gamer\\Desktop\\Premium Program V3\\extremelatencylow\.nip"\s*', NIP, l, flags=re.I)
            counts['path'] += 1
    if EDGE.match(l):
        l = 'echo [skip] Edge WebView2 kept: Rago Optimizer needs it.'
        counts['edge'] += 1
    elif re.match(r'^\s*del\s+/s\s+/f\s+/q\s+C:\\Windows\\Prefetch\\\*', l, re.I):
        l = 'rem Prefetch folder left untouched.'
        counts['prefetch'] += 1
    elif re.match(r'^\s*netsh\s+advfirewall\s+reset\b', l, re.I):
        l = 'if "%RAGO_FIREWALL%"=="1" ' + l.strip()
        counts['firewall'] += 1
    elif SPECTRE.match(l):
        l = 'if "%RAGO_SPECTRE%"=="1" ' + l.strip()
        counts['spectre'] += 1
    if 'Thanks for your Purchase !' in l:
        l = l.replace('Thanks for your Purchase !', 'Thanks for downloading Rago Free !')
        counts['header'] += 1
    if 'Premium Version V5' in l:
        l = l.replace('Premium Version V5', 'Rago Free V5.2')
        counts['header'] += 1
    lines[i] = l

ASK = [
    '',
    ':: Rago Free : two heavy changes run only if you accept them here.',
    'set "RAGO_FIREWALL=0"',
    'set "RAGO_SPECTRE=0"',
    'cls',
    'echo.',
    'echo   Some network optimizations can RESET the Windows Firewall (your custom rules are deleted).',
    'choice /c YN /n /m "  Allow the firewall reset? [Y/N] "',
    'if errorlevel 2 (set "RAGO_FIREWALL=0") else (set "RAGO_FIREWALL=1")',
    'echo.',
    'echo   Some CPU and memory optimizations turn OFF the Spectre and Meltdown protections.',
    'echo   Small FPS gain, lower security. Leave them on if you are not sure.',
    'choice /c YN /n /m "  Turn off Spectre and Meltdown protections? [Y/N] "',
    'if errorlevel 2 (set "RAGO_SPECTRE=0") else (set "RAGO_SPECTRE=1")',
    'cls',
    '',
]
at = lines.index(':: Warning')
lines[at:at] = ASK

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
open(OUT, 'wb').write('\r\n'.join(lines).encode('latin-1'))
print(OUT, counts)
