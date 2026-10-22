"""Optimisations envoyées par Sofiene le 2026-10-21 (1.2.0), vérifiées une à une contre le catalogue avant d'entrer.

Sources : le dump Hone.gg (« Basic » et « General & Advanced », On/Off .bat et journaux des écritures du registre),
OptiCore-Tweaks.ps1, Hone-Optimizations.ps1, network_optimizer.bat et [RAGO APP] GAME V1.bat. Consigne : ne pas
ajouter ce qu'on a déjà, remplacer ce qui est moins bien, ajouter le reste après vérification.

- NEW_TWEAKS : réglages ajoutés (même forme que NEW_TWEAKS de build_catalog_v6.py), registre ou commandes que
  tools/undo et tools/probes savent relever et défaire ;
- NEW_SECTIONS : sections créées pour eux (module, id, nom, section après laquelle la placer) ;
- FIXES / DROP : réglages existants remplacés par la meilleure version, appliqués après l'audit (comme add_games) pour
  que l'annulation couvre l'avant et l'après ;
- WARNINGS : ce que le joueur lit avant de lancer (« Read this first »), comme WARNINGS de build_catalog_v6.py ;
- NOTES : section de docs/CORRECTIONS.md, avec ce qui a été écarté et pourquoi.

Le texte affiché (à quoi ça sert, gain, inconvénients) est dans tools/descriptions.json, comme pour les autres.
"""


def I(en, fr=None):
    return {'en': en, 'fr': fr or en}


def tweak(id, en, fr, desc_en, desc_fr, risk='safe', reboot=True):
    return dict(id=id, name=I(en, fr), desc=I(desc_en, desc_fr), risk=risk, reboot=reboot, kind='tweak', requires=[], legacy=[])


def body(*lines):
    return '\n'.join(lines)


NEW_SECTIONS = [
    ('windows', 'comfort', I('Interface and comfort', 'Interface et confort'), 'system'),
]

CU = r'HKCU\Software\Microsoft\Windows\CurrentVersion'
NLA_SZ = r'reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f >nul'
# stratégie QoS comme la crée l'éditeur de stratégie de groupe : tout en chaînes, DSCP 46, pas de limite de débit
QOS = [('Application Name', None), ('Version', '1.0'), ('Protocol', '*'), ('Local Port', '*'), ('Local IP', '*'),
       ('Local IP Prefix Length', '*'), ('Remote Port', '*'), ('Remote IP', '*'), ('Remote IP Prefix Length', '*'),
       ('DSCP Value', '46'), ('Throttle Rate', '-1')]


def qos(exe):
    key = r'HKLM\SOFTWARE\Policies\Microsoft\Windows\QoS' + '\\' + exe
    return [f'reg add "{key}" /v "{k}" /t REG_SZ /d "{v or exe}" /f >nul' for k, v in QOS]


# jeux en ligne que pri_game ne propose pas (Hone, « Optimize DSCP ») ; jeux solo, émulateurs et noms d'exe génériques
# (game.exe, client.exe) écartés
DSCP_GAMES = ['dota2.exe', 'cod.exe', 'destiny2.exe', 'HaloInfinite.exe', 'RustClient.exe', 'Warframe.x64.exe', 'aces.exe',
              'WorldOfTanks.exe', 'DeadByDaylight-Win64-Shipping.exe', 'Brawlhalla.exe', 'bfv.exe', 'Titanfall2.exe']

