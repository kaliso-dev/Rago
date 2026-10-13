# Corrections de l'audit ligne par ligne du 2026-10-07 (rapport : /mnt/project-files/audit/audit-commandes-2026-10-07.md),
# copiées telles quelles depuis audit/outils-annulation/propositions.py. Appliquées par tools/build_catalog_v6.py
# (apply_audit) après ses propres corrections, dans l'ordre ci-dessous ; PLACEBO n'est pas appliqué (Sofiene garde
# ces 8 réglages, 2026-10-07), BUILD_PATCH est intégré au build.
#
# Deux petits ajouts au build sont nécessaires (code en bas de fichier, BUILD_PATCH) :
#   1. DROP_LINES accepte « id:variant » comme SUB_LINES (une ligne fautive n'est souvent que dans une variante,
#      et DROP_LINES exige aujourd'hui un retrait dans chaque variante) ;
#   2. DROP_BLOCKS retire un bloc de lignes, de la première ligne qui correspond à `debut` jusqu'à la première
#      ligne suivante qui correspond à `fin` (incluse), pour les boucles cassées qu'on ne peut pas viser ligne à ligne.
# Ordre d'application conseillé : SCRIPT_FIXES, DROP_BLOCKS, DROP_LINES, SUB_LINES (comme aujourd'hui).
# tools/audit_apply.py (dans audit/outils-annulation/) applique ce fichier à scripts.json avec les mêmes asserts.

