"""RBW Mod (réglage rbw_mode) : scripts « Activé » et « Désactivé » (RAG-69, 2026-10-13).

Ce que lit le vérificateur officiel de Ranked Bedwars (QuickPots, github.com/quickpots/RBW-SS, Services.ps1, relevé le
2026-10-13) : SysMain, PcaSvc, DPS, BAM, EventLog, WSearch, DusmSvc, BFE, AppInfo, DCOMLaunch, PlugPlay et chaque
CDPUserSvc_xxxx doivent tourner (Get-Service, « Running ») ; DisableCMD, EnableScriptBlockLogging, EnableActivityFeed,
EnablePrefetcher et Start_TrackDocs ne doivent pas valoir 0 ; la clé HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat
ne doit pas exister (sinon « PCA Logging: Disabled »).

« Activé » fait ce que fait Rago-RBW-Fix.ps1, le script validé par Sofiene sur son PC le 2026-10-13 (« le script marche
parfaitement »), dans le même ordre et avec les mêmes moyens :
  1. démarrage de chaque service avec Windows (sc config, puis Set-Service, puis la valeur Start du registre) ;
  2. services dont ils dépendent remis en manuel s'ils sont désactivés ;
  3. réglages lus par le vérificateur, journaux DiagLog et WdiContextLog et stratégie WDI dont DPS a besoin ;
  4. lancement de chaque service (Start-Service, puis sc start, puis net start) ;
  5. ce que voit le vérificateur, avec le code d'erreur et le message de Windows pour ce qui reste arrêté ;
  6. tâches planifiées et programmes de démarrage qui pourraient les recouper (lecture seule), puis le verdict.
Chaque étape est une ligne PowerShell (cmd refuse les lignes de plus de 8191 caractères, le script entier n'y tient pas) ;
ce que le script validé garde d'une étape à l'autre (heure de début, redémarrage nécessaire, nombre d'éléments en rouge)
passe par le fichier rbw-mod.state du dossier où l'app lance ses scripts. Différences voulues avec le script validé : pas
de fenêtre ni de question (l'app est déjà administrateur et affiche le journal), textes en anglais comme le reste du
journal de l'app, une ligne qui commence par « ! » s'affiche en rouge dans le journal.

« Désactivé » (demande de Sofiene, 2026-10-13) remet ces services et réglages comme Windows les règle et lance les
services que Windows lance de lui-même, sans rien arrêter (l'ancien arrêtait SysMain et DiagTrack).
"""

import re

# Ce que lit le vérificateur (Services.ps1)
CHECKER_SERVICES = ['SysMain', 'PcaSvc', 'DPS', 'BAM', 'EventLog', 'WSearch', 'DusmSvc', 'BFE', 'AppInfo', 'DCOMLaunch', 'PlugPlay']

# Services du script validé, dans son ordre : (nom, démarrage voulu par « Activé » (2 automatique, 3 manuel, 1 système
# pour les pilotes BAM et DAM), démarrage de Windows remis par « Désactivé » (sc config), lancé par « Désactivé »).
# CDPUserSvc est le modèle des services CDPUserSvc_xxxx (un par session, suffixe au hasard) : ses instances sont lues
# dans le registre au moment de lancer le script.
SERVICES = [
    ('SysMain', 2, 'auto', True), ('PcaSvc', 2, 'auto', True), ('DPS', 2, 'auto', True), ('EventLog', 2, 'auto', True),
    ('WSearch', 2, 'delayed-auto', True), ('DusmSvc', 2, 'auto', True), ('BFE', 2, 'auto', True),
    ('Appinfo', 2, 'demand', False), ('Schedule', 2, 'auto', True), ('DsmSvc', 2, 'demand', False),
    ('DiagTrack', 2, 'auto', True), ('DcomLaunch', 2, 'auto', False), ('PlugPlay', 3, 'demand', False),
    ('bam', 1, 'system', True), ('dam', 1, 'system', False), ('CDPUserSvc', 2, None, False),
]