NEW_TWEAKS = [
    # ------------------------------------------------------------------ Hone.gg, Basic
    ('windows', 'comfort', tweak(
        'win_taskbar', 'Clean up the taskbar', 'Alléger la barre des tâches',
        'Hides the Task View, search, Chat and Meet Now buttons from the taskbar.',
        'Retire les boutons Vue des tâches, Rechercher, Conversation et Meet Now de la barre des tâches.'), body(
        'echo - Cleaning up the taskbar',
        rf'reg add "{CU}\Explorer\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\Explorer\Advanced" /v "TaskbarMn" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\Policies\Explorer" /v "HideSCAMeetNow" /t REG_DWORD /d "1" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_recent', 'Hide recent items', 'Masquer les éléments récents',
        'Start stops listing recently added and most used apps, and File Explorer stops showing your recent files and '
        'frequent folders.',
        'Démarrer n\'affiche plus les applis récemment ajoutées ni les plus utilisées, et l\'Explorateur ne montre plus tes '
        'fichiers récents ni tes dossiers fréquents.'), body(
        'echo - Hiding recent and most used items',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v "HideRecentlyAddedApps" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v "ShowOrHideMostUsedApps" /t REG_DWORD /d "2" /f >nul',
        rf'reg add "{CU}\Explorer" /v "ShowRecent" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\Explorer" /v "ShowFrequent" /t REG_DWORD /d "0" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_highlights', 'Turn off search highlights', 'Désactiver les suggestions de la recherche',
        'Removes the Bing pictures and trending topics shown in the Windows search box and search panel.',
        'Retire les images Bing et les sujets tendance affichés dans la barre et le panneau de recherche de Windows.'), body(
        'echo - Turning off search highlights',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" /v "EnableDynamicContentInWSB" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\SearchSettings" /v "IsDynamicSearchBoxEnabled" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\Feeds\DSB" /v "ShowDynamicContent" /t REG_DWORD /d "0" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_lockscreen', 'Skip the lock screen', 'Passer l\'écran de verrouillage',
        'Goes straight to the sign-in screen, without the picture screen or the blur behind it; your password is still asked.',
        'Tu arrives directement sur l\'écran de connexion, sans l\'image d\'accueil ni le flou derrière ; le mot de passe '
        'reste demandé.', reboot=False), body(
        'echo - Skipping the lock screen',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Personalization" /v "NoLockScreen" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "DisableAcrylicBackgroundOnLogon" /t REG_DWORD /d "1" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_classicmenu', 'Classic right-click menu', 'Ancien menu du clic droit',
        'On Windows 11, right-click opens the full menu right away, without going through "Show more options".',
        'Sur Windows 11, le clic droit ouvre tout de suite le menu complet, sans passer par « Afficher plus d\'options ».'), body(
        'echo - Bringing back the classic right-click menu',
        r'reg add "HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" /ve /t REG_SZ /d "" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_alttab', 'Classic Alt+Tab', 'Alt+Tab classique',
        'Alt+Tab shows the old, simple list of icons, without window previews.',
        'Alt+Tab affiche l\'ancienne liste d\'icônes, sans aperçu des fenêtres.'), body(
        'echo - Switching to the classic Alt+Tab',
        rf'reg add "{CU}\Explorer" /v "AltTabSettings" /t REG_DWORD /d "1" /f >nul',
    )),
    # seul, hors du pack in_advanced (qui reçoit la même ligne, FIXES)
    ('windows', 'comfort', tweak(
        'win_shortcut', 'Remove "- Shortcut" from new shortcuts', 'Retirer « - Raccourci » des nouveaux raccourcis',
        'New shortcuts keep the plain name of the file, without "- Shortcut" added at the end.',
        'Les nouveaux raccourcis gardent le nom du fichier, sans « - Raccourci » ajouté à la fin.', reboot=False), body(
        'echo - Removing the Shortcut suffix',
        rf'reg add "{CU}\Explorer\NamingTemplates" /v "ShortcutNameTemplate" /t REG_SZ /d "\"%%s.lnk\"" /f >nul',
    )),
    ('windows', 'debloat', tweak(
        'dbl_onedrive_off', 'Turn off OneDrive', 'Désactiver OneDrive',
        'OneDrive stops starting and syncing in the background. Nothing is deleted.',
        'OneDrive ne se lance plus et ne synchronise plus en arrière-plan. Rien n\'est supprimé.', risk='advanced'), body(
        'echo - Turning off OneDrive',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\OneDrive" /v "DisableFileSyncNGSC" /t REG_DWORD /d "1" /f >nul',
    )),
    ('windows', 'clean', tweak(
        'win_browserbg', 'No browsers in the background', 'Pas de navigateur en arrière-plan',
        'Edge, Chrome and Brave fully close when you close their window, and Edge stops preloading when Windows starts.',
        'Edge, Chrome et Brave se ferment vraiment quand tu fermes leur fenêtre, et Edge ne se précharge plus au démarrage '
        'de Windows.', reboot=False), body(
        'echo - Stopping browsers from running in the background',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "StartupBoostEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "BackgroundModeEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "BackgroundModeEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "BackgroundModeEnabled" /t REG_DWORD /d "0" /f >nul',
    )),
    # ------------------------------------------------------------------ Hone.gg, General & Advanced
    ('windows', 'comfort', tweak(
        'win_suggestions', 'Turn off Start and Settings suggestions', 'Couper les suggestions de Démarrer et des Paramètres',
        'Removes the recommended tips in Start, the "finish setting up your device" reminders, online tips in Settings and '
        'cloud results in search.',
        'Retire les conseils recommandés dans Démarrer, les rappels « terminer la configuration », les astuces en ligne des '
        'Paramètres et les résultats du cloud dans la recherche.'), body(
        'echo - Turning off Start and Settings suggestions',
        rf'reg add "{CU}\Explorer\Advanced" /v "Start_IrisRecommendations" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\UserProfileEngagement" /v "ScoobeSystemSettingEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "AllowOnlineTips" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\SearchSettings" /v "IsMSACloudSearchEnabled" /t REG_DWORD /d "0" /f >nul',
        rf'reg add "{CU}\SearchSettings" /v "IsAADCloudSearchEnabled" /t REG_DWORD /d "0" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_extensions', 'Show file extensions', 'Afficher les extensions de fichiers',
        'Shows extensions like .exe or .zip in File Explorer, so you can spot fake files at a glance.',
        'Affiche les extensions comme .exe ou .zip dans l\'Explorateur, pour repérer d\'un coup d\'œil les faux fichiers.',
        reboot=False), body(
        'echo - Showing file extensions',
        rf'reg add "{CU}\Explorer\Advanced" /v "HideFileExt" /t REG_DWORD /d "0" /f >nul',
    )),
    ('windows', 'comfort', tweak(
        'win_compact', 'Compact File Explorer', 'Explorateur compact',
        'Tightens the spacing between items in File Explorer, so more files fit on screen.',
        'Réduit l\'espace entre les éléments de l\'Explorateur, pour afficher plus de fichiers à l\'écran.', reboot=False), body(
        'echo - Turning on the compact File Explorer view',
        rf'reg add "{CU}\Explorer\Advanced" /v "UseCompactMode" /t REG_DWORD /d "1" /f >nul',
    )),
    # seul, hors du pack in_advanced (qui écrivait 256, hors de la plage 60-100 que Windows accepte : FIXES)
    ('windows', 'comfort', tweak(
        'win_wallpaper', 'Full-quality wallpaper', 'Fond d\'écran en pleine qualité',
        'Stops Windows from compressing your JPEG wallpaper, so it stays sharp.',
        'Windows ne compresse plus ton fond d\'écran JPEG, qui reste net.', reboot=False), body(
        'echo - Keeping the wallpaper at full quality',
        r'reg add "HKCU\Control Panel\Desktop" /v "JPEGImportQuality" /t REG_DWORD /d "100" /f >nul',
    )),
    # Edge, Chrome et Firefox : stratégies documentées par chaque éditeur ; Edge n'est pas supprimé (dbl_edge retiré en 1.1.8)
    ('windows', 'debloat', tweak(
        'dbl_browsers', 'Disable browser telemetry', 'Désactiver la télémétrie des navigateurs',
        'Edge, Chrome and Firefox stop sending usage data and feedback; Edge also hides its sidebar and recommendations.',
        'Edge, Chrome et Firefox n\'envoient plus leurs données d\'utilisation ni d\'avis ; Edge masque aussi sa barre latérale '
        'et ses recommandations.', reboot=False), body(
        'echo - Turning off browser telemetry',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "DiagnosticData" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "PersonalizationReportingEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "UserFeedbackAllowed" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "SpotlightExperiencesAndRecommendationsEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "HubsSidebarEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "WebWidgetAllowed" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "ConfigureDoNotTrack" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "MetricsReportingEnabled" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "UserFeedbackAllowed" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Mozilla\Firefox" /v "DisableTelemetry" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Mozilla\Firefox" /v "DisableDefaultBrowserAgent" /t REG_DWORD /d "1" /f >nul',
    )),
    ('windows', 'debloat', tweak(
        'dbl_vs', 'Disable Visual Studio telemetry', 'Désactiver la télémétrie de Visual Studio',
        'Stops Visual Studio from sending usage data and turns off its feedback prompts.',
        'Visual Studio n\'envoie plus de données d\'utilisation et ne demande plus ton avis.', reboot=False), body(
        'echo - Turning off Visual Studio telemetry',
        r'reg add "HKCU\Software\Microsoft\VisualStudio\Telemetry" /v "TurnOffSwitch" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\VisualStudio\SQM" /v "OptIn" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\VisualStudio\Feedback" /v "DisableFeedbackDialog" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\VisualStudio\Feedback" /v "DisableEmailInput" /t REG_DWORD /d "1" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\VisualStudio\Feedback" /v "DisableScreenshotCapture" /t REG_DWORD /d "1" /f >nul',
    )),
    ('network', 'manual', tweak(
        'net_dscp', 'Network priority for more online games', 'Priorité réseau d\'autres jeux en ligne',
        'Marks the traffic of 12 online games (Dota 2, Call of Duty, Destiny 2, Halo Infinite, Rust, Warframe, War Thunder, '
        'World of Tanks, Dead by Daylight, Brawlhalla, Battlefield V, Titanfall 2) as priority.',
        'Marque comme prioritaire le trafic de 12 jeux en ligne (Dota 2, Call of Duty, Destiny 2, Halo Infinite, Rust, '
        'Warframe, War Thunder, World of Tanks, Dead by Daylight, Brawlhalla, Battlefield V, Titanfall 2).'), body(
        'echo - Marking the traffic of online games as priority (DSCP 46)', NLA_SZ,
        *[l for exe in DSCP_GAMES for l in qos(exe)],
    )),
    # ------------------------------------------------------------------ OptiCore, Hone-Optimizations.ps1, network_optimizer
    ('windows', 'comfort', tweak(
        'win_thispc', 'Open File Explorer on This PC', 'Ouvrir l\'Explorateur sur Ce PC',
        'File Explorer opens on This PC, with your drives, instead of the Home page.',
        'L\'Explorateur s\'ouvre sur Ce PC, avec tes disques, au lieu de la page Accueil.', reboot=False), body(
        'echo - Opening File Explorer on This PC',
        rf'reg add "{CU}\Explorer\Advanced" /v "LaunchTo" /t REG_DWORD /d "1" /f >nul',
    )),
    # DNS de la carte connectée (IPv4) ; l'annulation remet ceux du réseau (DHCP)
    ('network', 'manual', tweak(
        'net_dns', 'Use Cloudflare and Google DNS', 'Utiliser les DNS Cloudflare et Google',
        'Your connected network cards look up addresses with Cloudflare (1.1.1.1) and Google (8.8.8.8) instead of your '
        'internet provider.',
        'Tes cartes réseau connectées cherchent les adresses avec Cloudflare (1.1.1.1) et Google (8.8.8.8) au lieu de ton '
        'fournisseur d\'accès.'), body(
        'echo - Setting Cloudflare and Google DNS on the connected network cards',
        'for /f %%g in (\'powershell -NoProfile -Command "(Get-NetAdapter -Physical).Where({$_.Status -eq \'Up\'}).InterfaceGuid"\') '
        r'do reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\%%g" /v "NameServer" /t REG_SZ /d "1.1.1.1,8.8.8.8" /f >nul',
        'ipconfig /flushdns >nul',
    )),
    # ------------------------------------------------------------------ envoyé le 2026-10-22 (pack latence, optionnel)
    # stratégies officielles (les mêmes que gpedit) ; l'annulation les retire, comme « 2 - Annuler » de Sofiene
    ('windows', 'system', tweak(
        'win_bgdownloads', 'Stop map and speech downloads', 'Couper les téléchargements de cartes et de voix',
        'Windows stops downloading offline map updates and new speech recognition models in the background.',
        'Windows ne télécharge plus en arrière-plan les mises à jour des cartes hors connexion ni les nouveaux modèles '
        'de reconnaissance vocale.', reboot=False), body(
        'echo - Stopping background map and speech downloads',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Maps" /v "AutoDownloadAndUpdateMapData" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Maps" /v "AllowUntriggeredNetworkTrafficOnSettingsPage" /t REG_DWORD /d "0" /f >nul',
        r'reg add "HKLM\SOFTWARE\Policies\Microsoft\Speech" /v "AllowSpeechModelUpdate" /t REG_DWORD /d "0" /f >nul',
    )),
    # mot-clé standard des pilotes (*InterruptModeration), pas le nom affiché en anglais de network_optimizer
    ('network', 'manual', tweak(
        'net_intmod', 'Disable interrupt moderation', 'Couper la modération des interruptions',
        'Your network card hands each packet to Windows right away instead of grouping them.',
        'Ta carte réseau transmet chaque paquet à Windows tout de suite au lieu de les grouper.'), body(
        'echo - Turning off interrupt moderation on the network cards',
        'for /f %%n in (\'Reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4D36E972-E325-11CE-BFC1-08002bE10318}" /v "*InterruptModeration" /s ^| findstr "HKEY"\') do (',
        r'    Reg.exe add "%%n" /v "*InterruptModeration" /t REG_SZ /d "0" /f >nul',
        ')',
    )),
]

