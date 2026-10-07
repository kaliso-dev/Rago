"""Catalogue de Rago Optimizer : l'ancien programme (v5.2, tools/build_catalog.py) plus les trois .bat
de Sofiene (legacy/v6, 2026-10-06), dédoublonnés.

Chaque bloc « :: Titre » des .bat devient un réglage ; les variantes (Hypixel, ON/OFF, niveaux) sont
déclarées dans SECTIONS. Le module Restore (outils de l'app) est repris de l'ancien catalogue.

    python3 tools/build_catalog_v6.py
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_bat import LegacyBat  # noqa: E402  (réparation des boucles for détachées, comme en v5.2)

ROOT = os.path.join(os.path.dirname(__file__), '..')
V6 = os.path.join(ROOT, 'legacy', 'v6')
FILES = {
    'ping': 'RAGO APP Ping Optimization Final.bat',
    'input': 'RAGO APP HITREG INPUTLAG.bat',
    'fps': 'RAGO APP FPS.bat',
}
HEADER = re.compile(r'^:{2,3}\s*([A-Za-z].*?)\s*$')
NIP = '"%RAGO_RES%\\nvidiaProfileInspector.exe" "%RAGO_RES%\\extremelatencylow.nip" -silentImport'


def I(en, fr=None):
    return {'en': en, 'fr': fr or en}


def T(file, line, id, en, fr, desc_en, desc_fr, risk='safe', reboot=True, requires=(), variants=None,
      absorb=0, confirm=None, default=None, revert=None, prefix=False):
    # variants : (id, nom en, nom fr, motif de début[, choix automatique « ram:16 »]) ; revert : la variante qui
    # remet Windows d'origine (ouverte en gratuit) ; prefix : les lignes avant la 1re variante vont dans chacune
    return dict(file=file, line=line, id=id, name=I(en, fr), desc=I(desc_en, desc_fr), risk=risk, reboot=reboot,
                requires=list(requires), variants=variants, absorb=absorb, confirm=confirm, default=default,
                revert=revert, prefix=prefix)


ONOFF = [('on', 'On', 'Activé', r'::\s*gmode ON'), ('off', 'Off', 'Désactivé', r'::\s*gmode OF')]

# module, icône, nom, accroche, [(section, nom, [réglages])]
MODULES = [
    ('network', 'network', I('Ping', 'Ping'), I('Lower ping, cleaner packets.', 'Un ping plus bas, des paquets plus propres.'), [
        ('hitreg', I('Hit registration', 'Enregistrement des coups'), [
            T('ping', 10, 'ping_hitreg', 'Hitreg profile', 'Profil hitreg',
              'TTL, TCP auto-tuning and receive coalescing, in six profiles. Default puts Windows back as it was.',
              'TTL, auto-tuning TCP et regroupement des paquets, en six profils. Default remet Windows comme avant.',
              reboot=False, default='better', revert='default',
              variants=[('better', 'Better hitreg', 'Meilleur hitreg', r'^:BETTERHITREG'),
                        ('besthitreg', 'Best hitreg', 'Hitreg maximal', r'^:\s*BESTHITREG'),
                        ('balanced', 'Balanced', 'Équilibré', r'^:\s*BALANCED'),
                        ('hypixel', 'Hypixel', 'Hypixel', r'^:HYPIXEL'),
                        ('slowlest', 'Slowest', 'Le plus lent', r'^:\s*SLOWLEST'),
                        ('default', 'Default', 'Par défaut', r'^:\s*DEFAULT')]),
            T('ping', 85, 'ping_packets', 'Packet optimization', 'Optimisation des paquets',
              'Offloads, RSS, MTU and TCP timers, in three profiles: Hitreg (MTU 1400), QoS or Knockback.',
              'Offloads, RSS, MTU et minuteurs TCP, en trois profils : Hitreg (MTU 1400), QoS ou Knockback.',
              default='hitreg',
              variants=[('hitreg', 'Hitreg', 'Hitreg', r'^:HITREG OPTION'), ('qos', 'QoS', 'QoS', r'^:\s*QOS OPTION'),
                        ('knockback', 'Knockback', 'Knockback', r'^:\s*KNOCKBACK OPTION')]),
        ]),
        ('ping', I('Ping', 'Ping'), [
            T('ping', 259, 'ping_main', 'Ping optimization', 'Optimisation du ping',
              'Tunes your network adapter and the Windows TCP/IP stack for low ping, in four configs.',
              'Règle ta carte réseau et la pile TCP/IP de Windows pour un ping bas, en quatre configurations.',
              default='config1',
              variants=[(f'config{n}', f'Config {n}', f'Config {n}', rf'^:\s*CONFIG {n}\b') for n in range(1, 5)]),
            T('ping', 704, 'ping_advanced', 'Advanced network config', 'Configuration réseau avancée',
              'NetBIOS, adapter bindings and deeper TCP/IP settings.',
              'NetBIOS, liaisons de la carte et réglages TCP/IP plus poussés.', risk='advanced'),
        ]),
    ]),
    ('hitreg', 'crosshair', I('Hitreg & input lag', 'Hitreg et input lag'), I('What you click is what lands.', 'Ce que tu cliques arrive.'), [
        ('latency', I('Input latency', 'Latence d\'entrée'), [
            T('input', 2, 'in_driver', 'Driver latency', 'Latence des pilotes',
              'Lowers latency tolerance in graphics and power drivers.',
              'Baisse la tolérance de latence des pilotes graphiques et d\'alimentation.'),
            T('input', 35, 'in_adapter', 'Adapter latency', 'Latence de la carte',
              'Latency settings for the display adapter and its scheduler.',
              'Réglages de latence de la carte graphique et de son planificateur.'),
            T('input', 76, 'in_windows', 'Windows latency', 'Latence de Windows',
              'Windows scheduling, timers and priority settings for lower input lag. Also turns off the Spectre and Meltdown protections.',
              'Planification, minuteurs et priorités de Windows pour moins d\'input lag. Coupe aussi les protections Spectre et Meltdown.',
              risk='advanced'),
            T('input', 732, 'in_frames', 'Frame latency', 'Latence des images',
              'How many frames Windows and DirectX queue before showing them.',
              'Nombre d\'images que Windows et DirectX mettent en file avant de les afficher.',
              revert='default',
              variants=[('lowest', 'Lowest', 'Minimale', r'^\s*::\s*Lowest'), ('balanced', 'Balanced', 'Équilibrée', r'^\s*::\s*Balanced'),
                        ('default', 'Default', 'Par défaut', r'^\s*::\s*Default')]),
            T('input', 181, 'in_advanced', 'Advanced latency', 'Latence avancée',
              'Big pack: stops services, driver updates, UAC, Windows Update notifications, Spectre and Meltdown protections, plus dozens of Explorer settings.',
              'Gros pack : coupe des services, les mises à jour de pilotes, l\'UAC, les notifications Windows Update, les protections Spectre et Meltdown, et des dizaines de réglages de l\'Explorateur.',
              risk='advanced'),
        ]),
        ('input', I('Mouse & keyboard', 'Souris et clavier'), [
            T('fps', 2211, 'in_mouse', 'Mouse optimization', 'Optimisation de la souris',
              'Raw 1:1 mouse movement, no acceleration, faster mouse driver.',
              'Mouvement brut 1:1, sans accélération, pilote souris plus réactif.', reboot=False),
            T('fps', 2259, 'in_keyboard', 'Keyboard optimization', 'Optimisation du clavier',
              'Instant key repeat and a faster keyboard driver.',
              'Répétition instantanée et pilote clavier plus réactif.', reboot=False),
            T('fps', 2189, 'in_queue', 'Input queue size', 'File souris et clavier',
              'How many mouse and keyboard events the drivers buffer. Lower reacts faster.',
              'Nombre d\'événements souris et clavier mis en mémoire par les pilotes. Plus bas, plus réactif.',
              absorb=4, revert='default'),
        ]),
    ]),
    ('gpu', 'gpu', I('Graphics card', 'Carte graphique'), I('More frames, less wait.', 'Plus d\'images, moins d\'attente.'), [
        ('vendor', I('Your card', 'Ta carte'), [
            T('fps', 847, 'gpu_nvidia', 'NVIDIA optimization', 'Optimisation NVIDIA',
              'NVIDIA driver settings, preemption, power states and the Rago driver profile.',
              'Réglages du pilote NVIDIA, préemption, états d\'alimentation et profil pilote Rago.',
              requires=['gpu:nvidia']),
            T('fps', 378, 'gpu_amd', 'AMD optimization', 'Optimisation AMD',
              'AMD driver settings, power saving and latency features.',
              'Réglages du pilote AMD, économies d\'énergie et options de latence.', requires=['gpu:amd']),
            T('fps', 1395, 'gpu_intel', 'Intel graphics', 'Graphique Intel',
              'Intel GPU driver settings.', 'Réglages du pilote graphique Intel.', requires=['gpu:intel']),
        ]),
        ('general', I('Any card', 'Toutes les cartes'), [
            T('fps', 1416, 'gpu_general', 'General GPU', 'GPU général',
              'Hardware scheduling, GPU priority and power settings for any card.',
              'Planification matérielle, priorité et alimentation du GPU, pour toutes les cartes.'),
            T('fps', 1562, 'gpu_directx', 'DirectX', 'DirectX',
              'DirectX and DXGI settings for lower frame latency.',
              'Réglages DirectX et DXGI pour une latence d\'image plus basse.'),
        ]),
    ]),
    ('system', 'gauge', I('CPU & system', 'CPU et système'), I('Every core working for your game.', 'Chaque cœur au service de ton jeu.'), [
        ('cpu', I('Processor', 'Processeur'), [
            T('fps', 38, 'cpu_amd', 'AMD CPU', 'CPU AMD', 'Core parking and cooling policy for AMD processors.',
              'Parcage des cœurs et refroidissement pour les processeurs AMD.', requires=['cpu:amd']),
            T('fps', 66, 'cpu_intel', 'Intel CPU', 'CPU Intel', 'Core parking and cooling policy for Intel processors.',
              'Parcage des cœurs et refroidissement pour les processeurs Intel.', requires=['cpu:intel']),
            T('fps', 97, 'cpu_advanced', 'Advanced CPU', 'CPU avancé',
              'C-states, P-states, throttling and scheduler settings.',
              'C-states, P-states, bridage et réglages du planificateur.', risk='advanced'),
            T('fps', 2097, 'sys_latency', 'System latency', 'Latence système',
              'Timers, interrupts and kernel latency settings.',
              'Minuteurs, interruptions et réglages de latence du noyau.'),
        ]),
        ('priority', I('Priority & memory', 'Priorité et mémoire'), [
            T('fps', 2309, 'sys_priority', 'Priority optimization', 'Optimisation des priorités',
              'Gives games and input more CPU priority.', 'Donne plus de priorité CPU aux jeux et aux entrées.'),
            T('fps', 2343, 'sys_csrss', 'CSRSS priority', 'Priorité CSRSS',
              'Raises the priority of the Windows process that handles input.',
              'Monte la priorité du processus Windows qui gère les entrées.'),
            T('fps', 1650, 'sys_ram', 'RAM optimization', 'Optimisation de la RAM',
              'Memory management, compression and prefetch settings, sized for your RAM (picked automatically). Also turns off the Spectre and Meltdown protections.',
              'Gestion de la mémoire, compression et prefetch, selon ta RAM (choisie automatiquement). Coupe aussi les protections Spectre et Meltdown.',
              risk='advanced', prefix=True, default='16',
              variants=[(str(g), f'{g} GB', f'{g} Go', rf'^:{g}GB\s*$', f'ram:{g}') for g in (4, 8, 12, 16, 24, 32, 48, 64, 128)]),
            T('fps', 2362, 'sys_registry', 'Registry optimization', 'Optimisation du registre',
              'Large set of registry settings, including disabling the BAM service and the I/O latency cap.',
              'Grand ensemble de réglages du registre, dont la coupure du service BAM et du plafond de latence disque.',
              risk='advanced'),
        ]),
        ('power', I('Power & storage', 'Alimentation et stockage'), [
            T('fps', 1920, 'pow_main', 'Power optimization', 'Optimisation de l\'alimentation',
              'Turns off power saving that slows your CPU and devices.',
              'Coupe les économies d\'énergie qui ralentissent ton CPU et tes périphériques.'),
            T('fps', 1969, 'pow_ultimate', 'Ultimate power plan', 'Plan Performances optimales',
              'Adds the Ultimate Performance plan and removes the default plans.',
              'Ajoute le plan Performances optimales et supprime les plans par défaut.', risk='advanced'),
            T('fps', 1770, 'pow_saving', 'Storage power saving', 'Économies d\'énergie du stockage',
              'Keeps your drives out of idle power states.', 'Empêche tes disques de passer en veille.'),
            T('fps', 1805, 'sto_general', 'Storage optimization', 'Optimisation du stockage',
              'Disk write cache, then a deep clean: temp files, browser caches, Windows Update cache, Recycle Bin and recent-files history, and a DISM cleanup.',
              'Cache d\'écriture des disques, puis un grand nettoyage : fichiers temporaires, caches des navigateurs, cache Windows Update, Corbeille et historique des fichiers récents, et un nettoyage DISM.',
              risk='advanced'),
            T('fps', 1789, 'sto_ntfs', 'NTFS tweaks', 'Réglages NTFS', 'File system settings for faster access.',
              'Réglages du système de fichiers pour un accès plus rapide.'),
            T('fps', 1797, 'sto_fsutil_v6', 'FSUTIL settings', 'Réglages FSUTIL', 'Disables last-access and 8.3 names.',
              'Coupe la date de dernier accès et les noms 8.3.'),
            T('fps', 1886, 'sto_fsutil2', 'FSUTIL memory usage', 'FSUTIL mémoire', 'NTFS memory usage settings.',
              'Réglages mémoire de NTFS.'),
            T('fps', 1802, 'sto_defrag', 'Optimize drive', 'Optimiser le disque', 'Runs a drive optimization.',
              'Lance une optimisation du disque.', reboot=False),
            T('fps', 1893, 'sys_time', 'Time behaviour', 'Gestion du temps', 'Timer and clock settings.',
              'Réglages des minuteurs et de l\'horloge.'),
            T('fps', 2010, 'sys_bcdedit', 'Boot settings (BCD)', 'Réglages de démarrage (BCD)',
              'Boot configuration: timers, tick and hypervisor options.',
              'Configuration du démarrage : minuteurs, tick et options de l\'hyperviseur.', risk='advanced'),
            T('fps', 2050, 'sys_usb', 'USB optimization', 'Optimisation USB',
              'Turns off USB power saving and selective suspend.', 'Coupe les économies d\'énergie et la mise en veille USB.'),
        ]),
    ]),
    ('windows', 'windows', I('Windows', 'Windows'), I('A lighter Windows, built for games.', 'Un Windows plus léger, pensé pour le jeu.'), [
        ('gaming', I('Gaming', 'Jeu'), [
            T('fps', 2573, 'win_fullscreen', 'Fullscreen optimization', 'Plein écran',
              'Fullscreen exclusive settings for Windows 10 and 11.', 'Plein écran exclusif pour Windows 10 et 11.'),
            T('fps', 2598, 'win_gamemode', 'Windows Game Mode', 'Mode jeu Windows',
              'Turns Windows Game Mode on or off.', 'Active ou coupe le mode jeu de Windows.', reboot=False, variants=ONOFF),
            T('fps', 2917, 'win_gamedvr', 'Disable Game DVR and Xbox', 'Couper Game DVR et Xbox',
              'Turns off background recording and Xbox services.', 'Coupe l\'enregistrement en arrière-plan et les services Xbox.'),
            T('fps', 2976, 'win_visual', 'Optimize visuals', 'Effets visuels',
              'Turns off animations and visual effects.', 'Coupe les animations et effets visuels.', reboot=False),
        ]),
        ('clean', I('Clean up', 'Nettoyage'), [
            T('fps', 2648, 'win_telemetry', 'Telemetry optimization', 'Télémétrie',
              'Turns off telemetry, scheduled tasks and Edge update services.',
              'Coupe la télémétrie, des tâches planifiées et les services de mise à jour d\'Edge.', risk='advanced'),
            T('fps', 3008, 'win_optimize', 'Optimize Windows', 'Optimiser Windows',
              'General Windows settings: notifications, tips, background apps.',
              'Réglages généraux : notifications, astuces, applis en arrière-plan.'),
            T('fps', 3099, 'win_diag', 'Disable diagnostics', 'Couper les diagnostics',
              'Turns off diagnostic services and logs.', 'Coupe les services et journaux de diagnostic.'),
            T('fps', 3140, 'win_services', 'Disable useless services', 'Couper les services inutiles',
              'Turns off Windows services most players don\'t use.', 'Coupe des services Windows que la plupart des joueurs n\'utilisent pas.',
              risk='advanced'),
            T('fps', 3175, 'win_apps', 'Remove useless apps', 'Supprimer les applis inutiles',
              'Uninstalls preinstalled Windows apps.', 'Désinstalle des applis Windows préinstallées.', risk='advanced'),
            T('fps', 3084, 'win_store', 'Disable Microsoft Store', 'Couper le Microsoft Store',
              'Turns off the Store and its automatic updates.', 'Coupe le Store et ses mises à jour automatiques.', risk='advanced'),
        ]),
        ('security', I('Security', 'Sécurité'), [
            T('fps', 2621, 'win_coreiso', 'Core isolation', 'Isolation du noyau',
              'Turns memory integrity (HVCI) on or off. Off can add FPS but lowers protection.',
              'Active ou coupe l\'intégrité de la mémoire (HVCI). Coupée, elle peut donner des FPS mais protège moins.',
              risk='advanced', variants=ONOFF, revert='on'),
            T('fps', 2955, 'win_mitigations', 'Disable mitigations', 'Couper les protections CPU',
              'Turns off Spectre, Meltdown and other CPU security mitigations.',
              'Coupe les protections Spectre, Meltdown et autres failles CPU.', risk='advanced'),
            T('fps', 3093, 'win_smartscreen', 'Disable SmartScreen', 'Couper SmartScreen',
              'Turns off the SmartScreen check on downloads.', 'Coupe la vérification SmartScreen des téléchargements.', risk='advanced'),
            T('fps', 3127, 'win_hyperv', 'Disable Hyper-V', 'Couper Hyper-V', 'Turns off Hyper-V and virtualization services.',
              'Coupe Hyper-V et les services de virtualisation.', risk='advanced'),
            T('fps', 2948, 'win_bluetooth', 'Disable Bluetooth', 'Couper le Bluetooth',
              'Turns off Bluetooth services.', 'Coupe les services Bluetooth.', risk='advanced',
              confirm=I('Bluetooth headsets, controllers and mice stop working until you turn it back on.',
                        'Les casques, manettes et souris Bluetooth ne marchent plus tant que tu ne le réactives pas.')),
        ]),
    ]),
]

PRESETS = [
    ('mc_pvp', I('Minecraft PvP'), I('Hitreg, ping and raw input for Minecraft PvP.', 'Hitreg, ping et entrées brutes pour le PvP Minecraft.'),
     ['ping_hitreg:hypixel', 'ping_packets:hitreg', 'ping_main:config1', 'in_driver', 'in_adapter', 'in_windows', 'in_mouse', 'in_keyboard',
      'in_queue:low', 'win_gamemode:on', 'win_gamedvr', 'win_fullscreen']),
    ('fps', I('Max FPS', 'FPS max'), I('Graphics card, CPU and power tuned for frames.', 'Carte graphique, CPU et alimentation réglés pour les FPS.'),
     ['gpu_nvidia', 'gpu_amd', 'gpu_intel', 'gpu_general', 'gpu_directx', 'cpu_amd', 'cpu_intel', 'sys_priority', 'sys_ram',
      'pow_main', 'pow_saving', 'sys_usb', 'win_visual', 'win_gamemode:on', 'win_gamedvr']),
    ('latency', I('Low latency', 'Latence minimale'), I('Input lag first: drivers, timers and input queues.', 'L\'input lag d\'abord : pilotes, minuteurs et files d\'entrée.'),
     ['in_driver', 'in_adapter', 'in_windows', 'in_frames:lowest', 'in_mouse', 'in_keyboard', 'in_queue:ultra', 'sys_latency',
      'sys_csrss', 'sys_time', 'gpu_directx']),
]
# où vont les modules v6 dans l'ancien catalogue
INTO = {'network': 'network', 'hitreg': 'hitreg', 'gpu': 'gpu', 'system': 'latency', 'windows': 'windows'}
# réglages de l'ancien programme remplacés par leur équivalent v6 (même id ou même effet)
REPLACED = {'win_diag', 'win_bluetooth', 'win_smartscreen', 'win_gamemode', 'gpu_general', 'sto_defrag',
            'dbl_gamedvr', 'exp_gamedvr', 'exp_mitigations', 'dbl_hyperv', 'exp_hyperv', 'win_animations', 'win_fse',
            'kbm_queue'}
RENAMED = {'dbl_gamedvr': 'win_gamedvr', 'exp_gamedvr': 'win_gamedvr', 'kbm_queue': 'in_queue', 'win_fse': 'win_fullscreen',
           'win_animations': 'win_visual'}
QUEUE_VARIANTS = {'Ultra Low': ('ultra', 'Ultra low', 'Ultra basse'), 'Low': ('low', 'Low', 'Basse'),
                  'Balanced': ('balanced', 'Balanced', 'Équilibrée'), 'Default': ('default', 'Default', 'Par défaut')}


# variante qui remet Windows d'origine, ouverte en gratuit (rempli par les T(..., revert=) et complété ici)
REVERT = {'game_mode': 'off', 'rbw_mode': 'on'}

# corrections de lignes précises (vérification du 2026-10-07, verification/ecarts/app.md) : (avant, après ou None)
SCRIPT_FIXES = {
    'in_windows': [
        ('powercfg import "C:\\ExcusesFN"', None),  # fichier du PC de l'auteur
        ('C:\\Users\\justin\\AppData\\Local\\Temp', '%LOCALAPPDATA%\\Temp'),
        ('\r\n/s /f /q c:\\windows\\temp\\*.*', '\r\ndel /s /f /q c:\\windows\\temp\\*.*'),  # « del » perdu
    ],
    'in_advanced': [("-Description 'Risxn Restore Point'", "-Description 'Rago Optimizer restore point'")],
    'sys_bcdedit': [('bcdedit /deletevalue useplatformclockJ', 'bcdedit /deletevalue useplatformclock')],
    # ProfilesDirectory vaut « %SystemDrive%\Users » non développé : la boucle sur les profils ne tournait jamais
    'sto_general': [('for /f "tokens=3 delims=\\ " %%A in (\'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList" ^| findstr /i "ProfilesDirectory"\') do set "PROFILES_DIR=%%A"',
                     'for /f "skip=2 tokens=2,*" %%A in (\'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList" /v ProfilesDirectory\') do call set "PROFILES_DIR=%%B"')],
    'rst_queue': [('/d "80"', '/d "100"')],
    'game_mode:on': [('echo Optimimizing', 'echo Optimizing')],
    'in_queue:default': [('/d "32"', '/d "100"')],  # « Default » = la valeur de Windows
}
# lignes retirées : fenêtres qui bloquent le script tant qu'on ne les ferme pas, marques tierces
DROP_LINES = [
    (('win_visual', 'win_apps'), r'MessageBox\]::Show'),
    (('win_visual',), r'^\s*%windir%\\system32\\SystemPropertiesPerformance\.exe\s*$'),
]
RBW_ON_EXTRA = '\n'.join([
    'echo - BAM, DAM and Prefetch back on (active after a restart)',
    r'reg add "HKLM\SYSTEM\CurrentControlSet\Services\bam" /v "Start" /t REG_DWORD /d "1" /f >nul',
    r'reg add "HKLM\SYSTEM\CurrentControlSet\Services\dam" /v "Start" /t REG_DWORD /d "1" /f >nul',
    r'reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d "3" /f >nul',
    r'reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d "3" /f >nul',
])

# Ce que le joueur doit lire avant de lancer : déduit du script, pour que rien de lourd ne passe sans être annoncé.
WARNINGS = [
    (r'FeatureSettingsOverride"?\s+/t\s+REG_DWORD\s+/d\s+"?3', 'Turns off the Spectre and Meltdown protections.',
     'Coupe les protections Spectre et Meltdown.'),
    (r'Set-ProcessMitigation\s+-System\s+-Disable', 'Turns off the system-wide exploit protections.',
     'Coupe les protections contre les exploits de tout le système.'),
    (r'hypervisorlaunchtype\s+off|vsmlaunchtype\s+off', 'Turns off Hyper-V and virtualization-based security (VBS).',
     'Coupe Hyper-V et la sécurité basée sur la virtualisation (VBS).'),
    (r'bcdedit\s+/set\s+(\{current\}\s+)?nx\s+(OptOut|AlwaysOff)', 'Weakens Data Execution Prevention (DEP).',
     'Affaiblit la prévention de l\'exécution des données (DEP).'),
    (r'disableelamdrivers\s+yes', 'Turns off the early-launch anti-malware drivers.',
     'Coupe les pilotes anti-malware lancés au démarrage.'),
    (r'HypervisorEnforcedCodeIntegrity"?\s+/v\s+"?Enabled"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'Off turns off memory integrity (core isolation).',
     'Désactivé coupe l\'intégrité de la mémoire (isolation du noyau).'),
    (r'DmaRemappingCompatible"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'Removes the protection against attacks through Thunderbolt and PCIe devices (DMA).',
     'Retire la protection contre les attaques par périphériques Thunderbolt et PCIe (DMA).'),
    (r'DisableRealtimeMonitoring"?\s+/t\s+REG_DWORD\s+/d\s+"?1|TamperProtection"?\s+/t\s+REG_DWORD\s+/d\s+"?0|DisableAntiSpyware"?\s+/t\s+REG_DWORD\s+/d\s+"?1',
     'Turns off Microsoft Defender real-time protection.', 'Coupe la protection en temps réel de Microsoft Defender.'),
    (r'EnableSmartScreen"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'Turns off SmartScreen, which checks the files you download.',
     'Coupe SmartScreen, qui vérifie les fichiers téléchargés.'),
    (r'EnableLUA"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'Turns off UAC, the admin permission prompts.',
     'Coupe l\'UAC, les demandes d\'autorisation administrateur.'),
    (r'NoAutoUpdate"?\s+/t\s+REG_DWORD\s+/d\s+"?1', 'Turns off automatic Windows updates.',
     'Coupe les mises à jour automatiques de Windows.'),
    (r'advfirewall\s+reset', 'Resets the Windows Firewall: your custom rules are deleted.',
     'Réinitialise le pare-feu Windows : tes règles personnalisées sont supprimées.'),
    (r'winsock\s+reset', 'Resets Winsock and the network settings.', 'Réinitialise Winsock et les réglages réseau.'),
    (r'Image File Execution Options\\\*', 'Deletes every Image File Execution Options entry (per-program debugger and protection settings).',
     'Supprime toutes les entrées Image File Execution Options (débogueur et protections par programme).'),
    (r'Services\\bam"?\s+/v\s+"?Start"?\s+/t\s+REG_DWORD\s+/d\s+"?4',
     'Turns off BAM, which logs the programs you ran. On a screenshare that can look like erased traces: turn on RBW Mod and restart your PC before one.',
     'Coupe BAM, qui garde la trace des programmes lancés. Sur un screenshare, ça peut ressembler à des traces effacées : active le RBW Mod et redémarre ton PC avant.'),
    (r'EnablePrefetcher"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'Stops Prefetch from filling. On a screenshare that can look like erased traces: turn on RBW Mod and restart your PC before one.',
     'Le Prefetch ne se remplit plus. Sur un screenshare, ça peut ressembler à des traces effacées : active le RBW Mod et redémarre ton PC avant.'),
    (r'^(?!\s*echo).*(del|forfiles|rd)\b.*\\prefetch', 'Clears the Prefetch folder, which a screenshare can read as wiped traces.',
     'Vide le dossier Prefetch, ce qu\'un screenshare peut lire comme des traces effacées.'),
    (r'Clear-RecycleBin', 'Empties the Recycle Bin.', 'Vide la Corbeille.'),
    (r'RunMRU|TypedPaths|OpenSavePidlMRU', 'Clears your recent files and Run history.', 'Efface tes fichiers récents et l\'historique Exécuter.'),
]
# avertissements écrits à la main, gardés devant ceux du script
KEEP_CONFIRM = {'win_bluetooth', 'dbl_edge', 'dbl_onedrive'}

# sections homonymes de l'ancien programme et des .bat v6 réunies (« Tout garder » : on regroupe, on ne retire rien)
MOVE = {'cpu_amd': 'cpu', 'cpu_intel': 'cpu', 'cpu_advanced': 'cpu', 'sys_latency': 'cpu',
        'sys_priority': 'priority', 'sys_csrss': 'priority', 'sys_ram': 'memory', 'sys_registry': 'memory',
        'pow_main': 'power', 'pow_ultimate': 'power', 'pow_saving': 'power', 'sys_time': 'power', 'sys_bcdedit': 'power',
        'sto_general': 'storage', 'sto_ntfs': 'storage', 'sto_fsutil_v6': 'storage', 'sto_fsutil2': 'storage',
        'sto_defrag': 'storage', 'sys_usb': 'usb',
        'win_telemetry': 'clean', 'win_optimize': 'clean', 'win_diag': 'clean', 'win_services': 'clean',
        'win_apps': 'clean', 'win_store': 'clean'}
SECTION_NAMES = {('windows', 'clean'): I('Clean up', 'Nettoyage')}
# noms en double entre les deux programmes
NAMES = {
    'sys_csrss': I('CSRSS priority (high)', 'Priorité CSRSS (haute)'),
    'pri_csrss': I('CSRSS priority (registry)', 'Priorité CSRSS (registre)'),
    'kbm_csrss': I('CSRSS realtime', 'CSRSS en temps réel'),
    'pow_saving': I('Drive idle power', 'Veille des disques'),
    'pow_storage': I('NVMe idle states', 'États de veille NVMe'),
    'sys_bcdedit': I('Boot timers (BCD)', 'Minuteurs de démarrage (BCD)'),
    'exp_bios': I('Boot security (BCD)', 'Sécurité du démarrage (BCD)'),
    'exp_autologgers': I('Disable autologgers (extended)', 'Couper les autologgers (étendu)'),
}
UK_US = [('Optimise', 'Optimize'), ('optimise', 'optimize'), ('Optimisation', 'Optimization'), ('optimisation', 'optimization'),
         ('behaviour', 'behavior'), ('prioritise', 'prioritize'), ('Prioritise', 'Prioritize')]


def postprocess(modules, scripts):
    # GUID de l'auteur ou clé « {NIC-ID} » laissée telle quelle (net_server, ancien programme) : toutes les cartes
    for tid, variants in scripts.items():
        for v, body in variants.items():
            sep = '\r\n' if '\r\n' in body else '\n'
            out = []
            for l in body.split(sep):
                if IFACE_GUID.match(l):
                    l = repair(l)
                l = re.sub(r'(/f)%$', r'\1', l)  # « /f% » : reste d'un copier-coller
                if out and l == out[-1] and l.lstrip().lower().startswith('for '):
                    continue
                out.append(l)
            variants[v] = sep.join(out)
    for key, fixes in SCRIPT_FIXES.items():
        tid, _, vid = key.partition(':')
        for v in ([vid] if vid else list(scripts[tid])):
            for before, after in fixes:
                if after is None:
                    before += '\r\n' if '\r\n' in scripts[tid][v] else '\n'
                elif '\r\n' not in scripts[tid][v]:
                    before, after = before.replace('\r\n', '\n'), after.replace('\r\n', '\n')
                assert before in scripts[tid][v], (key, before)
                scripts[tid][v] = scripts[tid][v].replace(before, after or '')
    for ids, pat in DROP_LINES:
        for tid in ids:
            for v, body in scripts[tid].items():
                sep = '\r\n' if '\r\n' in body else '\n'
                kept = [l for l in body.split(sep) if not re.search(pat, l, re.I)]
                assert len(kept) < len(body.split(sep)), (tid, pat)
                scripts[tid][v] = sep.join(kept)
    sep = '\r\n' if '\r\n' in scripts['rbw_mode']['on'] else '\n'
    scripts['rbw_mode']['on'] += sep + RBW_ON_EXTRA.replace('\n', sep)

    tweaks = {t['id']: t for m in modules for sec in m['sections'] for t in sec['tweaks'] if 'id' in t}
    for tid, t in tweaks.items():
        body = '\n'.join(scripts.get(tid, {}).values())
        lines = [l for l in body.replace('\r\n', '\n').split('\n') if not re.match(r'\s*(rem |::)', l, re.I)]
        if 'wmic' in body.lower() and 'wmic' not in t.get('requires', []):
            t['requires'] = t.get('requires', []) + ['wmic']
        hits = [(en, fr) for pat, en, fr in WARNINGS if any(re.search(pat, l, re.I) for l in lines)]
        if hits:
            if not tid.startswith('rst_'):
                t['risk'] = 'advanced'
            own = [(t['confirm']['en'], t['confirm']['fr'])] if tid in KEEP_CONFIRM and t.get('confirm') else []
            t['confirm'] = I(' '.join(e for e, _ in own + hits), ' '.join(f for _, f in own + hits))
        elif tid not in KEEP_CONFIRM:
            t.pop('confirm', None)
        if tid in REVERT:
            for v in t['variants']:
                if v['id'] == REVERT[tid]:
                    v['revert'] = True
        if tid in NAMES:
            t['name'] = NAMES[tid]
        for a, b in UK_US:
            t['name']['en'] = t['name']['en'].replace(a, b)
            t['desc']['en'] = t['desc']['en'].replace(a, b)
    tweaks['rbw_mode']['desc'] = I(
        'On restarts the services screenshare tools check (Event Log, SysMain, PCA, Scheduler) and turns BAM and Prefetch back on '
        'after a restart. Off sets the services back to manual after your session.',
        'Activé relance les services que vérifient les outils de screenshare (journal d\'événements, SysMain, PCA, Planificateur) '
        'et remet BAM et le Prefetch après un redémarrage. Désactivé repasse les services en manuel après ta session.')
    # BAM est un pilote et le Prefetcher se relit au démarrage : sans redémarrage, « On » ne remet rien de visible.
    # « Off » ne fait que repasser des services en manuel : pas de redémarrage.
    tweaks['rbw_mode']['reboot'] = False
    for v in tweaks['rbw_mode']['variants']:
        v['reboot'] = v['id'] == 'on'
    tweaks['rst_queue']['desc'] = I('Puts the mouse and keyboard queues back to 100, the Windows default.',
                                    'Remet les files souris et clavier à 100, la valeur de Windows.')

    for m in modules:
        if m['id'] == 'expert':
            m['tagline'] = I('Kernel, boot and security settings. Powerful, use knowingly.',
                             'Noyau, démarrage et sécurité. Puissant, à utiliser en connaissance de cause.')
        if m['id'] not in ('latency', 'windows'):
            continue
        secs = {sec['id']: sec for sec in m['sections']}
        moved = []
        for sec in m['sections']:
            if sec['id'].startswith('v6_'):
                moved += [(MOVE[t['id']], t) for t in sec['tweaks'] if t.get('id') in MOVE]
                sec['tweaks'] = [t for t in sec['tweaks'] if t.get('id') not in MOVE]
        for target, t in reversed(moved):
            secs[target]['tweaks'].insert(0, t)
        m['sections'] = [sec for sec in m['sections'] if sec['tweaks']]
        for sec in m['sections']:
            if (m['id'], sec['id']) in SECTION_NAMES:
                sec['name'] = SECTION_NAMES[(m['id'], sec['id'])]
    twins(modules, scripts)


def twins(modules, scripts):
    """Réglages au script identique (hors echo et commentaires), gardés dans chaque module (« tout garder ») :
    même niveau de risque, une phrase qui le dit, et `twin` pour que l'app ne lance le script qu'une fois."""
    where = [(t, m) for m in modules for sec in m['sections'] for t in sec['tweaks'] if 'id' in t]

    def key(tid):
        if tid not in scripts:
            return None
        norm = []
        for v in sorted(scripts[tid]):
            body = [l.strip().lower() for l in scripts[tid][v].replace('\r\n', '\n').split('\n')]
            norm.append(v + '=' + '\n'.join(l for l in body if l and not re.match(r'(echo\b|rem |::|@echo)', l)))
        return '\x00'.join(norm)

    groups = {}
    for t, m in where:
        k = key(t['id'])
        if k:
            groups.setdefault(k, []).append((t, m))
    for group in groups.values():
        if len(group) < 2:
            continue
        first = group[0][0]['id']
        risk = 'advanced' if any(t['risk'] == 'advanced' for t, _ in group) else 'safe'
        confirm = next((t['confirm'] for t, _ in group if t.get('confirm')), None)
        reboot = any(t['reboot'] for t, _ in group)
        for t, _ in group:
            t['risk'], t['reboot'], t['twin'] = risk, reboot, first
            if confirm:
                t['confirm'] = confirm
            others = [(o, om) for o, om in group if o is not t]
            en = ', '.join(f"{o['name']['en']} ({om['name']['en']})" for o, om in others)
            fr = ', '.join(f"{o['name']['fr']} ({om['name']['fr']})" for o, om in others)
            t['desc'] = I(t['desc']['en'].rstrip() + f' Same commands as {en}: selecting both runs them once.',
                          t['desc']['fr'].rstrip() + f' Mêmes commandes que {fr} : cochés ensemble, ils ne s\'appliquent qu\'une fois.')


def sections_of(name):
    lines = open(os.path.join(V6, FILES[name]), encoding='utf-8', errors='replace').read().replace('\r', '').split('\n')
    out = []
    for i, l in enumerate(lines, 1):
        m = HEADER.match(l)
        if m:
            out.append({'title': m.group(1), 'line': i, 'body': []})
        elif out:
            out[-1]['body'].append(l)
    return out


DEVPRIO = re.compile(r'^(\s*)reg(?:\.exe)?\s+add\s+("[^"]+")\s+/v\s+"?(DevicePriority|MessageNumberLimit)"?\s+/f\s*$', re.I)
IFACE_GUID = re.compile(r'^\s*reg(?:\.exe)?\s+add\s+"HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters'
                        r'\\Interfaces\\(?:\{?[0-9A-F]{8}-[0-9A-F-]{27}\}?|\{NIC-ID\})"(.*)$', re.I)


def repair(l):
    """Défauts déjà corrigés dans l'ancien .bat (docs/CORRECTIONS.md), revenus dans les .bat v6."""
    # reg add sans /t ni /d : écrit une chaîne vide ; les messages du .bat disent de supprimer ces valeurs
    m = DEVPRIO.match(l)
    if m:
        return f'{m.group(1)}reg delete {m.group(2)} /v "{m.group(3)}" /f >nul 2>&1'
    # GUID de carte réseau du PC de l'auteur : appliqué à toutes les cartes du joueur
    m = IFACE_GUID.match(l)
    if m:
        return ('for /f "delims=" %%g in (\'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"\') '
                f'do reg add "%%g"{m.group(1).rstrip()} >nul 2>&1')
    # boucle for dont le bloc n'était pas rattaché (cf. extract_bat.fix_line, point 6)
    return re.sub(r'(do set "str=%%i")\s*\($', r'\1 & (', l)