SVC_KEY = r'HKLM:\SYSTEM\CurrentControlSet\Services' + '\\'
PREFETCH = r'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters'
STATE = 'rbw-mod.state'
CHECKER_PS = ', '.join(f"'{s}'" for s in CHECKER_SERVICES)


def ps(code):
    """Une ligne de cmd qui lance ce code PowerShell. Le code s'écrit une instruction par ligne, chacune finie par « ; »,
    « { » ou « } » : les lignes sont mises bout à bout. Pas de guillemet double (il fermerait la commande), ni de « % »
    (cmd le remplacerait), ni de « ! » (le moteur lance les scripts avec EnableDelayedExpansion, cmd le retirerait) ;
    « ! » s'écrit [char]33."""
    lines = [l.strip() for l in code.strip().split('\n') if l.strip() and not l.strip().startswith('#')]
    body = ' '.join(lines)
    # une instruction finie sans « ; » collerait à la suivante ; « } » ou « ) » seulement devant else ou « ) »
    for l, nxt in zip(lines, lines[1:] + ['']):
        assert l[-1] in ';{(,' or (l[-1] in '})' and re.match(r'(else|\))', nxt)), l
    assert '"' not in body and '%' not in body and '!' not in body, body[:80]
    line = 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "' + body + '"'
    assert len(line) < 8000, len(line)
    return line


# Début de chaque étape : erreurs muettes comme dans le script validé ($ErrorActionPreference = 'SilentlyContinue'),
# sortie en UTF-8 (messages de Windows en français), $w devant une ligne rouge
PRELUDE = f'''
$ErrorActionPreference = 'SilentlyContinue';
$WarningPreference = 'SilentlyContinue';
[Console]::OutputEncoding = [Text.Encoding]::UTF8;
$w = [string][char]33 + ' ';
$st = '{STATE}';
function Reg($path, $name) {{ (Get-ItemProperty -Path $path -Name $name).$name }};
'''

# $services du script validé, et les CDPUserSvc_xxxx lus dans le registre (noms jamais traduits, contrairement à la
# sortie de sc query sur un Windows en français)
SERVICE_LIST = (
    '$services = [ordered]@{ ' + '; '.join(f'{n} = {start}' for n, start, *_ in SERVICES) + ' };\n'
    f"Get-ChildItem -Path '{SVC_KEY[:-1]}' | Where-Object {{ $_.PSChildName -like 'CDPUserSvc_*' }} | "
    'ForEach-Object { $services[$_.PSChildName] = 2 };\n')

# Le fichier d'état est lu et écrit avec -LiteralPath : un « [ » dans le chemin du dossier (nom d'utilisateur) serait
# pris pour un motif avec -Path