NLA = (r'Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_DWORD /d "1" /f > NUL 2>&1',
       r'Reg Add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f > NUL 2>&1')

# réglages existants remplacés par la meilleure version : {id ou « id:variante » : [(avant, après)]}, après l'audit
# Mode jeu : reprend du registre les animations de Windows (UserPreferencesMask, MinAnimate) et les donne à
# SystemParametersInfo, que Windows ne relit qu'à la connexion. Bit n du masque = SPI_SET 0x1001 + 2n (animation des menus,
# des listes, défilement doux, fondus, info-bulles, ombres) ; SPIF_SENDCHANGE seul, le registre est déjà écrit. Lancé aussi
# par l'annulation, après la remise de la sauvegarde (tools/undo : « both »). Ni « " » (fin de l'argument de cmd), ni
# « % », ni « ! » (variables de cmd) : les guillemets du C# viennent de [char]34
GAME_FX = ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=[char]34; '
           "Add-Type -Namespace Rago -Name Spi -MemberDefinition ('[DllImport(' + $q + 'user32.dll' + $q + ')] "
           "public static extern bool SystemParametersInfo(uint a, uint b, System.IntPtr c, uint d);'); "
           "$m=(Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -ErrorAction SilentlyContinue).UserPreferencesMask; "
           "if ($m -and $m.Length -ge 3) { foreach ($n in 1,2,3,9,10,11,12,13,18) { $on=($m[$n -shr 3] -shr ($n -band 7)) -band 1; "
           "[void][Rago.Spi]::SystemParametersInfo(0x1001 + 2 * $n, 0, [IntPtr]$on, 2) } }; "
           "$w=(Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -ErrorAction SilentlyContinue).MinAnimate; "
           "$p=[Runtime.InteropServices.Marshal]::AllocHGlobal(8); [Runtime.InteropServices.Marshal]::WriteInt32($p, 0, 8); "
           "[Runtime.InteropServices.Marshal]::WriteInt32($p, 4, [int]([string]$w -ne '0')); "
           "[void][Rago.Spi]::SystemParametersInfo(0x49, 8, $p, 2); [Runtime.InteropServices.Marshal]::FreeHGlobal($p)\" >nul 2>&1")