def clean(body):
    keep = []
    for l in body:
        s = l.strip()
        if not s or s.startswith('---') or re.match(r'^(cls|pause|timeout|color)\b', s, re.I) or re.match(r'^:(?!:)\s*[A-Za-z]', s):
            continue
        if 'extremelatencylow.nip' in s and s.lower().startswith('start'):
            l = NIP
        elif not re.match(r'(echo|::|rem )', s, re.I):
            # même rechercher/remplacer cassé que dans l'ancien .bat : « Disable » devenu « Disabling »
            l = l.replace('Disabling', 'Disable').replace('Enabling', 'Enable')
            # USER_SID n'est défini nulle part : le moteur tourne sous le compte du joueur
            l = l.replace('HKU\\!USER_SID!\\', 'HKCU\\')
            l = repair(l)
        if keep and l.rstrip() == keep[-1] and l.lstrip().lower().startswith('for '):
            continue  # deux GUID de l'auteur deviennent la même boucle
        keep.append(l.rstrip())
    return LegacyBat._fix_blocks('\n'.join(keep)).replace('\n', '\r\n')


def split_variants(body, spec, prefix=False):
    cut = {}
    for vid, _, _, pat, *_ in spec:
        idx = next((i for i, l in enumerate(body) if re.search(pat, l)), None)
        assert idx is not None, pat
        cut[vid] = idx
    order = sorted(cut.items(), key=lambda kv: kv[1])
    res = {}
    head = body[:order[0][1]] if prefix else []
    for n, (vid, start) in enumerate(order):
        end = order[n + 1][1] if n + 1 < len(order) else len(body)
        res[vid] = clean(head + body[start + 1:end])
    return res