# 1. Services : démarrage avec Windows (Set-Start du script validé)
STAGE_START_TYPE = PRELUDE + f'''
Set-Content -LiteralPath $st -Value ('since ' + (Get-Date).Ticks);
''' + SERVICE_LIST + f'''
function Set-Start($name, $start) {{
$key = '{SVC_KEY}' + $name;
if (-not (Test-Path $key)) {{
if ($name -eq 'WSearch') {{
$w + 'WSearch: Windows Search was removed from this Windows, putting it back';
Enable-WindowsOptionalFeature -Online -FeatureName 'SearchEngine-Client-Package' -All -NoRestart | Out-Null;
Add-Content -LiteralPath $st -Value 'restart';
}} elseif (@({CHECKER_PS}) -contains $name) {{
$w + $name + ': not on this Windows';
}} else {{
'- ' + $name + ': not on this Windows';
}};
return;
}};
$delayed = $name -eq 'WSearch';
$now = Reg $key 'Start';
if ($now -eq $start -and (-not $delayed -or (Reg $key 'DelayedAutostart') -eq 1)) {{ '- ' + $name + ': already fine'; return }};
$mode = @{{ 1 = 'system'; 2 = 'auto'; 3 = 'demand' }}[$start];
if ($delayed) {{ $mode = 'delayed-auto' }};
sc.exe config $name start= $mode | Out-Null;
if ((Reg $key 'Start') -ne $start -and $start -ne 1) {{
$type = @{{ 2 = 'Automatic'; 3 = 'Manual' }}[$start];
Set-Service -Name $name -StartupType $type;
}};
if ((Reg $key 'Start') -ne $start) {{ Set-ItemProperty -Path $key -Name 'Start' -Value $start -Type DWord }};
if ($delayed) {{ Set-ItemProperty -Path $key -Name 'DelayedAutostart' -Value 1 -Type DWord }};
$after = Reg $key 'Start';
if ($after -eq $start) {{
'- ' + $name + ': fixed (Start ' + $now + ' to ' + $start + ')';
if ($now -eq 4 -and $start -eq 1) {{ Add-Content -LiteralPath $st -Value 'restart' }};
}} else {{
$w + $name + ': Windows refuses the change (Start = ' + $after + ')';
}};
}};
foreach ($name in @($services.Keys)) {{ Set-Start $name $services[$name] }};
'''

# 2. Services dont ils ont besoin (Fix-Dependencies du script validé)
STAGE_DEPENDENCIES = PRELUDE + SERVICE_LIST + f'''
function Fix-Dependencies($name) {{
foreach ($d in (Get-Service -Name $name).ServicesDependedOn) {{
$key = '{SVC_KEY}' + $d.Name;
if ((Reg $key 'Start') -eq 4) {{
sc.exe config $d.Name start= demand | Out-Null;
if ((Reg $key 'Start') -eq 4) {{ Set-ItemProperty -Path $key -Name 'Start' -Value 3 -Type DWord }};
if ((Reg $key 'Start') -eq 4) {{ $w + $d.Name + ' (needed by ' + $name + '): disabled, Windows refuses to change it' }}
else {{ '- ' + $d.Name + ' (needed by ' + $name + '): was disabled, back to manual' }};
}};
}};
}};
foreach ($name in @($services.Keys)) {{ Fix-Dependencies $name }};
'- checked';
'''

# 3. Réglages lus par le vérificateur, et ce dont DPS a besoin
STAGE_SETTINGS = PRELUDE + rf'''
$sys = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System';
foreach ($v in 'EnableActivityFeed', 'PublishUserActivities') {{
if ($null -ne (Reg $sys $v)) {{ Remove-ItemProperty -Path $sys -Name $v; '- Activities Cache: policy ' + $v + ' removed' }};
}};
$ac = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat';
if (Test-Path $ac) {{
Remove-Item -Path $ac -Recurse -Force;
if (Test-Path $ac) {{ $w + 'PCA Logging: Windows refuses to remove the AppCompat key' }} else {{ '- PCA Logging: AppCompat policy key removed' }};
}};
$adv = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced';
if ((Reg $adv 'Start_TrackDocs') -ne 1) {{ Set-ItemProperty -Path $adv -Name 'Start_TrackDocs' -Value 1 -Type DWord; '- Jump Lists: back on' }};
$cmd = 'HKCU:\Software\Policies\Microsoft\Windows\System';
if ($null -ne (Reg $cmd 'DisableCMD')) {{ Remove-ItemProperty -Path $cmd -Name 'DisableCMD'; '- CMD: DisableCMD policy removed' }};
$sb = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging';
if ((Reg $sb 'EnableScriptBlockLogging') -eq 0) {{ Remove-ItemProperty -Path $sb -Name 'EnableScriptBlockLogging'; '- PowerShell Scriptblock Logging: policy removed' }};
$pf = '{PREFETCH}';
foreach ($v in 'EnablePrefetcher', 'EnableSuperfetch') {{
if ((Reg $pf $v) -ne 3) {{ Set-ItemProperty -Path $pf -Name $v -Value 3 -Type DWord; '- Prefetch: ' + $v + ' back to 3' }};
}};
foreach ($logger in 'DiagLog', 'WdiContextLog') {{
$key = 'HKLM:\SYSTEM\CurrentControlSet\Control\WMI\Autologger\' + $logger;
if ((Test-Path $key) -and (Reg $key 'Start') -ne 1) {{
Set-ItemProperty -Path $key -Name 'Start' -Value 1 -Type DWord;
'- DPS: ' + $logger + ' log back on (active after a restart)';
Add-Content -LiteralPath $st -Value 'restart';
}};
}};
$wdi = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WDI\{{9c5a40da-b965-4fc3-8781-88dd50a6299d}}';
if ($null -ne (Reg $wdi 'ScenarioExecutionEnabled')) {{ Remove-ItemProperty -Path $wdi -Name 'ScenarioExecutionEnabled'; '- DPS: WDI diagnostics policy removed' }};
'- checked';
'''