FIXES = {
    # « Effets visuels » n'écrivait que les DefaultApplied de VisualEffects\<effet>, des valeurs que Windows note pour
    # lui-même et ne relit pas (Hone, « Set visual effects for performance ») : les valeurs que Windows lit à la place
    'win_visual': [(
        r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v "VisualFXSetting" /t REG_DWORD /d "3" /f',
        '\r\n'.join([
            r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v "VisualFXSetting" /t REG_DWORD /d "3" /f',
            r'Reg.exe add "HKCU\Control Panel\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d "9012038010000000" /f',
            r'Reg.exe add "HKCU\Control Panel\Desktop" /v "DragFullWindows" /t REG_SZ /d "0" /f',
            r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "TaskbarAnimations" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "ListviewAlphaSelect" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\DWM" /v "EnableAeroPeek" /t REG_DWORD /d "0" /f',
        ]))],
    # l'astuce « link » de Windows XP pour « - Raccourci » ; le modèle de nom que l'Explorateur lit aujourd'hui (Hone)
    'in_advanced': [(
        r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer" /v "link" /t REG_BINARY /d "00000000" /f',
        r'Reg.exe add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\NamingTemplates" /v "ShortcutNameTemplate" /t REG_SZ /d "\"%%s.lnk\"" /f',
    )],
    # stratégies de confidentialité documentées par Microsoft (HKCU\Software\Policies) ; les anciennes valeurs restent,
    # des versions plus anciennes d'Office les lisent (Hone, « Office »)
    'dbl_office': [(
        r'Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM\preventedsolutiontypes" /v "templatefiles" /t REG_DWORD /d "1" /f',
        '\r\n'.join([
            r'Reg.exe add "HKCU\Software\Microsoft\Office\16.0\OSM\preventedsolutiontypes" /v "templatefiles" /t REG_DWORD /d "1" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\Common\ClientTelemetry" /v "SendTelemetry" /t REG_DWORD /d "3" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\Common\ClientTelemetry" /v "DisableTelemetry" /t REG_DWORD /d "1" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common" /v "QMEnable" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common" /v "UpdateReliabilityData" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common" /v "LinkedIn" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common\Feedback" /v "Enabled" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common\Feedback" /v "SurveyEnabled" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Policies\Microsoft\Office\16.0\Common\Feedback" /v "IncludeEmail" /t REG_DWORD /d "0" /f',
        ]))],
    # la qualité JPEG du fond d'écran va de 60 à 100 : 256 n'était pas pris
    'in_advanced:_': [(r'/v "JPEGImportQuality" /t REG_DWORD /d "256" /f', r'/v "JPEGImportQuality" /t REG_DWORD /d "100" /f')],
    # le délai des programmes au démarrage se règle sous HKCU (Hone, « General optimization ») ; la ligne HKLM reste
    'exp_startup': [(
        r'Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d "0" /f',
        '\r\n'.join([
            r'Reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d "0" /f',
            r'Reg.exe add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d "0" /f',
        ]))],
    # « Plein écran » écrasait toute la chaîne des réglages graphiques de Windows (Auto HDR, choix de l'utilisateur) :
    # les deux valeurs sont remplacées dans la chaîne existante, le reste est gardé (OptiCore, « jeux.windowed »)
    'win_fullscreen': [(
        r'reg add "HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ /d "VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;" /f',
        '\r\n'.join([
            'set "dx="',
            # lecture seule (probes : un for /f ne lance qu'un Get-) ; sans valeur, la sortie est vide et dx reste vide
            'for /f "delims=" %%v in (\'powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKCU:\\SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences\' -ErrorAction SilentlyContinue).DirectXUserGlobalSettings -split \';\' -match \'=\' -notmatch \'^(VRROptimizeEnable|SwapEffectUpgradeEnable)=\' -join \';\'"\') do set "dx=%%v;"',
            r'reg add "HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ /d "!dx!VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;" /f',
        ]))],
    # « Do not use NLA » est une chaîne (Microsoft, Cisco ; GAME V1) : même type que pri_game, qui l'écrit maintenant aussi
    'ping_main:config2': [NLA],
    'net_server:s4': [NLA],
    # Mode jeu, « rends-le le plus performant » (Sofiene, 2026-10-22) : pendant la partie, l'indexation de la recherche et
    # la télémétrie sont mises en pause (leur démarrage ne change pas : elles reviennent à la désactivation, sinon au
    # redémarrage), l'enregistrement en fond de la Xbox Game Bar est coupé (les captures à la demande restent) et le Mode
    # jeu de Windows est activé. Les animations sont reprises du registre tout de suite (GAME_FX) : écrites seules, elles
    # n'étaient lues qu'à la reconnexion suivante, la relance de l'Explorateur ne servant qu'à la barre des tâches
    'game_mode:on': [('net stop Spooler > nul', '\r\n'.join([
        'net stop Spooler > nul',
        'echo - Pausing search indexing and telemetry while you play',
        'net stop WSearch > nul 2>&1',
        'net stop DiagTrack > nul 2>&1',
        'echo - Windows Game Mode on, background recording off',
        r'reg add "HKCU\Software\Microsoft\GameBar" /v "AllowAutoGameMode" /t REG_DWORD /d "1" /f > nul',
        r'reg add "HKCU\Software\Microsoft\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d "1" /f > nul',
        r'reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v "HistoricalCaptureEnabled" /t REG_DWORD /d "0" /f > nul',
    ]))],
    'game_mode:off': [('net start Spooler >nul 2>&1', '\r\n'.join([
        'net start Spooler >nul 2>&1',
        'echo - Turning search indexing and telemetry back on',
        'net start WSearch >nul 2>&1',
        'net start DiagTrack >nul 2>&1',
    ]))],
    'game_mode': [('taskkill /f /im explorer.exe', '\r\n'.join([
        'echo - Applying the animation settings now',
        GAME_FX,
        'taskkill /f /im explorer.exe',
    ]))],
}