# ---------------------------------------------------------------------------------------------------------------
# Corrections de texte exact (avant, après ou None) : même mécanique que SCRIPT_FIXES
SCRIPT_FIXES_PLUS = {
    # la 1re boucle *SpeedDuplex n'est jamais fermée : tout ce qui suit la ligne 42 ne s'exécute pas (erreur de syntaxe)
    'ping_main:config4': [('/v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f\r\nfor /f %%n in (',
                           '/v "WolShutdownLinkSpeed" /t REG_SZ /d "2" /f\r\n)\r\nfor /f %%n in ('),
                          ('"NetbiosOptions" /t REG_DWORD /d "2" /f\r\n)\r\nnetsh int tcp set global dca=enabled',
                           '"NetbiosOptions" /t REG_DWORD /d "2" /f\r\nnetsh int tcp set global dca=enabled')],
    # seuil svchost : wmic + !SVCHOST! sans expansion retardée, la valeur écrite était le texte « !SVCHOST! » (échec)
    'mem_svchost': [(
        'for /f "skip=1" %%i in (\'wmic os get TotalVisibleMemorySize\') do if not defined TOTAL_MEMORY set "TOTAL_MEMORY=%%i" & set /a SVCHOST=%%i+1024000\r\n'
        'Reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "SvcHostSplitThresholdInKB" /t REG_DWORD /d "!SVCHOST!" /f',
        'for /f %%m in (\'powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize + 1024000"\') do '
        'Reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "SvcHostSplitThresholdInKB" /t REG_DWORD /d "%%m" /f')],
    # parenthèses fermantes orphelines (sans effet, mais trompent la lecture et les outils)
    'ping_advanced': [('"NetbiosOptions" /t REG_DWORD /d "2" /f\r\n)\r\nnetsh int tcp set global dca=enabled',
                       '"NetbiosOptions" /t REG_DWORD /d "2" /f\r\nnetsh int tcp set global dca=enabled')],
    'gpu_nvidia': [('"KMD_EnableComputePreemption" /t REG_DWORD /d "0" /f\r\n)\r\n', '"KMD_EnableComputePreemption" /t REG_DWORD /d "0" /f\r\n')],
    'gpu_amd': [('/d "0100000001000000" /f\r\n)\r\n', '/d "0100000001000000" /f\r\n')],
    # OneDrive : sous Windows 11, le Bureau, les Documents et les Images sont souvent DANS %USERPROFILE%\OneDrive
    # (sauvegarde des dossiers). Supprimer ce dossier efface leur contenu local et laisse Windows pointer vers des
    # dossiers disparus (Bureau vide, « emplacement non disponible »). La suppression annoncée reste, sauf dans ce cas
    # « Réparer les fichiers système » ne lançait que DISM, qui répare le magasin de composants (la source des
    # réparations) mais pas les fichiers en service : sfc /scannow les remplace ensuite depuis ce magasin (ordre
    # conseillé par Microsoft, RAG-60). sfc écrit en UTF-16 quand sa sortie est redirigée : PowerShell la relit en
    # Unicode, retire les lignes de progression (« 45 % ») et la réécrit dans l'encodage du script
    'cln_repair': [('DISM /Online /Cleanup-Image /RestoreHealth',
                    'DISM /Online /Cleanup-Image /RestoreHealth\r\n'
                    'powershell -NoProfile -Command "$e=[Console]::OutputEncoding; [Console]::OutputEncoding=[Text.Encoding]::Unicode;'
                    ' $o=sfc.exe /scannow; [Console]::OutputEncoding=$e;'
                    ' $o | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch \'\\d\\s*%%\' }"')],
    'dbl_onedrive': [('rd "%USERPROFILE%\\OneDrive" /q /s',
                      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders" | findstr /i "OneDrive" >nul || rd "%USERPROFILE%\\OneDrive" /q /s')],
}

# ---------------------------------------------------------------------------------------------------------------
# Blocs retirés : (clés, motif de la 1re ligne, motif de la dernière ligne)
DROP_BLOCKS = [
    # 2e boucle jamais fermée (fin de fichier) + écrit dans le magasin de pilotes : ne s'exécutait pas
    (('in_driver',), r'DriverDatabase\\DriverPackages" /S /F "IoLatencyCap"', r'msahci_Inst'),
    # lignes « Enum\%%a / %%s / %%i » hors boucle (aucun effet, clés parasites) puis boucle PCI qui viserait TOUS les
    # périphériques PCI (GPU, NVMe, carte réseau) avec setlocal sans endlocal ; elle ne trouve rien aujourd'hui
    (('sys_usb',), r'^reg\.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\%%a\\Device Parameters" /v SelectiveSuspendOn', r'^\s*\)\s*$'),
    # « Scaling » à 1 sur toutes les configurations d'écran (!str! sans expansion retardée : condition toujours vraie) :
    # les résolutions étirées (4:3 étiré) passent en bandes noires
    (('gpu_general',), r'/f Scaling\'\) do set "str=%%i"', r'^\s*\)\s*$'),
    # RAG-68 (2026-10-13) : boucle du mode MSI restée vide (« & ( » puis « ) ») depuis la réparation des boucles
    # détachées ; ses deux commandes étaient hors de la boucle (retirées plus bas). cmd refuse un bloc vide (« ) was
    # unexpected at this time. ») et arrêtait le préréglage 3 là : la boucle part avec son commentaire
    (('net_server:s3',), r'^::\s*Enabling MSI Mode On Network Adapter\s*$', r'^\s*\)\s*$'),
]

# ---------------------------------------------------------------------------------------------------------------
# Lignes retirées : (clés « id » ou « id:variant », motif). Le build cherche avec re.I.
DROP_LINES_PLUS = [
    # ---- Réseau -------------------------------------------------------------------------------------------------
    # métrique 55 sur TOUTES les interfaces : le Wi-Fi, l'Ethernet et le VPN passent au même rang, Windows peut
    # choisir le mauvais chemin (VPN contourné, Wi-Fi préféré au câble)
    (('ping_main:config1', 'ping_main:config2', 'ping_main:config4', 'ping_advanced', 'net_server:s2', 'net_server:s3',
      'net_server:s4', 'net_nagle'), r'/v\s+"?InterfaceMetric"?\s'),
    # ligne collée depuis ChatGPT (« :contentReference[oaicite:0] ») : crée une clé poubelle
    (('ping_main:config2',), r'oaicite'),
    # NewReno puis BBR2 sur tous les modèles : Windows 10 reste en NewReno (moins bon que CUBIC, le défaut),
    # BBR2 est expérimental sous Windows 11 (lenteurs connues en local)
    (('ping_main:config2', 'net_server:s4'), r'congestionprovider=(newreno|bbr2)\b'),
    # sockets brutes ouvertes aux programmes non administrateurs : affaiblit la sécurité, aucun gain
    (('ping_main:config2', 'ping_main:config4', 'ping_advanced', 'in_adapter', 'in_advanced', 'net_server:s4', 'net_registry'),
     r'/v\s+"?DisableRawSecurity"?\s+/t\s+REG_DWORD\s+/d\s+"?1'),
    # blobs binaires Nsi recopiés d'un autre PC (état interne de la pile réseau)
    (('ping_main:config4', 'ping_advanced', 'net_registry'), r'\\Control\\Nsi\\\{eb004a03'),
    # SACK coupé : retransmissions plus lentes dès qu'un paquet se perd (Wi-Fi), le contraire du but
    (('ping_main:config2', 'ping_main:config4', 'ping_advanced', 'in_adapter', 'in_windows', 'net_registry'),
     r'/v\s+"?SackOpts"?\s+/t\s+REG_DWORD\s+/d\s+"?0'),
    # mise à l'échelle de fenêtre TCP coupée : fenêtre plafonnée à 64 Ko, téléchargements bridés (jeux, mises à jour)
    (('ping_main:config4', 'ping_advanced', 'in_adapter', 'in_windows', 'net_registry'),
     r'/v\s+"?Tcp1323Opts"?\s+/t\s+REG_DWORD\s+/d\s+"?0"?\s'),
    # tailles de fenêtre fixes de 8 760 octets (réglage Windows XP)
    (('ping_main:config4', 'ping_advanced', 'in_adapter', 'in_windows', 'net_registry'),
     r'/v\s+"?(Global)?(Max)?TcpWindowSize"?\s+/t\s+REG_DWORD\s+/d\s+"?8760'),
    # règle de pare-feu « StopThrottling » (plages Google) cachée ici ; elle reste dans net_limit, où elle est annoncée
    (('ping_main:config4', 'ping_advanced'), r'name="StopThrottling"'),
    # découverte du MTU coupée : sites et jeux qui ne chargent plus derrière certains VPN ou box (paquets trop gros)
    (('net_server:s1', 'net_server:s2'), r'/v\s+EnablePMTUDiscovery\s+/t\s+REG_DWORD\s+/d\s+0\b'),
    # routage IP activé : le PC route les paquets entre ses cartes (sécurité), aucun gain
    (('net_server:s1', 'net_server:s2'), r'/v\s+IPEnableRouter\s+/t\s+REG_DWORD\s+/d\s+1\b'),
    # plafond de connexions TCP (navigateur + launcher + Discord peuvent le dépasser)
    (('ping_packets:hitreg', 'ping_packets:knockback', 'net_server:s1', 'net_server:s2'), r'/v\s+TcpNumConnections\s'),
    # boucle wmic vide, puis %%i utilisé hors boucle : écrit sous « Enum\%i » (la boucle vide part dans DROP_BLOCKS,
    # avec les commentaires de ces deux lignes)
    (('net_server:s3',), r'Enum\\%%i\\|^::\s*(Delete network Device Priority|Enable MSI Mode on NetAdapter)\s*$'),
    # « netsh int ipv6 set state » n'existe pas (aucun effet) ; net_ipv6 est réparé plus bas
    (('ping_main:config4', 'ping_advanced'), r'^\s*netsh\s+int\s+ipv6\s+set\s+state\s+disabled'),

    # ---- Latence, processeur, priorités ----------------------------------------------------------------------------
    # à l'arrêt, Windows ferme les applis sans demander d'enregistrer (travail perdu) et laisse 1 à 2 s aux services
    (('lat_general', 'sys_registry', 'win_optimize'), r'/v\s+"?(AutoEndTasks|WaitToKillServiceTimeout)"?\s'),
    # « veille autorisée » à 0 sur secteur : le PC ne se met plus jamais en veille (un portable branché capot fermé reste
    # allumé). Gardé dans cpu_cstates_off, dont le nom l'annonce.
    (('cpu_amd', 'cpu_intel', 'cpu_advanced', 'cpu_vendor', 'hitreg_suite'), r'SUB_SLEEP\s+ALLOWSTANDBY\s+0'),
    # nombre de processeurs figé dans le BCD : si le processeur change, Windows reste bridé à l'ancien nombre.
    # Gardé dans cpu_numproc, qui l'annonce.
    (('cpu_amd', 'cpu_intel', 'cpu_advanced', 'cpu_vendor'), r'bcdedit\s+/set\s+\{current\}\s+numproc'),
    # TSX réactivé sur Intel (faille TAA), aucun gain en jeu
    (('cpu_intel', 'cpu_vendor'), r'/v\s+"?DisableTsx"?\s+/t\s+REG_DWORD\s+/d\s+"?0'),
    # valeur magique non documentée dans Control\Processor
    (('cpu_amd', 'cpu_intel', 'cpu_advanced', 'cpu_registry'), r'Control\\Processor"\s+/v\s+"?Capabilities"?\s'),
    # bornes du réglage « cœurs minimum » mises à 0 : le CPMINCORES 100 qui suit échoue, et le réglage est faussé
    (('cpu_amd', 'cpu_intel', 'cpu_vendor', 'pri_policy', 'hitreg_suite'),
     r'0cc5b647-c1df-4637-891a-dec35c318583"\s+/v\s+"?Value(Max|Min)"?\s+/t\s+REG_DWORD\s+/d\s+"?0'),
    # réécrit les valeurs PAR DÉFAUT des plans de Windows : fausse tout retour aux valeurs par défaut (et l'annulation)
    (('cpu_advanced', 'cpu_registry', 'pri_policy'), r'\\DefaultPowerSchemeValues\\'),
    # états de perf. PEP coupés (portables récents), veto de la veille moderne, cœurs max à 0, politique XP
    (('cpu_advanced', 'cpu_registry'), r'/v\s+"?(AllowPepPerfStates|fDisablePowerManagement|VetoPolicy|CPMaxCores1?|GlobalPowerPolicy)"?\s'),
    # protections du chargeur de démarrage coupées sans le dire (restent dans exp_bios, in_advanced, sys_bcdedit)
    (('in_windows', 'cpu_intel', 'cpu_vendor:intel'), r'bcdedit\s+/set\s+(allowedinmemorysettings|isolatedcontext)\b'),
    # MMCSS Audio passé de 6 à 2 : l'audio passe derrière le jeu (crépitements sous charge)
    (('sys_priority',), r'Tasks\\Audio"\s+/v\s+"Priority"'),
    # tous les services Windows (svchost) en priorité « inactif » cachés dans « CSRSS » et « E/S » ; reste dans pri_svc
    (('sys_csrss', 'exp_io'), r'Image File Execution Options\\svchost\.exe\\'),
    # lsass (connexion, TLS, Windows Hello) en priorité « inactif » : authentifications lentes ou en échec pendant le jeu
    (('exp_io',), r'Image File Execution Options\\lsass\.exe\\'),
    # passe les 2-en-1 en mode tablette
    (('sys_csrss',), r'/v\s+"?ConvertibleSlateMode"?\s'),
    # pages larges forcées sur l'exe du jeu : risque d'échec de lancement, aucun gain
    (('pri_game',), r'/v\s+"?UseLargePages"?\s'),
    # lignes « Enum\%%a » hors boucle (aucun effet) et réglages souris, clavier et accessibilité cachés, doublons des
    # réglages Souris et Clavier (et leur annulation se marcherait dessus)
    (('sys_latency',), r'\\Enum\\%%[asi]\\|HKCU\\Control Panel\\(Accessibility|Mouse|Keyboard)'),
    # gauchers remis en droitier
    (('in_mouse', 'kbm_panel'), r'/v\s+"?SwapMouseButtons"?\s'),
    # « Keyboard Response\Flags » réécrit en REG_DWORD (doit rester REG_SZ) ; Verr. Num éteint au démarrage
    (('in_keyboard',), r'Keyboard Response"\s+/v\s+"Flags"\s+/t\s+REG_DWORD|/v\s+"InitialKeyboardIndicators"'),

    # ---- Mémoire --------------------------------------------------------------------------------------------------
    # valeur parasite « Start » dans Memory Management
    (('mem_profile', 'hitreg_suite'), r'Memory Management"\s+/v\s+"?Start"?\s'),

    # ---- Alimentation ---------------------------------------------------------------------------------------------
    # hibernation coupée sans le dire (portable : batterie critique = arrêt au lieu d'hibernation) ; pow_hibernate le fait
    (('pow_main',), r'^\s*powercfg\s+-h\s+off\s*$|/v\s+"?HibernateEnabled"?\s+/t\s+REG_DWORD\s+/d\s+"?0'),
    # clés « PowerSettings\xxx_yyy » (tirets remplacés par des _) : clés parasites, valeurs MMCSS sans effet
    (('pow_main',), r'PowerSettings\\54533251_82be'),
    # veille moderne coupée : sur les portables récents sans veille S3, plus de veille du tout
    (('pow_windows', 'pow_throttling', 'gpu_nvidia', 'nv_advanced'), r'/v\s+"?(CsEnabled|PlatformAoAcOverride)"?\s+/t\s+REG_DWORD\s+/d\s+"?0'),
    # « GpuEnergyDr » (faute) crée une clé de service parasite
    (('pow_gpuenergy', 'gpu_nvidia', 'gpu_amd', 'gpu_general', 'nv_general', 'amd_advanced'), r'\\Services\\GpuEnergyDr"'),
    # ouvre une fenêtre du Panneau de configuration en plein script (le plan est activé directement plus bas)
    (('pow_ultimate', 'pow_plan'), r'^\s*powercfg\.cpl\s*$'),

    # ---- Stockage, USB ---------------------------------------------------------------------------------------------
    # « cache protégé contre les coupures » caché : une coupure de courant peut corrompre des fichiers.
    # sto_cacheprot le pose désormais, annoncé (SUB plus bas)
    (('sto_general', 'sto_writecache'), r'/v\s+CacheIsPowerProtected\s'),
    # périphériques capricieux plus réessayés, clavier et souris qui ne réveillent plus le PC
    (('usb_hidden',), r'^\s*(EnumerationRetryCount|ExtPropDescSemaphore|WaitWakeEnabled)\s*$'),

    # ---- Carte graphique -------------------------------------------------------------------------------------------
    # TDR coupé caché : un pilote qui plante fige le PC au lieu de récupérer. Reste dans nv_tdr, annoncé.
    (('gpu_nvidia', 'gpu_general'), r'/v\s+"?Tdr(Level|Delay|DdiDelay|DebugMode|LimitCount|LimitTime|TestMode)"?\s'),
    # « Class{4d36e968… } » sans « \ » : clé parasite (nv_powermizer est réparé plus bas)
    (('gpu_nvidia',), r'Control\\Class\{4d36e968'),
    # bridage thermique et limite de puissance AMD coupés sans le dire (amd_thermal reste, annoncé)
    (('gpu_amd',), r'/v\s+"PP_ThermalAutoThrottlingEnable"\s+/t\s+REG_DWORD\s+/d\s+"0"|/v\s+"PP_DisablePowerContainment"\s'),
    # protection d'un écran précis (EDID d'un autre PC)
    (('gpu_amd',), r'EDID_D109_78E9'),

    # ---- Windows ---------------------------------------------------------------------------------------------------
    # réactive Game DVR juste après l'avoir coupé (AllowGameDVR 1, GameDVR_Enabled 1, AppCaptureEnabled 1) et efface
    # les profils du Mode jeu (affaire de win_gamemode)
    (('win_gamedvr',), r'(AllowGameDVR|GameDVR_Enabled|AppCaptureEnabled)"?\s+/t\s+REG_DWORD\s+/d\s+"?1|'
                       r'Win32_(AutoGameModeDefaultProfile|GameModeRelatedProcesses)|/v\s+"(AllowAutoGameMode|AutoGameModeEnabled)"'),
    # protections anti-exploit coupées sans le dire (CFG : FACEIT refuse de lancer le jeu ; SEHOP, ASLR forcé)
    (('win_mitigations',), r'/v\s+"?(DisableExceptionChainValidation|KernelSEHOPEnabled|EnableCfg|MoveImages|ProtectionMode)"?\s'),
    (('exp_kernel',), r'/v\s+"?(DisableExceptionChainValidation|KernelSEHOPEnabled)"?\s'),
    # « Mark of the Web » coupé : SmartScreen ne prévient plus pour les fichiers téléchargés
    # (gardé dans in_advanced, qui annonce la coupure de SmartScreen pour les fichiers téléchargés)
    (('sys_registry', 'win_diag', 'win_tracking'), r'/v\s+"?SaveZoneInformation"?\s'),
    # plus d'alerte quand un disque commence à lâcher
    (('sys_registry', 'win_telemetry', 'win_tracking', 'dbl_telemetry'), r'DiskDiagnostic\\'),
    # Windows Hello (visage, empreinte) coupé caché ; reste dans dbl_biometrics, annoncé
    (('sys_registry', 'win_telemetry', 'dbl_telemetry'), r'Policies\\Microsoft\\Biometrics"'),
    # maintenance automatique coupée cachée ; reste dans win_maintenance et exp_maintenance, annoncés
    (('in_advanced', 'sys_registry', 'win_telemetry'), r'/v\s+"?MaintenanceDisabled"?\s'),
    # vieux jeux et installeurs cassés (moteur de compatibilité coupé)
    (('sys_registry',), r'AppCompat"\s+/v\s+"DisableEngine"'),
    # contrôle parental Microsoft cassé
    (('win_telemetry', 'dbl_telemetry', 'dbl_ceip'), r'\\Shell\\FamilySafety'),
    # l'heure ne se resynchronise plus (erreurs de connexion, codes 2FA refusés)
    (('win_telemetry', 'dbl_telemetry'), r'\\Time Synchronization\\'),
    (('in_advanced',), r'W32Time\\Parameters"\s+/v\s+"Type"'),
    # plus de mises à jour automatiques des applis du Store (Minecraft Launcher)
    (('win_telemetry', 'dbl_telemetry'), r'WindowsUpdate\\Automatic App Update'),
    (('in_advanced',), r'WindowsStore"\s+/v\s+"AutoDownload"'),
    # SmartScreen des applis, capteurs (rotation et luminosité auto), outil antimalware de Windows Update
    (('win_telemetry', 'dbl_telemetry'), r'AppID\\SmartScreenSpecific|/v\s+"DisableSensors"'),
    (('in_advanced', 'win_telemetry', 'dbl_telemetry', 'hitreg_suite'), r'/v\s+"DontOfferThroughWUAU"'),
    # audit de sécurité caché dans « Optimisation du registre » (et « /failure:Disable /failure:Enable » ACTIVAIT
    # l'audit des échecs du pare-feu : journal Sécurité inondé)
    (('sys_registry',), r'^\s*Auditpol\s'),
    # UBPM : déclencheurs du Planificateur de tâches et des services
    (('win_telemetry', 'dbl_autologgers', 'exp_autologgers'), r'\\Autologger\\UBPM"'),
    # Chrome ne se met plus à jour (non annoncé ; la coupure des mises à jour d'Edge, annoncée, reste) ; suppression
    # d'entrées du cache du Planificateur de tâches à la main (cache incohérent, erreurs « image de tâche endommagée »)
    (('win_telemetry',), r'\\Services\\gupdatem?"|TaskCache\\Tree\\MicrosoftEdgeUpdate'),
    # masque d'effets visuels écrit en texte corrompu (REG_EXPAND_SZ « ነ考 ») ; mise à l'échelle DPI coupée
    (('win_telemetry',), r'/v\s+"UserPreferencesMask"\s+/t\s+REG_EXPAND_SZ|/v\s+"UseDpiScaling"'),
    # SmartScreen des applis du Store coupé caché (reste dans win_smartscreen)
    (('win_optimize',), r'AppHost"\s+/v\s+"?(EnableWebContentEvaluation|ContentEvaluation)"?\s'),
    # fait l'inverse de sa description : réactive la télémétrie (TailoredExperiences, activités, WDI, tâches)
    (('win_diag',), r'TailoredExperiencesWithDiagnosticDataEnabled|TIPC"\s+/v\s+"Enabled"|/v\s+"(Upload|Publish)UserActivities"|'
                    r'ScenarioExecutionEnabled|StartupAppTask|Power Efficiency Diagnostics|DisablediagnosticTracing'),
    # « Exécuter en tant qu'autre utilisateur » et clavier tactile / emoji / saisie japonaise ou chinoise
    (('win_services', 'in_advanced'), r'\b(seclogon|TabletInputService)\b'),
    # codecs retirés : les images .webp et .heic et les vidéos web ne s'ouvrent plus ; Lecteur multimédia de Windows 11
    (('win_apps', 'app_remove'), r'Microsoft\.(HEIFImageExtension|WebMediaExtensions|WebpImageExtension|ZuneMusic)\b'),
    # ---- Pack Latence avancée (in_advanced) et Latence de Windows (in_windows)
    # UAC coupé : TOUTES les applis du Store et MSIX ne s'ouvrent plus (Minecraft Launcher, Bedrock) ; les invites
    # admin restent silencieuses grâce à ConsentPromptBehaviorAdmin 0, gardé
    (('in_advanced',), r'/v\s+"EnableLUA"\s+/t\s+REG_DWORD\s+/d\s+"0"'),
    # supprime TOUTES les règles du pare-feu (Minecraft, Discord, partage réseau), sans retour possible
    (('in_advanced',), r'FirewallPolicy\\FirewallRules"'),
    # Firefox ne se met plus à jour ; Alt+Maj (changer de clavier AZERTY/QWERTY) coupé ; Veille et Verrouiller
    # retirés du menu ; filtre SafeSearch coupé (public jeune)
    (('in_advanced',), r'Mozilla\\Firefox"\s+/v\s+"DisableAppUpdate"|Keyboard Layout\\Toggle"|/v\s+"Show(Sleep|Lock)Option"|/v\s+"SafeSearchMode"'),
    # fichiers d'un autre PC : « SystemRestore » sous « WindowsNT » (sans espace)
    (('in_advanced',), r'Microsoft\\WindowsNT\\CurrentVersion\\SystemRestore'),
    # processeur maintenu en C0 (repos coupé) caché : chauffe, moins de boost, portable bruyant
    (('in_windows',), r'5d76a2ca-e8c0-402f-a133-2158492d58ad\s+1\s*$'),
    # menu de démarrage à 0 s (double démarrage : plus de choix du système) ; options de test des pilotes
    (('in_windows',), r'^\s*bcdedit\s+/timeout\s+0\s*$|bcdedit\s+/set\s+(firstmegabytepolicy|avoidlowmemory|nolowmem)\b'),
    # supprime et recrée C:\Windows\Temp et %TEMP% (perd leurs droits spéciaux) : le contenu est déjà vidé juste avant
    (('in_windows',), r'^\s*(rd\s+/s\s+/q|md)\s+(c:\\windows\\temp|%temp%)\s*$'),
    # ---- Suite Hitreg (hitreg_suite) : effets cachés hors jeu
    (('hitreg_suite',), r'Policies\\Microsoft\\Windows\\FileHistory"|Windows Defender\\Spynet"|FindMyDevice"\s+/v\s+"AllowFindMyDevice"|'
                        r'/v\s+"SafeSearchMode"|AppPrivacy"\s+/v\s+"LetAppsRunInBackground"|Tasks\\Games"\s+/v\s+Affinity\s|'
                        r'/v\s+"CrashDumpEnabled"|^\s*taskkill\s+/f\s+/im\s+explorer\.exe|^\s*start\s+explorer\.exe'),
    # ---- Mode jeu Rago : arrêt de Windows Update et effacement de son historique à chaque activation
    (('game_mode:on',), r'^\s*net\s+(stop|start)\s+wuauserv\b|SoftwareDistribution\\DataStore'),
]

# ---------------------------------------------------------------------------------------------------------------
# Lignes réécrites : (clés « id » ou « id:variant », motif, remplacement). Le build n'ajoute pas re.I : (?i) en tête.
SUB_LINES_PLUS = [
    # ---- Retour incorrect (MAJEUR) : « RBW Mod » désactivé passait en MANUEL des services qui sont en AUTOMATIQUE
    # dans Windows (journal d'événements, Planificateur de tâches, diagnostics, SysMain, PCA, CDP) : après le
    # redémarrage, tâches planifiées et applis lancées par tâche (pilotes, G HUB…) et journaux ne démarrent plus,
    # et un screenshare les trouve arrêtés. Appinfo et DsmSvc restent en manuel (leur défaut).
    (('rbw_mode:off',), r'(?i)^((?:.*do\s+)?sc\s+config\s+(?:EventLog|Schedule|DPS|SysMain|PcaSvc|%%s)\s+start=\s*)demand\b', r'\g<1>auto'),
    # ---- Débit : autotuning coupé ou « experimental » caché (fenêtre 64 Ko, téléchargements bridés), sauf
    # ping_hitreg où chaque variante l'annonce
    (('ping_packets:hitreg', 'net_profile:hitreg', 'net_profile:knockback', 'net_advanced', 'hitreg_suite'),
     r'(?i)(autotuning(?:level)?=)(disabled|experimental)\b', r'\g<1>normal'),
    (('ping_main:config1', 'net_server:s3', 'net_profile:knockback', 'net_profile:qos'),
     r'(?i)(-AutoTuningLevelLocal\s+)(disabled|Restricted|HighlyRestricted)\b', r'\g<1>Normal'),
    # le déchargement est annoncé comme réactivé, mais la ligne netsh le coupait
    (('net_offload',), r'(?i)(taskoffload=)disabled\b', r'\g<1>enabled'),
    # cache système « serveur » sur PC de jeu : le cache de fichiers passe avant les jeux (saccades)
    (('sys_ram', 'mem_profile:16', 'mem_profile:24', 'mem_profile:32', 'mem_profile:48', 'mem_profile:64', 'mem_profile:128',
      'net_server:s2', 'hitreg_suite'),
     r'(?i)(/v\s+"?LargeSystemCache"?\s+/t\s+REG_DWORD\s+/d\s+"?)1\b', r'\g<1>0'),
    # ---- Réparations (le réglage annonçait un effet qu'il n'avait pas)
    # IPv6 : « netsh int ipv6 set state » n'existe pas. Préférer IPv4 (0x20) garde l'IPv6 disponible pour les FAI
    # qui n'ont que lui, et s'annule en supprimant la valeur
    (('net_ipv6',), r'(?i)^\s*netsh\s+int\s+ipv6\s+set\s+state\s+disabled\s*$',
     r'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v "DisabledComponents" /t REG_DWORD /d "32" /f'),
    # mode absence : schéma 95533644… d'un autre PC (erreur, aucun effet)
    (('cpu_away', 'cpu_advanced'), r'(?i)(powercfg\s+-set(?:ac|dc)valueindex\s+)95533644-e700-4a79-a56c-a89e8cb109d9\b', r'\g<1>scheme_current'),
    # HIPM/DIPM : « reg query … /s "EnableHIPM" » sans /f (erreur de syntaxe) : la boucle ne tournait jamais
    (('pow_link',), r'(?i)(REG QUERY "HKLM\\System\\CurrentControlSet\\Services" /s) ("EnableHIPM")', r'\1 /f \2'),
    # options d'alimentation cachées : chemins « xxx_yyy » au lieu de GUID « xxx-yyy », aucune option n'apparaissait
    (('pow_ultimate', 'pow_plan'), r'(?i)PowerSettings\\[0-9a-f_\\]+(?=")', lambda m: m.group(0).replace('_', '-')),
    # Performances optimales : le plan créé n'était jamais activé, et un nouveau plan s'ajoutait à chaque passage.
    # Copié sous un GUID fixe (une seule copie, l'annulation peut la retirer) puis activé
    (('pow_ultimate',), r'(?i)^\s*powercfg\s+-duplicatescheme\s+e9a42b02-d5df-448d-aa00-03f14749eb61\s*$',
     'powercfg /query b5a8c3e1-4d2f-4e6a-9b71-2c8f0d6e3a95 >nul 2>&1 || powercfg -duplicatescheme '
     'e9a42b02-d5df-448d-aa00-03f14749eb61 b5a8c3e1-4d2f-4e6a-9b71-2c8f0d6e3a95 & powercfg -setactive '
     'b5a8c3e1-4d2f-4e6a-9b71-2c8f0d6e3a95'),
    # plan Rago : importé sous un GUID fixe puis activé (avant : importé, jamais activé). Le .pow fourni le 2026-10-10
    # vient d'un plan « IIIEXOIII LOW LATENCY » : renommé Rago, et trois réglages remis comme Windows (branché) :
    # repos processeur coupé (C0 permanent, déjà retiré de in_windows), pas de mot de passe au réveil, bouton
    # d'alimentation sans effet (le joueur finit par couper le courant en maintenant le bouton)
    (('pow_plan',), r'(?i)^(\s*powercfg\s+-import\s+"%RAGO_RES%\\LowLatency\.pow")\s*$',
     r'\1 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4'
     r' & powercfg -changename 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4 "Rago Low Latency" "Rago Optimizer low latency power plan"'
     r' & powercfg -setacvalueindex 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0'
     r' & powercfg -setacvalueindex 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4 fea3413e-7e05-4911-9a71-700331f1c294 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 1'
     r' & powercfg -setacvalueindex 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4 4f971e89-eebd-4455-a8de-9e59040e7347 7648efa3-dd9c-4e3e-b566-50f929386280 3'
     r' & powercfg -setactive 7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4'),
    # PowerMizer : « Class{… } » sans « \ » ni instance, aucun effet. Écrit dans la vraie clé du pilote NVIDIA
    (('nv_powermizer',), r'(?i)^Reg\.exe add "HKLM\\System\\CurrentControlSet\\Control\\Class\{4d36e968-e325-11ce-bfc1-08002be10318\}"( /v .*)$',
     r'''for /f %%k in ('reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}" /s /d /f "NVIDIA" ^| findstr /r /c:"\\\\[0-9][0-9][0-9][0-9]$"') do Reg.exe add "%%k"\1'''),
    # graphique Intel : /e /f "Intel" (texte exact) ne trouvait aucune clé
    (('gpu_intel', 'intel_gpu'), r'(?i)/t REG_SZ /s /e /f "Intel"', r'/s /d /f "Intel"'),
    # Actualités et centres d'intérêt : la politique est sous Policies\Microsoft\Dsh
    (('win_feed',), r'(?i)"HKLM\\SOFTWARE\\Policies\\Microsoft" (/v "AllowNewsAndInterests")', r'"HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" \1'),
    # ---- Souris 1:1 : courbes de lissage à zéro = curseur immobile si « Améliorer la précision » est active (défaut
    # de Windows). On coupe cette option (accélération) : mouvement 1:1, courbes de Windows intactes
    (('kbm_1to1',), r'(?i)^Reg\.exe add "HKCU\\Control Panel\\Mouse" /v "SmoothMouseXCurve" .*$',
     r'Reg.exe add "HKCU\\Control Panel\\Mouse" /v "MouseSpeed" /t REG_SZ /d "0" /f'),
    (('kbm_1to1',), r'(?i)^Reg\.exe add "HKCU\\Control Panel\\Mouse" /v "SmoothMouseYCurve" .*$',
     r'Reg.exe add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold1" /t REG_SZ /d "0" /f & Reg.exe add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold2" /t REG_SZ /d "0" /f'),
    # ---- Stockage : noms inversés. sto_cacheprot pose bien « cache protégé » (annoncé par WARNINGS), et les deux
    # laissent les clés USB tranquilles (débranchées sans éjecter = fichiers perdus)
    (('sto_cacheprot',), r'(?i)/v UserWriteCacheSetting /t reg_dword /d 1', r'/v CacheIsPowerProtected /t REG_DWORD /d 1'),
    (('sto_general', 'sto_writecache', 'sto_cacheprot'), r'''(?i)(/d /s\^\|Find "HKEY")'\)''', r'''\1^|findstr /v /i "USBSTOR"')'''),
    # Minecraft : la boucle porte déjà « javaw.exe » : « %%i.exe » donnait « javaw.exe.exe » (QoS et IFEO sans effet)
    (('pri_game:minecraft',), r'(?i)/d "%%i\.exe"', r'/d "%%i"'),
    (('pri_game:minecraft',), r'(?i)\\javaw\.exe\.exe\\', r'\\javaw.exe\\'),
    # Autres jeux (RAG-60) : même « %%i.exe » sur une boucle qui porte déjà « .exe » (cs2.exe.exe…), et des noms
    # d'exécutables faux, donc ni priorité ni règle réseau. Noms vérifiés (dossiers d'installation, journaux d'erreur
    # de Windows) : VALORANT-Win64-Shipping.exe (ShooterGame\Binaries\Win64 ; ValorantClient-… n'existe pas),
    # FortniteClient-Win64-Shipping.exe (la règle réseau visait « FortniteClient-Win64 »), r5apex_dx12.exe (Apex en
    # DirectX 12, le mode par défaut ; r5apex.exe reste le DirectX 11), GTA5_Enhanced.exe (édition Enhanced de 2025 ;
    # GTA5.exe reste la Legacy). Les deux exécutables d'Apex et de GTA sont visés
    (('pri_game:fortnite', 'pri_game:valorant', 'pri_game:cs2', 'pri_game:apex', 'pri_game:gta'), r'(?i)/d "%%i\.exe"', r'/d "%%i"'),
    (('pri_game:valorant',), r'(?i)\bValorantClient-Win64-Shipping\.exe\b', 'VALORANT-Win64-Shipping.exe'),
    (('pri_game:fortnite',), r'(?i)^for %%i in \(FortniteClient-Win64\) do \($', 'for %%i in (FortniteClient-Win64-Shipping.exe) do ('),
    (('pri_game:apex',), r'(?i)^for %%i in \(r5apex\.exe\) do \($', 'for %%i in (r5apex.exe r5apex_dx12.exe) do ('),
    (('pri_game:gta',), r'(?i)^for %%i in \(GTA5\.exe\) do \($', 'for %%i in (GTA5.exe GTA5_Enhanced.exe) do ('),
    (('pri_game:apex',), r'(?i)^(Reg\.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\)r5apex\.exe(\\.*)$',
     r'for %%e in (r5apex.exe r5apex_dx12.exe) do \1%%e\2'),
    (('pri_game:gta',), r'(?i)^(Reg\.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\)GTA5\.exe(\\.*)$',
     r'for %%e in (GTA5.exe GTA5_Enhanced.exe) do \1%%e\2'),
    # points de restauration activés sur D: à G: (place prise sur des disques de données, parfois des clés USB)
    (('in_advanced',), r"(?i)(Enable-ComputerRestore -Drive )'C:\\', 'D:\\', 'E:\\', 'F:\\', 'G:\\'", r"\1'C:\\'"),
    # ---- Effets visuels : masque de 4 octets au lieu de 8 ; « meilleure apparence » au lieu de « laisser Windows choisir »
    (('hitreg_suite', 'game_mode:off'), r'(?i)(/v UserPreferencesMask /t REG_BINARY /d )9e3e07d1\b', r'\g<1>9E1E078012000000'),
    (('game_mode:off',), r'(?i)(/v VisualFXSetting /t REG_DWORD /d )1\b', r'\g<1>0'),
    # ---- Mode jeu : « rd /s /q %temp% » supprimait le dossier TEMP lui-même (installeurs et natives de Minecraft en échec)
    (('game_mode:on',), r'(?i)^\s*rd\s+/s\s+/q\s+%temp%(\s*>\s*nul)?\s*$',
     r'for /d %%d in ("%temp%\\*") do rd /s /q "%%d" >nul 2>&1'),
    # ---- Protection LSA : RunAsPPL 1 se verrouille dans une variable UEFI (supprimer la valeur ne la coupe pas) ;
    # 2 = même protection, sans verrou UEFI, annulable (Windows 11 22H2+, ignoré avant)
    (('exp_harden',), r'(?i)(/v "RunAsPPL" /t REG_DWORD /d )"1"', r'\1"2"'),
    # ---- Audit : « /failure:Enable » ACTIVAIT l'audit des échecs (pare-feu, RPC…) : journal Sécurité inondé
    # « Journaliser seulement les échecs » : garde l'idée, sauf pour les connexions filtrées (un événement 5157 par
    # connexion bloquée) ; et les noms anglais ne marchent que sur un Windows anglais : GUID (toutes les langues)
    (('win_audit',), r'(?i)(/subcategory:"Filtering Platform Connection"\s+/success:Disable\s+/failure:)Enable\b', r'\g<1>Disable'),
    (('win_audit',), r'(?i)/subcategory:"([^"]+)"', lambda m: '/subcategory:' + AUDIT_GUID[m.group(1).lower()]),
]

AUDIT_GUID = {n: '{%s-69AE-11D9-BED3-505054503030}' % g for n, g in {
    'security state change': '0CCE9210', 'security system extension': '0CCE9211', 'system integrity': '0CCE9212',
    'ipsec driver': '0CCE9213', 'other system events': '0CCE9214', 'filtering platform connection': '0CCE9226',
    'process termination': '0CCE922C', 'dpapi activity': '0CCE922D', 'rpc events': '0CCE922E'}.items()}

# ---------------------------------------------------------------------------------------------------------------
# Avertissements (même format que WARNINGS) : passent le réglage en avancé avec confirmation
WARNINGS_PLUS = [
    (r'svchost\.exe\\PerfOptions"?\s+/v\s+"?CpuPriorityClass"?\s+/t\s+REG_DWORD\s+/d\s+"?1\b',
     'Puts every Windows service (sound, network, updates) at idle priority: sound can crackle and the network can lag while you play.',
     'Passe tous les services Windows (son, réseau, mises à jour) en priorité minimale : le son peut grésiller et le réseau ramer pendant tes parties.'),
    (r'/v\s+CacheIsPowerProtected\s+/t\s+REG_DWORD\s+/d\s+1\b',
     'If the power cuts (outage, unplugged PC, flat battery), files being written can be corrupted. Only with a UPS or on a laptop.',
     'Si le courant coupe (panne, PC débranché, batterie vide), des fichiers en cours d\'écriture peuvent être corrompus. Seulement avec un onduleur ou sur un portable.'),
    (r'PP_ThermalAutoThrottlingEnable"?\s+/t\s+REG_DWORD\s+/d\s+"?0|PP_DisablePowerContainment"?\s+/t\s+REG_DWORD\s+/d\s+"?1',
     'Turns off the thermal throttling and power limit of your AMD card: it can run hotter. Watch your temperatures.',
     'Coupe le bridage thermique et la limite de puissance de ta carte AMD : elle peut chauffer davantage. Surveille tes températures.'),
    (r'\bXblAuthManager\s+start=\s*disabled',
     'Turns off the Xbox services: Game Pass, the Xbox app and Minecraft Bedrock sign-in stop working.',
     'Coupe les services Xbox : le Game Pass, l\'appli Xbox et la connexion à Minecraft Bedrock ne marchent plus.'),
    # remplace l'avertissement UAC du build (motif EnableLUA 0, ligne retirée) : les demandes d'autorisation restent coupées
    (r'ConsentPromptBehaviorAdmin"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b',
     'Turns off the admin permission prompts (UAC): programs get admin rights without asking.',
     'Coupe les demandes d\'autorisation administrateur (UAC) : les programmes obtiennent les droits administrateur sans demander.'),
    (r'Set-SmbServerConfiguration\s+-EncryptData\s+\$True',
     'Old NAS drives, routers and TVs that do not support SMB encryption will no longer open your shared folders.',
     'Les vieux NAS, box et TV qui ne gèrent pas le chiffrement SMB ne pourront plus ouvrir tes dossiers partagés.'),
]

# ---------------------------------------------------------------------------------------------------------------
# Descriptions qui disent ce que font les commandes après correction
DESC_FIX_PLUS = {
    'rbw_mode': ('On restarts the services screenshare tools check (Event Log, SysMain, PCA, Scheduler) and turns BAM and Prefetch '
                 'back on after a restart. Off puts these services back to how Windows sets them.',
                 'Activé relance les services que vérifient les outils de screenshare (journal d\'événements, SysMain, PCA, '
                 'Planificateur) et remet BAM et le Prefetch après un redémarrage. Désactivé remet ces services comme Windows les règle.'),
    'kbm_1to1': ('Turns off Enhance pointer precision (mouse acceleration) for 1:1 movement and keeps the Windows speed at 6/11.',
                 'Coupe « Améliorer la précision du pointeur » (l\'accélération) pour un mouvement 1:1 et garde la vitesse Windows au cran 6/11.'),
    'sto_writecache': ('Turns on the write cache of your internal drives (USB drives are left alone).',
                       'Active le cache d\'écriture de tes disques internes (les clés et disques USB ne sont pas touchés).'),
    'sto_cacheprot': ('Tells Windows your internal drives are protected against power cuts, so it stops forcing cache flushes.',
                      'Indique à Windows que tes disques internes sont protégés contre les coupures de courant : il ne force plus le vidage du cache.'),
    'in_adapter': ('Network card and TCP settings: AFD buffers, delayed ACKs, TTL, and the network card interrupts pinned to one CPU core.',
                   'Réglages de la carte réseau et de TCP : tampons AFD, accusés de réception, TTL, et interruptions de la carte '
                   'réseau épinglées sur un seul cœur du processeur.'),
    'cpu_cstates_off': ('On mains power the PC no longer goes to sleep by itself (sleep, hybrid sleep and away mode off) and the '
                        'processor stays at 100 % minimum.',
                        'Sur secteur, le PC ne se met plus en veille tout seul (veille, veille hybride et mode absence coupés) et '
                        'le processeur reste à 100 % minimum.'),
    'win_notifications': ('No more notification banners or sounds while you play. Also hides the notification center and the '
                          'Windows Security alerts.',
                          'Plus de bannières ni de sons de notification pendant tes parties. Masque aussi le centre de '
                          'notifications et les alertes de Sécurité Windows.'),
    'usb_hidden': ('Turns off the hidden power saving of every device that has it, not only USB. On a laptop the battery lasts less.',
                   'Coupe les économies d\'énergie cachées de tous les périphériques qui en ont, pas seulement l\'USB. Sur un '
                   'portable, la batterie dure moins.'),
    'in_queue': ('How many mouse and keyboard events the drivers buffer. Lower is more responsive. With a 4000 Hz mouse or faster, '
                 'keep Balanced or Default.',
                 'Nombre d\'événements souris et clavier mis en mémoire par les pilotes. Plus bas, plus réactif. Avec une souris '
                 '4000 Hz ou plus, garde Équilibrée ou Par défaut.'),
    'pow_plan': ('Imports the Rago power plan, turns it on and shows the hidden Windows power options.',
                 'Importe le plan d\'alimentation Rago, l\'active et affiche les options d\'alimentation cachées de Windows.'),
    'pow_ultimate': ('Adds the Ultimate Performance plan, turns it on and deletes the default plans.',
                     'Ajoute le plan Performances optimales, l\'active et supprime les plans par défaut.'),
    'net_ipv6': ('Makes Windows prefer IPv4 over IPv6. IPv6 stays available if your provider only uses it.',
                 'Windows préfère l\'IPv4 à l\'IPv6. L\'IPv6 reste disponible si ton fournisseur n\'utilise que lui.'),
    'win_gamedvr': ('Turns off background recording and the Xbox services.',
                    'Coupe l\'enregistrement en arrière-plan et les services Xbox.'),
    'dbl_xbox': ('Turns off the Xbox Live services. Game Pass games and Minecraft Bedrock sign-in will no longer work.',
                 'Coupe les services Xbox Live. Les jeux du Game Pass et la connexion à Minecraft Bedrock ne fonctionneront plus.'),
    'win_telemetry': ('Turns off telemetry, scheduled tasks and the Edge update services. Edge and WebView2, which Rago runs on, '
                      'stop updating.',
                      'Coupe la télémétrie, des tâches planifiées et les services de mise à jour d\'Edge. Edge et WebView2, le '
                      'moteur de l\'appli Rago, ne se mettent plus à jour.'),
    'dbl_onedrive': ('Uninstalls OneDrive and deletes its local folders. Check first that your files are online. If your Desktop or '
                     'Documents live in OneDrive, that folder is kept.',
                     'Désinstalle OneDrive et supprime ses dossiers locaux. Vérifie d\'abord que tes fichiers sont bien en ligne. Si '
                     'ton Bureau ou tes Documents sont dans OneDrive, ce dossier est gardé.'),
    'win_services': ('Turns off Windows services most players do not use, including search indexing (slower search) and printing.',
                     'Coupe des services Windows que la plupart des joueurs n\'utilisent pas, dont l\'indexation (recherche plus '
                     'lente) et l\'impression.'),
}
# win_maintenance et exp_maintenance : ajouter à la fin
MAINTENANCE_NOTE = (' Windows also stops optimizing your drives on its own.', ' Windows n\'optimise plus non plus tes disques tout seul.')

# ---------------------------------------------------------------------------------------------------------------
# Réglages qui ne font rien sur un Windows 10 ou 11 à jour (à retirer seulement si Sofiene choisit « Retirer »)
PLACEBO = [
    'pow_mmcss',       # 100 % de valeurs MMCSS écrites dans des clés d'alimentation inexistantes
    'cpu_idle',        # ~44 valeurs CpuIdleScrub* inventées
    'pri_csrss',       # csrss est protégé : Windows ignore ses PerfOptions (et IoPriority 4 n'existe pas)
    'gpu_directx',     # DirectDraw et Direct3D 7-9 : Minecraft (OpenGL) et les jeux DX11/12 ne les lisent pas
    'lat_directx',     # idem
    'in_frames',       # variables d'environnement inventées, lues par aucun programme
    'mem_superfetch',  # EnableSuperfetch est ignoré depuis Windows 10 (et couper SysMain casserait la compression mémoire)
    'win_store',       # pose les deux politiques du Store à 0 (rien coupé) et l'Optimisation de la distribution sur
                       # « réseau local », qui est déjà le réglage de Windows
]

# ---------------------------------------------------------------------------------------------------------------
# Changements de catalogue (hors scripts)
CATALOG = {
    'sto_defrag': "kind 'action' : lance un ReTrim ponctuel, rien à annuler (aujourd'hui une case qui reste cochée)",
}

# ---------------------------------------------------------------------------------------------------------------
BUILD_PATCH = r'''
    for ids, pat in DROP_LINES:
        for key in ids:                                   # « id » ou « id:variant », comme SUB_LINES
            tid, _, only = key.partition(':')
            for v, body in scripts[tid].items():
                if only and v != only:
                    continue
                sep = '\r\n' if '\r\n' in body else '\n'
                kept = [l for l in body.split(sep) if not re.search(pat, l, re.I)]
                assert len(kept) < len(body.split(sep)), (key, v, pat)
                scripts[tid][v] = sep.join(kept)
    # à placer avant la boucle DROP_LINES
    for keys, start, end in DROP_BLOCKS:
        for key in keys:
            tid, _, only = key.partition(':')
            for v, body in scripts[tid].items():
                if only and v != only:
                    continue
                sep = '\r\n' if '\r\n' in body else '\n'
                lines = body.split(sep)
                i = next(n for n, l in enumerate(lines) if re.search(start, l, re.I))
                j = next(n for n in range(i + 1, len(lines)) if re.search(end, lines[n], re.I))
                scripts[tid][v] = sep.join(lines[:i] + lines[j + 1:])
'''