# 4. Lancement des services (Start-One du script validé) ; CDPUserSvc est le modèle des CDPUserSvc_xxxx (il ne se lance
# pas) et DAM ne sert que sur les PC en veille connectée
STAGE_LAUNCH = PRELUDE + SERVICE_LIST + '''
function Start-One($name) {
$s = Get-Service -Name $name;
if (-not $s -or $s.Status -eq 'Running') { return };
Start-Service -Name $name;
$s.Refresh();
if ($s.Status -ne 'Running') { sc.exe start $name | Out-Null };
for ($i = 0; $i -lt 40; $i++) {
$s.Refresh();
if ($s.Status -eq 'Running' -or ($s.Status -eq 'Stopped' -and $i -ge 6)) { break };
Start-Sleep -Milliseconds 500;
};
if ($s.Status -ne 'Running') { net.exe start $name 2>&1 | Out-Null; $s.Refresh() };
};
foreach ($name in @($services.Keys) | Where-Object { $_ -notin 'CDPUserSvc', 'dam' }) { Start-One $name };
'- done';
'''

# 5. Ce que voit le vérificateur : ses lectures, dans son ordre (Explain du script validé pour ce qui reste arrêté)
STAGE_REPORT = PRELUDE + rf'''
$state = @(Get-Content -LiteralPath $st);
$since = (Get-Date).AddMinutes(-30);
foreach ($l in $state) {{ if ($l -like 'since *') {{ $since = [datetime][long]$l.Substring(6) }} }};
function Explain($name) {{
$c = Get-CimInstance -ClassName Win32_Service -Filter ('Name=' + [char]39 + $name + [char]39);
if (-not $c) {{ $c = Get-CimInstance -ClassName Win32_SystemDriver -Filter ('Name=' + [char]39 + $name + [char]39) }};
if (-not $c) {{
$w + '    not on this Windows';
if ($name -eq 'WSearch') {{ Add-Content -LiteralPath $st -Value 'restart' }};
return;
}};
$code = if ($c.ExitCode -eq 1066) {{ $c.ServiceSpecificExitCode }} else {{ $c.ExitCode }};
$w + '    start type: ' + $c.StartMode + ', Windows error code: ' + $code;
$ev = Get-WinEvent -FilterHashtable @{{ LogName = 'System'; ProviderName = 'Service Control Manager'; StartTime = $since }} -MaxEvents 100 | Where-Object {{ $_.Message -like ('*' + $c.DisplayName + '*') }} | Select-Object -First 1;
if ($ev) {{ $w + '    Windows says: ' + ($ev.Message -replace '\s+', ' ') }};
if ($name -eq 'DPS' -or $code -eq 4201) {{ Add-Content -LiteralPath $st -Value 'restart' }};
}};
$red = 0;
$names = @({CHECKER_PS});
$names += @(Get-Service | Where-Object {{ $_.Name -match '^CDPUserSvc_.+' }} | ForEach-Object {{ $_.Name }});
foreach ($n in $names) {{
$s = Get-Service -Name $n;
if ($s -and $s.Status -eq 'Running') {{ '- ' + ('{{0,-30}} {{1}}' -f $n, 'Running') }}
else {{ $red++; $w + ('{{0,-30}} {{1}}' -f $n, 'Stopped'); Explain $n }};
}};
$settings = @(
@('CMD', 'HKCU:\Software\Policies\Microsoft\Windows\System', 'DisableCMD', 'Disabled', 'Available'),
@('PowerShell Scriptblock Logging', 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging', 'EnableScriptBlockLogging', 'Disabled', 'Enabled'),
@('Activities Cache', 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System', 'EnableActivityFeed', 'Disabled', 'Enabled'),
@('Prefetch', '{PREFETCH}', 'EnablePrefetcher', 'Disabled', 'Enabled'),
@('Jump Lists', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced', 'Start_TrackDocs', 'Disabled', 'Enabled')
);
foreach ($c in $settings) {{
$status = Get-ItemProperty -Path $c[1] -Name $c[2];
if ($status -and $status.($c[2]) -eq 0) {{ $red++; $w + $c[0] + ': ' + $c[3] }} else {{ '- ' + $c[0] + ': ' + $c[4] }};
}};
if (Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat') {{ $red++; $w + 'PCA Logging: Disabled' }} else {{ '- PCA Logging: Enabled' }};
Add-Content -LiteralPath $st -Value ('red ' + $red);
'''