# réglages réécrits en entier : {id : script}
REPLACE = {
    # « Économies d'énergie AMD » écrivait dans Class\{4d36e968…}\0000, la première carte graphique de la liste, qui
    # n'est pas la carte AMD quand un processeur graphique Intel ou une carte NVIDIA passe avant (Hone,
    # « Optimize-RadeonControlPanel ») : chaque carte AMD, trouvée par son fournisseur
    'amd_power': body(
        'echo - Turning off power gating, clock gating, ASPM and ULPS on the AMD graphics cards',
        'for /f "delims=" %%k in (\'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}" /s /f "Advanced Micro Devices" /d ^| findstr /r /c:"\\\\[0-9][0-9][0-9][0-9]$"\') do (',
        *[f'    Reg.exe add "%%k" /v "{v}" /t {t} /d "{d}" /f' for v, t, d in [
            ('DisableSAMUPowerGating', 'REG_DWORD', '1'), ('DisableUVDPowerGatingDynamic', 'REG_DWORD', '1'),
            ('DisableVCEPowerGating', 'REG_DWORD', '1'), ('DisablePowerGating', 'REG_DWORD', '1'),
            ('DisableDrmdmaPowerGating', 'REG_DWORD', '1'), ('EnableVceSwClockGating', 'REG_DWORD', '1'),
            ('EnableUvdClockGating', 'REG_DWORD', '1'), ('EnableAspmL0s', 'REG_DWORD', '0'), ('EnableAspmL1', 'REG_DWORD', '0'),
            ('EnableUlps', 'REG_DWORD', '0'), ('EnableUlps_NA', 'REG_SZ', '0')]],
        ')',
    ),
}