V6_NOTES = '''

# Corrections apportées aux .bat v6 (Ping Optimization Final, HITREG INPUTLAG, FPS)

Ajouté par `tools/build_catalog_v6.py` après la section v5.2 ci-dessus. Les trois .bat de Sofiene
(`legacy/v6/`, 2026-10-06) rejoignent l'ancien programme : 226 réglages au total.

Défauts de la v5.2 revenus dans les .bat v6, corrigés de la même façon (`repair`, `clean`) :
- `reg add ... /v DevicePriority|MessageNumberLimit /f` sans valeur → `reg delete` ;
- boucles `for ... do set "str=%%i" (` détachées de leur corps → `& (` et bloc refermé ;
- GUID de carte réseau du PC de l'auteur, ou clé littérale `Interfaces\\{NIC-ID}` (net_server) → boucle sur toutes les cartes ;
- « Disabling » / « Enabling » remis en « Disable » / « Enable » hors echo, `USER_SID` jamais défini → `HKCU`, chemin du profil .nip sur le bureau de l'auteur ;
- `/f%` en fin de ligne (copier-coller).

Corrections ciblées (`SCRIPT_FIXES`, `DROP_LINES`) :
- in_windows : import d'un plan d'alimentation `C:\\ExcusesFN` (fichier de l'auteur) retiré, dossier Temp de « justin » → `%LOCALAPPDATA%\\Temp`, ligne `/s /f /q` sans son `del` ;
- in_advanced : point de restauration « Risxn » renommé « Rago Optimizer restore point » ;
- win_visual, win_apps : fenêtres MessageBox et SystemPropertiesPerformance.exe qui bloquaient le script, retirées ;
- sys_bcdedit : faute `useplatformclockJ` ;
- sto_general : `PROFILES_DIR` lu non développé, la boucle sur les profils ne tournait jamais ;
- rst_queue et in_queue « Default » : 80 et 32 → 100, la valeur de Windows ;
- game_mode : faute « Optimimizing ».

Profils exclusifs découpés en variantes (ils s'exécutaient tous à la suite) : ping_hitreg (6 profils dont Default),
ping_packets (Hitreg, QoS, Knockback), ping_main (Config 1 à 4), sys_ram (selon la RAM).

RBW Mod « On » remet aussi BAM, DAM et le Prefetcher (actifs après redémarrage, demandé par l'app pour cette variante).

Les actions lourdes ne sont pas retirées (choix de Sofiene, « tout garder ») : `WARNINGS` les détecte dans chaque
script (Spectre, Defender, SmartScreen, UAC, pare-feu, IFEO, BAM, Prefetch…), écrit l'avertissement « Read this first »
et passe le réglage en Advanced.
'''