# 6. Programmes qui pourraient les recouper au démarrage (rien n'est modifié), puis le verdict du script validé
STAGE_SCAN = PRELUDE + r'''
$pattern = '(?i)(sc(\.exe)?\s+(config|stop)|set-service|stop-service|net(\.exe)?\s+stop|reg(\.exe)?\s+(add|delete)|set-itemproperty).*(sysmain|pcasvc|\bdps\b|wsearch|dusmsvc|\bbfe\b|appinfo|eventlog|cdpusersvc|\bbam\b|enableactivityfeed|appcompat|start_trackdocs|enableprefetcher|diaglog|wdicontextlog)';
$files = '(?i)[a-z]:\\[^' + [char]34 + '<>|*?]+?\.(bat|cmd|ps1|vbs)';
$script:suspects = 0;
function Inspect($label, $command) {
$text = [string]$command;
foreach ($f in [regex]::Matches($text, $files)) {
if (Test-Path -LiteralPath $f.Value) { $text += [string][char]10 + (Get-Content -LiteralPath $f.Value -Raw) };
};
if ($text -match $pattern) { $w + $label; $w + '    ' + $command; $script:suspects++ };
};
Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } | ForEach-Object {
foreach ($a in $_.Actions) { Inspect ('Scheduled task ' + $_.TaskPath + $_.TaskName) ([string]$a.Execute + ' ' + $a.Arguments) };
};
foreach ($run in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run') {
$p = Get-ItemProperty -Path $run;
if ($p) { $p.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { Inspect ('Starts with Windows: ' + $_.Name) $_.Value } };
};
foreach ($dir in [Environment]::GetFolderPath('Startup'), [Environment]::GetFolderPath('CommonStartup')) {
Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Extension -match '^\.(bat|cmd|ps1|vbs)$' } | ForEach-Object { Inspect ('Startup folder: ' + $_.Name) $_.FullName };
};
if ($script:suspects -eq 0) { '- none' };
$state = @(Get-Content -LiteralPath $st);
$red = -1;
foreach ($l in $state) { if ($l -like 'red *') { $red = [int]$l.Substring(4) } };
if ($red -eq 0) { '- Everything is green for the RBW checker.' }
elseif ($state -contains 'restart') { $w + 'Restart your PC, then turn RBW Mod on again: what is still red starts with Windows.' }
else { $w + 'Something is still red: post a screenshot of this log on the Rago Discord.' };
if ($script:suspects -gt 0) { $w + 'A program above can turn these services off again at every startup: include that part too.' };
Remove-Item -LiteralPath $st;
'''