# lignes ajoutées à la fin d'un réglage : {id : [lignes]}
APPEND = {
    # la stratégie que Windows 10 2004+ et 11 respectent pour retirer le web de la recherche (OptiCore, « priv.bing ») ;
    # BingSearchEnabled et les stratégies Windows Search restent pour les versions d'avant
    'win_search': [r'Reg.exe add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "DisableSearchBoxSuggestions" /t REG_DWORD /d "1" /f'],
    'exp_search': [r'Reg.exe add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "DisableSearchBoxSuggestions" /t REG_DWORD /d "1" /f'],
}

# lignes retirées des réglages remplacés : (ids, motif), comme DROP_LINES
DROP = [
    (('win_visual',), r'\\Explorer\\VisualEffects\\\w+"\s+/v\s+"DefaultApplied"|\\Explorer\\VisualEffects\\FontSmoothing"\s+/f\s*$'),
    # noms que Windows ne lit pas (DWMWA_TRANSITIONS_FORCEDISABLED est un attribut de fenêtre, pas une stratégie)
    (('win_visual',), r'/v\s+"(DWMWA_TRANSITIONS_FORCEDISABLED|MaxAnimate)"'),
]

# lignes réécrites : (ids, motif, remplacement), comme SUB_LINES
SUB = [
    # stratégie QoS de javaw.exe (port 25565) : DSCP en nombre et « Disabled » en limite de débit, que la stratégie de
    # groupe n'écrit jamais ainsi (Hone, « Optimize DSCP ») ; mêmes chaînes que pri_game
    (('ping_packets:qos', 'net_profile:qos'), r'(/v "DSCP Value" /t )REG_DWORD /d 46\b', r'\g<1>REG_SZ /d "46"'),
    (('ping_packets:qos', 'net_profile:qos'), r'(/v "Throttle Rate" /t REG_SZ /d )"Disabled"', r'\g<1>"-1"'),
    # tous les serveurs, pas seulement ceux du port 25565 (network_optimizer, « Smart Packets »), comme pri_game:minecraft
    # qui écrit la même stratégie javaw.exe
    (('ping_packets:qos', 'net_profile:qos'), r'(/v "Remote Port" /t REG_SZ /d )"25565"', r'\g<1>"*"'),
    # « HwSchedMode » n'existe pas : la planification GPU accélérée est HwSchMode (OptiCore, « jeux.hags »), comme in_advanced
    (('lat_directx',), r'/v "HwSchedMode"', r'/v "HwSchMode"'),
    # premier délai de renvoi TCP : 2000 ms doublait la valeur de Windows et de la RFC 6298 (network_optimizer)
    (('net_advanced',), r'(?i)\binitialRto=2000\b', r'initialRto=1000'),
]