def main():
    secs = {k: sections_of(k) for k in FILES}
    by_line = {k: {s['line']: n for n, s in enumerate(v)} for k, v in secs.items()}
    scripts, modules = {}, []
    used = set()
    for mid, icon, name, tagline, sections in MODULES:
        msecs = []
        for sid, sname, tws in sections:
            items = []
            for t in tws:
                n = by_line[t['file']][t['line']]
                sec = secs[t['file']][n]
                used.add((t['file'], t['line']))
                entry = {k: t[k] for k in ('id', 'name', 'desc', 'risk', 'reboot', 'requires')}
                entry['kind'] = 'tweak'
                if t['confirm']:
                    entry['confirm'] = t['confirm']
                entry['legacy'] = [f"{FILES[t['file']]}@{t['line']}"]
                if t['variants']:
                    scripts[t['id']] = split_variants(sec['body'], t['variants'], t['prefix'])
                    entry['variants'] = [{'id': v[0], 'label': I(v[1], v[2]), **({'auto': v[4]} if len(v) > 4 else {})}
                                         for v in t['variants']]
                elif t['absorb']:
                    sub = secs[t['file']][n + 1:n + 1 + t['absorb']]
                    scripts[t['id']] = {}
                    entry['variants'] = []
                    for s in sub:
                        used.add((t['file'], s['line']))
                        vid, en, fr = QUEUE_VARIANTS[s['title']]
                        scripts[t['id']][vid] = clean(s['body'])
                        entry['variants'].append({'id': vid, 'label': I(en, fr)})
                else:
                    scripts[t['id']] = {'_': clean(sec['body'])}
                if t['default']:
                    entry['defaultVariant'] = t['default']
                if t['revert']:
                    REVERT[t['id']] = t['revert']
                entry['lines'] = sum(len(s.split('\r\n')) for s in scripts[t['id']].values())
                for v in scripts[t['id']].values():
                    assert v.strip(), t['id']
                items.append(entry)
            msecs.append({'id': sid, 'name': sname, 'tweaks': items})
        modules.append({'id': mid, 'icon': icon, 'name': name, 'tagline': tagline, 'sections': msecs})

    # blocs non repris : titres vides (« Power Optimization » en double, en-têtes de chapitre)
    for k, v in secs.items():
        for s in v:
            if (k, s['line']) not in used:
                assert not clean(s['body']).strip() or s['title'] in QUEUE_VARIANTS, (k, s['line'], s['title'])

    # l'ancien programme, avec ses corrections, tel que le génère tools/build_catalog.py
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_catalog.py')], check=True)
    old = json.load(open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), encoding='utf-8'))
    old_scripts = json.load(open(os.path.join(ROOT, 'src-tauri', 'scripts', 'scripts.json'), encoding='utf-8'))
    assert not (set(old_scripts) & set(scripts)) - REPLACED, set(old_scripts) & set(scripts) - REPLACED
    for k, v in old_scripts.items():
        if k not in REPLACED:
            scripts[k] = v
    keep = lambda t: t.get('ref', t.get('id')) not in REPLACED
    merged = []
    for m in old['modules']:
        for sec in m['sections']:
            sec['tweaks'] = [t for t in sec['tweaks'] if keep(t)]
        m['sections'] = [sec for sec in m['sections'] if sec['tweaks']]
        for nm in modules:
            if INTO[nm['id']] == m['id']:
                m['sections'] = [{**sec, 'id': 'v6_' + sec['id']} for sec in nm['sections']] + m['sections']
        merged.append(m)
    modules = merged
    postprocess(modules, scripts)

    presets = [{'id': p, 'name': n, 'desc': d, 'tweaks': ts} for p, n, d, ts in PRESETS]
    for p in old['presets']:
        if p['id'] in ('laptop', 'privacy'):
            p['tweaks'] = [RENAMED.get(e.split(':')[0], e) if e.split(':')[0] in REPLACED else e for e in p['tweaks']]
            presets.append(p)
    ids = {t['id'] for m in modules for sec in m['sections'] for t in sec['tweaks'] if 'id' in t}
    for p in presets:
        for e in p['tweaks']:
            assert e.split(':')[0] in ids, (p['id'], e)
    catalog = {'version': 7, 'modules': modules, 'presets': presets}
    json.dump(catalog, open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(scripts, open(os.path.join(ROOT, 'src-tauri', 'scripts', 'scripts.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    n = sum(1 for m in modules for s in m['sections'] for t in s['tweaks'] if 'id' in t)
    with open(os.path.join(ROOT, 'docs', 'CORRECTIONS.md'), 'a', encoding='utf-8') as f:
        f.write(V6_NOTES)
    print(f'{n} réglages, {len(scripts)} scripts')


if __name__ == '__main__':
    main()