STAGES = [
    ('Services the RBW screenshare checker looks at: start with Windows', STAGE_START_TYPE),
    ('Services they need', STAGE_DEPENDENCIES),
    ('Settings the RBW screenshare checker reads, and the diagnostics DPS needs', STAGE_SETTINGS),
    ('Starting the services', STAGE_LAUNCH),
    ('What the RBW screenshare checker sees now', STAGE_REPORT),
    ('Programs that could turn them off again at startup (nothing is changed)', STAGE_SCAN),
]
ON = '\n'.join(line for title, code in STAGES for line in (f'echo - {title}', ps(code)))

# « Désactivé » : comme Windows les règle. Les clés absentes ne sont pas créées (pilote BAM ou DAM, journaux de
# diagnostic d'un Windows qui ne les a pas) ; rien n'est arrêté.
_SVC = 'HKLM\\SYSTEM\\CurrentControlSet\\Services'
_AUTOLOGGER = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\WMI\\Autologger'
_REG_PREFETCH = PREFETCH.replace('HKLM:', 'HKLM')


def _if_key(key, line):
    return f'reg query "{key}" >nul 2>&1 && {line}'


OFF = '\n'.join(
    ['echo - Services the RBW screenshare checker looks at: back to how Windows sets them (nothing is stopped)']
    + [f'sc config {n} start= {mode} >nul 2>&1' for n, _, mode, _ in SERVICES if mode]
    + [_if_key(f'{_SVC}\\CDPUserSvc', f'reg add "{_SVC}\\CDPUserSvc" /v "Start" /t REG_DWORD /d "2" /f >nul'),
       'echo - Settings the RBW screenshare checker reads, and the diagnostics DPS needs: back to how Windows sets them',
       r'reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /f >nul 2>&1',
       r'reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "PublishUserActivities" /f >nul 2>&1',
       r'reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat" /f >nul 2>&1',
       r'reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "Start_TrackDocs" /t REG_DWORD /d "1" /f >nul',
       r'reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1',
       r'reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" /v "EnableScriptBlockLogging" 2>nul | find "0x0" >nul && reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" /v "EnableScriptBlockLogging" /f >nul',
       f'reg add "{_REG_PREFETCH}" /v "EnablePrefetcher" /t REG_DWORD /d "3" /f >nul',
       f'reg add "{_REG_PREFETCH}" /v "EnableSuperfetch" /t REG_DWORD /d "3" /f >nul']
    + [_if_key(f'{_AUTOLOGGER}\\{log}', f'reg add "{_AUTOLOGGER}\\{log}" /v "Start" /t REG_DWORD /d "1" /f >nul')
       for log in ('DiagLog', 'WdiContextLog')]
    + [r'reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WDI\{9c5a40da-b965-4fc3-8781-88dd50a6299d}" /v "ScenarioExecutionEnabled" /f >nul 2>&1',
       'echo - Starting the ones Windows starts by itself',
       'for %%s in (' + ' '.join(n for n, *_, launch in SERVICES if launch) + ') do sc start %%s >nul 2>&1',
       # chaque CDPUserSvc_xxxx en automatique comme son modèle, puis lancé ; noms lus dans le registre : la sortie de
       # sc query est traduite sur un Windows en français (NOM_SERVICE)
       f'''for /f "tokens=5 delims=\\" %%s in ('reg query "{_SVC}" /k /f "CDPUserSvc_" ^| find /i "CDPUserSvc_"') do '''
       f'''(reg add "{_SVC}\\%%s" /v "Start" /t REG_DWORD /d "2" /f >nul & sc start %%s >nul 2>&1)''']
)
assert '!' not in ON and '!' not in OFF