WARNINGS = [
    (r'DisableFileSyncNGSC"?\s+/t\s+REG_DWORD\s+/d\s+"?1',
     'OneDrive stops syncing: files kept only online won\'t open until you undo it.',
     'OneDrive ne synchronise plus : les fichiers gardés seulement en ligne ne s\'ouvrent plus tant que tu n\'annules pas.'),
]

NOTES = '''

# Optimisations envoyées le 2026-10-21 (1.2.0)

`tools/optis_120.py`. Sources : dump Hone.gg (Basic, General & Advanced), OptiCore-Tweaks.ps1,
Hone-Optimizations.ps1, network_optimizer.bat, [RAGO APP] GAME V1.bat. Chaque optimisation a été comparée au catalogue
(valeurs écrites, pas les noms) : déjà là, meilleure qu'un réglage existant (remplacé), nouvelle (ajoutée) ou écartée.
Les clés des journaux Hone sont reprises des fichiers « Off » quand le journal « On » les range sous une mauvaise clé.

Ajoutés (Hone, Basic) : win_taskbar, win_recent, win_highlights, win_lockscreen, win_classicmenu, win_alttab,
win_shortcut (section « Interface et confort »), dbl_onedrive_off (stratégie Microsoft, rien n'est supprimé,
contrairement à dbl_onedrive retiré en 1.1.8), win_browserbg (Edge, Chrome et Brave fermés pour de vrai).

Ajouté le 2026-10-22 (« Pack latence », réglages optionnels) : win_bgdownloads, les stratégies Maps
(AutoDownloadAndUpdateMapData, AllowUntriggeredNetworkTrafficOnSettingsPage) et Speech (AllowSpeechModelUpdate) à 0 ;
l'annulation les retire, comme le fichier « 2 - Annuler » envoyé avec. Complète dbl_print, qui coupe le service
MapsBroker.

Remplacés :
- win_visual : les 18 lignes `VisualEffects\\<effet>\\DefaultApplied` (valeurs que Windows note, sans les relire) →
  UserPreferencesMask (masque « meilleures performances », comme game_mode), DragFullWindows, TaskbarAnimations,
  ListviewAlphaSelect, EnableAeroPeek ; `DWMWA_TRANSITIONS_FORCEDISABLED` et `MaxAnimate`, que Windows ne lit pas, retirés ;
- in_advanced : la valeur `link` de Windows XP → `NamingTemplates\\ShortcutNameTemplate`.

Écartés (Hone, Basic) : accélération matérielle des navigateurs (charge le processeur au lieu de la carte graphique),
mises à jour des navigateurs (déjà retirées en 1.1.8), option Verrouiller, Assistant de concentration (blobs datés qui
coupent aussi la règle « pendant un jeu »), Centre de mobilité, ancien volume, transparence de la barre des tâches,
menu « Prendre possession » et « priorité temps réel », icônes de la zone de notification : cosmétiques, sans effet sur
Windows 11, ou risqués. NoRecentDocsHistory laissé hors de win_recent : il vide les listes de raccourcis comme
Start_TrackDocs, que lit le vérificateur RBW.

Ajoutés (Hone, General & Advanced) : win_suggestions (recommandations de Démarrer, rappels « terminer la configuration »,
astuces en ligne des Paramètres, recherche dans le cloud), win_extensions, win_compact, win_wallpaper, dbl_browsers
(stratégies de télémétrie Edge, Chrome et Firefox ; aucun navigateur n'est supprimé), dbl_vs, net_dscp (même stratégie
QoS que pri_game pour douze jeux en ligne qu'il ne connaît pas).

Remplacés ou complétés (Hone, General & Advanced) :
- ping_packets:qos et net_profile:qos : « DSCP Value » écrit en REG_DWORD, « Throttle Rate » à `Disabled` et port
  distant 25565 seulement → tout en REG_SZ, `-1` et `*` (format des stratégies QoS de Windows) ;
- « Do not use NLA » : ajouté à pri_game (sans lui, le marquage DSCP ne s'applique pas hors domaine, donc sur un PC de
  joueur) et passé de REG_DWORD à REG_SZ dans ping_main et net_server ;
- dbl_office : stratégies Office documentées (`HKCU\\Software\\Policies\\Microsoft\\Office`) ajoutées, anciennes lignes gardées ;
- in_advanced : JPEGImportQuality 256 → 100 (Windows accepte 60 à 100) ;
- exp_startup : StartupDelayInMSec écrit aussi sous HKCU, l'endroit le plus cité.

Ajoutés (OptiCore, Hone-Optimizations.ps1, network_optimizer) : win_thispc, net_dns (DNS 1.1.1.1 et 8.8.8.8 sur les
cartes connectées ; ne baisse pas le ping en jeu, échoue sur les réseaux qui imposent leur DNS), net_intmod (modération
des interruptions coupée, comme Microsoft le conseille pour la latence ; contraire de hitreg_suite, qui l'active).

Remplacés (mêmes sources) :
- lat_directx : `HwSchedMode`, que Windows ne lit pas → `HwSchMode` ;
- win_fullscreen : DirectXUserGlobalSettings était écrasé, ce qui effaçait l'Auto HDR et les autres choix DirectX du
  joueur ; la valeur est maintenant fusionnée ;
- win_search et exp_search : DisableSearchBoxSuggestions ajouté, la stratégie documentée qui coupe vraiment le web dans la
  recherche sur Windows 10 2004+ et 11 (l'Explorateur ne liste plus les recherches récentes) ;
- amd_power : trouve chaque carte AMD au lieu d'écrire dans `\\0000`, faux quand une autre carte est listée en premier ;
- net_advanced : initialRto 2000 → 1000 ms (valeur Windows et RFC 6298 ; le commentaire disait 2 ms).

Jeux ([RAGO APP] GAME V1) : pri_game:minecraft, fortnite, valorant, cs2, apex et gta écrivaient 111 valeurs PerfOptions
par jeu, dont Windows ne lit que CpuPriorityClass et IoPriority (et un CpuPriorityClass=8, classe qui n'existe pas) :
reconstruits avec game_priority() comme les autres jeux. Nouvelle variante bedrock (Minecraft.Windows.exe) et préréglage
Minecraft Bedrock ; csgo.exe ajouté à cs2. Roblox est maintenant détecté (Roblox Player ou version Microsoft Store).

Écartés (mêmes sources) : tout ce qui baisse la sécurité ou casse un usage (Defender, SmartScreen, contrôle de compte,
virtualisation et intégrité mémoire, atténuations Spectre, contournement TPM, Windows Update, Xbox, VPN, SMB2, Wi-Fi,
mot de passe sans expiration, UCPD), les placebos et services déjà au repos (HomeGroup, Insider, démo en magasin,
quotas de disque, TdrDelay), ce qui demande un programme téléchargé ou détourne taskmgr ou regedit par IFEO, les
réglages propres au PC de test (affinités PCI, instance d'écran fixe), ce que le journal ne permet pas de vérifier
(netsh, bcdedit, powercfg sans trace), le plafond de débit fixe, la région forcée (94 = Allemagne), SysMain coupé
(contredit la décision PLACEBO ci-dessus : la compression mémoire en dépend), l'optimisation plein écran coupée par jeu
(clés AppCompat lues par le vérificateur RBW), et le cosmétique sans effet sur Windows 11.

Pas encore fait (code de l'appli, à tester sous Windows) : carte graphique performante et mode d'alimentation pendant
le jeu, vérifications avant de jouer, préréglages graphiques dans les fichiers des jeux.
'''
