"""Catalogue de Rago OS : chaque réglage est une liste d'actions typées (valeur de registre, tâche planifiée, type de
démarrage d'un service, application du Store, action native de l'app), jamais un script. Le moteur (src-tauri/src/os)
en déduit les trois opérations : detect (chaque action est-elle déjà à sa valeur ?), apply et revert (la valeur
d'origine relevée avant la première modification, ou son absence, est remise telle quelle).

Réimplémentation indépendante (option b, 21/10/2026) : chaque réglage est écrit à partir de la documentation publique
de Microsoft citée dans `source`. Rien n'est repris du Playbook d'AtlasOS (GPLv3) ni d'un autre projet.

    python3 tools/build_os_catalog.py

Écrit src/data/os.json, lu par l'interface et embarqué dans l'exe (os/catalog.rs).
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src', 'data', 'os.json')

# Builds de Windows 11 : 22000 (21H2), 22621 (22H2), 22631 (23H2), 26100 (24H2), 26200 (25H2)
W11 = 22000
W11_22H2 = 22621
W11_24H2 = 26100

ALL = ['competitive', 'balanced', 'streaming', 'minimal']
NOT_MINIMAL = ['competitive', 'balanced', 'streaming']

DOC = {
    'telemetry': 'https://learn.microsoft.com/windows/privacy/configure-windows-diagnostic-data-in-your-organization',
    'system_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-system',
    'privacy_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-privacy',
    'experience_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-experience',
    'manage_connections': 'https://learn.microsoft.com/windows/privacy/manage-connections-from-windows-operating-system-components-to-microsoft-services',
    'windowsai_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-windowsai',
    'news_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-newsandinterests',
    'start_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-start',
    'search_csp': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-search',
    'edge': 'https://learn.microsoft.com/deployedge/microsoft-edge-policies',
    'appx': 'https://learn.microsoft.com/powershell/module/appx/remove-appxpackage',
    'services': 'https://learn.microsoft.com/windows/application-management/per-user-services-in-windows',
    'services_guide': 'https://learn.microsoft.com/windows-server/security/windows-services/security-guidelines-for-disabling-system-services-in-windows-server',
    'gamemode': 'https://support.microsoft.com/windows/use-game-mode-while-gaming-on-your-pc-2a2a3a8d-2a2b-4f6d-9d73-46a2c71a6e8c',
    'hags': 'https://devblogs.microsoft.com/directx/hardware-accelerated-gpu-scheduling/',
    'gamedvr': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-applicationmanagement',
    'background': 'https://learn.microsoft.com/windows/client-management/mdm/policy-csp-privacy#letappsruninbackground',
    'mouse': 'https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-systemparametersinfow',
    'accessibility': 'https://learn.microsoft.com/windows/win32/winauto/stickykeys',
    'explorer': 'https://learn.microsoft.com/windows/win32/shell/folder-options',
    'taskbar': 'https://learn.microsoft.com/windows/configuration/taskbar/policy-settings',
    'personalize': 'https://learn.microsoft.com/windows/apps/desktop/modernize/apply-windows-themes',
    'accent': 'https://learn.microsoft.com/windows/apps/design/style/color',
    'wallpaper': 'https://learn.microsoft.com/windows/win32/api/shobjidl_core/nn-shobjidl_core-idesktopwallpaper',
    'lockscreen': 'https://learn.microsoft.com/uwp/api/windows.system.userprofile.lockscreen',
    'theme': 'https://learn.microsoft.com/windows/win32/controls/themesfileformat-overview',
    'oem': 'https://learn.microsoft.com/windows-hardware/customize/desktop/unattend/microsoft-windows-shell-setup-oeminformation',
    'powercfg': 'https://learn.microsoft.com/windows-hardware/design/device-experiences/powercfg-command-line-options',
    'fast_startup': 'https://learn.microsoft.com/troubleshoot/windows-client/setup-upgrade-and-drivers/disable-and-re-enable-hibernation',
    'end_task': 'https://support.microsoft.com/windows/end-task-from-the-taskbar-in-windows-11',
}


def T(en, fr):
    return {'en': en, 'fr': fr}


def reg(key, name, value, kind='dword'):
    """Valeur de registre posée par le réglage. `kind` : dword, sz ou binary (octets en hexadécimal)."""
    return {'do': 'reg', 'key': key, 'name': name, 'type': kind, 'value': value}


def task(path):
    return {'do': 'task', 'path': path, 'enabled': False}


def service(name, start='disabled'):
    return {'do': 'service', 'name': name, 'start': start}


def appx(name):
    return {'do': 'appx', 'name': name}


def native(what):
    return {'do': 'native', 'what': what}


CDM = r'HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
ADV = r'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
PERSONALIZE = r'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
DATACOLLECTION = r'HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection'


def palette(colors):
    """AccentPalette : 8 couleurs RRGGBB suivies d'un octet à 0, de la plus claire à la plus sombre."""
    return ''.join(c.lower() + '00' for c in colors)


def abgr(rgb):
    """Couleur DWORD 0xAABBGGRR (registre Accent et DWM), opaque."""
    r, g, b = rgb[0:2], rgb[2:4], rgb[4:6]
    return int('ff' + b + g + r, 16)


def argb(rgb, alpha='c4'):
    return int(alpha + rgb, 16)


# Couleurs de la charte (brand/tokens/tokens.json) : un seul rouge, beaucoup de noir. Les teintes sombres servent à la
# barre des tâches et au menu Démarrer : un noir légèrement rouge plutôt qu'un aplat rouge.
RED = 'FF3B30'
PALETTE = ['FFB4AE', 'FF8A82', 'FF5E55', RED, 'C9221A', '6B130E', '2E0A08', '2A2A30']

CATEGORIES = [
    {'id': 'privacy', 'icon': 'shield',
     'name': T('Telemetry and privacy', 'Télémétrie et confidentialité'),
     'lead': T('Windows sends the minimum your edition allows and stops building an ad profile.',
               "Windows envoie le minimum que ton édition permet et ne construit plus de profil publicitaire.")},
    {'id': 'ads', 'icon': 'megaphone',
     'name': T('Ads and suggestions', 'Publicités et suggestions'),
     'lead': T('No more sponsored apps, tips or promotions in Start, Settings and the lock screen.',
               "Plus d'applis sponsorisées, d'astuces ni de promotions dans Démarrer, les Paramètres et l'écran de verrouillage.")},
    {'id': 'ai', 'icon': 'sparkles',
     'name': T('AI and intrusive features', 'IA et fonctionnalités intrusives'),
     'lead': T('Copilot, Recall, Click to Do and Widgets stay off until you turn them back on.',
               "Copilot, Recall, Cliquer pour faire et les Widgets restent coupés tant que tu ne les rallumes pas.")},
    {'id': 'apps', 'icon': 'package',
     'name': T('Preinstalled apps', 'Applications préinstallées'),
     'lead': T('Removed for your account only, so each one can come back. The Store, Xbox, Calculator, Camera, Photos and media extensions stay.',
               "Retirées de ton compte seulement, pour pouvoir revenir. Le Store, Xbox, la Calculatrice, l'Appareil photo, Photos et les extensions média restent.")},
    {'id': 'services', 'icon': 'cog',
     'name': T('Services and scheduled tasks', 'Services et tâches planifiées'),
     'lead': T('Only what has no use on a gaming PC. Every service is listed with what it does.',
               "Seulement ce qui ne sert à rien sur un PC de jeu. Chaque service est listé avec ce qu'il fait.")},
    {'id': 'performance', 'icon': 'gauge',
     'name': T('Performance and gaming', 'Performances et jeu'),
     'lead': T('Settings Microsoft documents for games. Tweaks that are often placebo wait for a real before/after benchmark.',
               "Les réglages que Microsoft documente pour les jeux. Ceux qui sont souvent du placebo attendent un vrai test avant/après.")},
    {'id': 'explorer', 'icon': 'folder',
     'name': T('Explorer and taskbar', 'Explorateur et barre des tâches'),
     'lead': T('File extensions visible, a cleaner taskbar, and the classic right-click menu if you want it.',
               "Extensions de fichiers visibles, barre des tâches épurée et menu clic droit classique si tu le veux.")},
    {'id': 'brand', 'icon': 'palette',
     'name': T('Rago look', 'Look Rago'),
     'lead': T('Dark mode, Rago red, glass, wallpaper and lock screen, applied through Windows settings only.',
               "Mode sombre, rouge Rago, verre, fond d'écran et écran de verrouillage, uniquement par les réglages de Windows.")},
]

PROFILES = [
    {'id': 'competitive', 'icon': 'crosshair',
     'name': T('Competitive', 'Compétitif'),
     'lead': T('Everything that helps a desktop gaming PC, including the Rago power plan.',
               "Tout ce qui aide un PC de jeu fixe, plan d'alimentation Rago compris.")},
    {'id': 'balanced', 'icon': 'scale',
     'name': T('Balanced', 'Équilibré'),
     'lead': T('Clean and fast for gaming and everyday use, without touching power or background apps.',
               "Propre et rapide pour jouer et pour tous les jours, sans toucher à l'alimentation ni aux applis en arrière-plan.")},
    {'id': 'streaming', 'icon': 'radio',
     'name': T('Streaming', 'Streaming'),
     'lead': T('Like Balanced, and keeps Xbox Game Bar recording and Phone Link for your setup.',
               "Comme Équilibré, en gardant l'enregistrement de la Xbox Game Bar et Lien avec Windows.")},
    {'id': 'minimal', 'icon': 'laptop',
     'name': T('Minimal / laptop', 'Minimal / portable'),
     'lead': T('Privacy, cleanup and the Rago look, nothing that costs battery.',
               "Confidentialité, nettoyage et look Rago, rien qui coûte de la batterie.")},
]

TWEAKS = [
    # ------------------------------------------------------------------ confidentialité
    {'id': 'privacy.telemetry', 'category': 'privacy', 'profiles': ALL, 'reboot': 'restart', 'source': DOC['system_csp'],
     'name': T('Diagnostic data at the minimum', 'Données de diagnostic au minimum'),
     'desc': T('Sets diagnostic data to "Required", the lowest level Home and Pro accept, limits log and crash dump uploads, and stops feedback prompts.',
               "Règle les données de diagnostic sur « Obligatoires », le niveau le plus bas accepté par Home et Pro, limite l'envoi des journaux et des vidages mémoire, et coupe les demandes d'avis."),
     'actions': [reg(DATACOLLECTION, 'AllowTelemetry', 1),
                 reg(DATACOLLECTION, 'LimitDiagnosticLogCollection', 1),
                 reg(DATACOLLECTION, 'LimitDumpCollection', 1),
                 reg(DATACOLLECTION, 'DoNotShowFeedbackNotifications', 1),
                 reg(r'HKCU\Software\Microsoft\Siuf\Rules', 'NumberOfSIUFInPeriod', 0)]},
    {'id': 'privacy.diagtrack', 'category': 'privacy', 'profiles': ALL, 'reboot': 'restart', 'source': DOC['telemetry'],
     'name': T('Telemetry service off', 'Service de télémétrie coupé'),
     'desc': T('Disables "Connected User Experiences and Telemetry" (DiagTrack), the service that uploads diagnostic data. Windows Update, Defender and the Store don\'t use it.',
               "Désactive « Expériences des utilisateurs connectés et télémétrie » (DiagTrack), le service qui envoie les données de diagnostic. Windows Update, Defender et le Store ne s'en servent pas."),
     'actions': [service('DiagTrack')]},
    {'id': 'privacy.ceip', 'category': 'privacy', 'profiles': ALL, 'reboot': 'none', 'source': DOC['manage_connections'],
     'name': T('Experience improvement tasks off', "Tâches du programme d'amélioration coupées"),
     'desc': T('Turns off the Customer Experience Improvement Program and the scheduled tasks that collect app compatibility and disk diagnostic data. Missing tasks are skipped.',
               "Coupe le programme d'amélioration de l'expérience utilisateur et les tâches planifiées qui collectent la compatibilité des applis et le diagnostic du disque. Les tâches absentes sont ignorées."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\SQMClient\Windows', 'CEIPEnable', 0),
                 task(r'\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser'),
                 task(r'\Microsoft\Windows\Application Experience\ProgramDataUpdater'),
                 task(r'\Microsoft\Windows\Customer Experience Improvement Program\Consolidator'),
                 task(r'\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip'),
                 task(r'\Microsoft\Windows\Autochk\Proxy'),
                 task(r'\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector'),
                 task(r'\Microsoft\Windows\Feedback\Siuf\DmClient'),
                 task(r'\Microsoft\Windows\Feedback\Siuf\DmClientOnScenarioDownload')]},
    {'id': 'privacy.advertising-id', 'category': 'privacy', 'profiles': ALL, 'reboot': 'none', 'source': DOC['privacy_csp'],
     'name': T('Advertising ID off', 'Identifiant publicitaire coupé'),
     'desc': T('Apps can no longer use your advertising ID to show you targeted ads.',
               "Les applis ne peuvent plus utiliser ton identifiant publicitaire pour te cibler."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo', 'Enabled', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo', 'DisabledByGroupPolicy', 1)]},
    {'id': 'privacy.activity', 'category': 'privacy', 'profiles': ALL, 'reboot': 'none', 'source': DOC['privacy_csp'],
     'name': T('Activity history off', "Historique d'activité coupé"),
     'desc': T('Windows stops recording and uploading the apps, files and sites you open.',
               "Windows n'enregistre plus et n'envoie plus les applis, fichiers et sites que tu ouvres."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\System', 'EnableActivityFeed', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\System', 'PublishUserActivities', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\System', 'UploadUserActivities', 0)]},
    {'id': 'privacy.tailored', 'category': 'privacy', 'profiles': ALL, 'reboot': 'none', 'source': DOC['experience_csp'],
     'name': T('No suggestions based on your usage', "Pas de suggestions d'après ton usage"),
     'desc': T('Microsoft no longer uses your diagnostic data to personalize tips and offers, and Start no longer tracks which apps you launch.',
               "Microsoft n'utilise plus tes données de diagnostic pour personnaliser astuces et offres, et Démarrer ne suit plus les applis que tu lances."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Privacy', 'TailoredExperiencesWithDiagnosticDataEnabled', 0),
                 reg(r'HKCU\Software\Policies\Microsoft\Windows\CloudContent', 'DisableTailoredExperiencesWithDiagnosticData', 1),
                 reg(ADV, 'Start_TrackProgs', 0)]},
    {'id': 'privacy.typing', 'category': 'privacy', 'profiles': ALL, 'reboot': 'none', 'source': DOC['privacy_csp'],
     'name': T('Typing and inking data kept on the PC', 'Saisie et écriture manuscrite gardées sur le PC'),
     'desc': T('Windows stops collecting what you type and write to build a personal dictionary in the cloud, and turns off online speech recognition.',
               "Windows ne collecte plus ce que tu tapes et écris pour un dictionnaire personnel en ligne, et coupe la reconnaissance vocale en ligne."),
     'actions': [reg(r'HKCU\Software\Microsoft\InputPersonalization', 'RestrictImplicitInkCollection', 1),
                 reg(r'HKCU\Software\Microsoft\InputPersonalization', 'RestrictImplicitTextCollection', 1),
                 reg(r'HKCU\Software\Microsoft\InputPersonalization\TrainedDataStore', 'HarvestContacts', 0),
                 reg(r'HKCU\Software\Microsoft\Personalization\Settings', 'AcceptedPrivacyPolicy', 0),
                 reg(r'HKCU\Software\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy', 'HasAccepted', 0)]},
    {'id': 'privacy.search', 'category': 'privacy', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['search_csp'],
     'name': T('Start search stays on your PC', 'La recherche de Démarrer reste sur ton PC'),
     'desc': T('No more Bing results, search highlights or cloud content in Start search. Your files, apps and settings are still found.',
               "Plus de résultats Bing, de « temps forts » ni de contenu en ligne dans la recherche de Démarrer. Tes fichiers, applis et paramètres sont toujours trouvés."),
     'actions': [reg(r'HKCU\Software\Policies\Microsoft\Windows\Explorer', 'DisableSearchBoxSuggestions', 1),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings', 'IsDynamicSearchBoxEnabled', 0),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings', 'IsMSACloudSearchEnabled', 0),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings', 'IsAADCloudSearchEnabled', 0),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings', 'IsDeviceSearchHistoryEnabled', 0)]},

    # ------------------------------------------------------------------ publicités
    {'id': 'ads.start', 'category': 'ads', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['start_csp'],
     'name': T('No recommendations or promotions in Start', 'Pas de recommandations ni de promotions dans Démarrer'),
     'desc': T('Removes suggested apps, tips, new app promotions and account notifications from Start.',
               "Retire de Démarrer les applis suggérées, les astuces, les nouvelles applis mises en avant et les notifications de compte."),
     'actions': [reg(CDM, 'SubscribedContent-338388Enabled', 0),
                 reg(CDM, 'SystemPaneSuggestionsEnabled', 0),
                 reg(ADV, 'Start_IrisRecommendations', 0),
                 reg(ADV, 'Start_AccountNotifications', 0)]},
    {'id': 'ads.tips', 'category': 'ads', 'profiles': ALL, 'reboot': 'none', 'source': DOC['experience_csp'],
     'name': T('No tips and "finish setting up" screens', "Pas d'astuces ni d'écrans « terminer la configuration »"),
     'desc': T('Stops tips notifications, the welcome screen after updates and the reminders to finish setting up your PC with Microsoft services.',
               "Coupe les notifications d'astuces, l'écran d'accueil après les mises à jour et les rappels pour « terminer la configuration » avec les services Microsoft."),
     'actions': [reg(CDM, 'SubscribedContent-338389Enabled', 0),
                 reg(CDM, 'SubscribedContent-310093Enabled', 0),
                 reg(CDM, 'SoftLandingEnabled', 0),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\UserProfileEngagement', 'ScoobeSystemSettingEnabled', 0)]},
    {'id': 'ads.settings', 'category': 'ads', 'profiles': ALL, 'reboot': 'none', 'source': DOC['experience_csp'],
     'name': T('No suggested content in Settings', 'Pas de contenu suggéré dans les Paramètres'),
     'desc': T('Settings stops showing suggestions and offers at the top of its pages.',
               "Les Paramètres n'affichent plus de suggestions ni d'offres en haut des pages."),
     'actions': [reg(CDM, 'SubscribedContent-338393Enabled', 0),
                 reg(CDM, 'SubscribedContent-353694Enabled', 0),
                 reg(CDM, 'SubscribedContent-353696Enabled', 0)]},
    {'id': 'ads.silent-apps', 'category': 'ads', 'profiles': ALL, 'reboot': 'none', 'source': DOC['experience_csp'],
     'name': T('No sponsored apps installed by themselves', "Pas d'applis sponsorisées installées toutes seules"),
     'desc': T('Windows stops downloading promoted apps and games (the ones that appear in Start without asking).',
               "Windows ne télécharge plus les applis et jeux mis en avant (ceux qui apparaissent dans Démarrer sans rien demander)."),
     'actions': [reg(CDM, 'SilentInstalledAppsEnabled', 0),
                 reg(CDM, 'OemPreInstalledAppsEnabled', 0),
                 reg(CDM, 'PreInstalledAppsEnabled', 0),
                 reg(CDM, 'PreInstalledAppsEverEnabled', 0)]},
    {'id': 'ads.lockscreen', 'category': 'ads', 'profiles': ALL, 'reboot': 'none', 'source': DOC['experience_csp'],
     'name': T('No ads or "fun facts" on the lock screen', "Pas de pubs ni d'« anecdotes » sur l'écran de verrouillage"),
     'desc': T('Removes the tips, fun facts and promotions Windows Spotlight adds over the lock screen picture.',
               "Retire les astuces, anecdotes et promotions que Windows à la une ajoute sur l'image de l'écran de verrouillage."),
     'actions': [reg(CDM, 'RotatingLockScreenOverlayEnabled', 0),
                 reg(CDM, 'SubscribedContent-338387Enabled', 0)]},
    {'id': 'ads.explorer', 'category': 'ads', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['explorer'],
     'name': T('No OneDrive and Microsoft 365 ads in Explorer', 'Pas de pubs OneDrive et Microsoft 365 dans l\'Explorateur'),
     'desc': T('Explorer stops showing banners that push OneDrive and Microsoft 365. OneDrive keeps syncing if you use it.',
               "L'Explorateur n'affiche plus les bandeaux qui poussent OneDrive et Microsoft 365. OneDrive continue de synchroniser si tu l'utilises."),
     'actions': [reg(ADV, 'ShowSyncProviderNotifications', 0)]},
    {'id': 'ads.edge', 'category': 'ads', 'profiles': [], 'reboot': 'none', 'source': DOC['edge'],
     'name': T('Fewer Edge prompts', "Moins de sollicitations d'Edge"),
     'desc': T('Edge stops its first-run screens, its "make Edge your default" campaigns, shopping pop-ups and recommendations. Edge keeps working normally.',
               "Edge arrête ses écrans de premier lancement, ses campagnes « fais d'Edge ton navigateur par défaut », les fenêtres d'achat et les recommandations. Edge fonctionne normalement."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\Edge', 'HideFirstRunExperience', 1),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Edge', 'DefaultBrowserSettingsCampaignEnabled', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Edge', 'ShowRecommendationsEnabled', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Edge', 'EdgeShoppingAssistantEnabled', 0),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Edge', 'SpotlightExperiencesAndRecommendationsEnabled', 0)]},

    # ------------------------------------------------------------------ IA
    {'id': 'ai.copilot', 'category': 'ai', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['windowsai_csp'],
     'name': T('Copilot off', 'Copilot coupé'),
     'desc': T('Turns off Windows Copilot and its taskbar button. The Copilot app itself can be removed in Preinstalled apps.',
               "Coupe Copilot dans Windows et son bouton dans la barre des tâches. L'appli Copilot peut être retirée dans Applications préinstallées."),
     'actions': [reg(r'HKCU\Software\Policies\Microsoft\Windows\WindowsCopilot', 'TurnOffWindowsCopilot', 1),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot', 'TurnOffWindowsCopilot', 1),
                 reg(ADV, 'ShowCopilotButton', 0)]},
    {'id': 'ai.recall', 'category': 'ai', 'profiles': ALL, 'reboot': 'restart', 'minBuild': W11_24H2, 'source': DOC['windowsai_csp'],
     'name': T('Recall off', 'Recall coupé'),
     'desc': T('Recall no longer takes snapshots of your screen and can\'t be turned on. Only Copilot+ PCs have it.',
               "Recall ne prend plus de captures de ton écran et ne peut plus être activé. Seuls les PC Copilot+ l'ont."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsAI', 'DisableAIDataAnalysis', 1),
                 reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsAI', 'AllowRecallEnablement', 0)]},
    {'id': 'ai.clicktodo', 'category': 'ai', 'profiles': ALL, 'reboot': 'none', 'minBuild': W11_24H2, 'source': DOC['windowsai_csp'],
     'name': T('Click to Do off', 'Cliquer pour faire coupé'),
     'desc': T('Turns off Click to Do, which analyzes what\'s on your screen to suggest actions.',
               "Coupe « Cliquer pour faire », qui analyse ce qui est à l'écran pour proposer des actions."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsAI', 'DisableClickToDo', 1)]},
    {'id': 'ai.widgets', 'category': 'ai', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['news_csp'],
     'name': T('Widgets off', 'Widgets coupés'),
     'desc': T('Removes the Widgets board, its news feed and its taskbar button. The Rago widgets don\'t depend on it.',
               "Retire le panneau Widgets, son fil d'actualités et son bouton de la barre des tâches. Les widgets Rago n'en dépendent pas."),
     'actions': [reg(r'HKLM\SOFTWARE\Policies\Microsoft\Dsh', 'AllowNewsAndInterests', 0)]},

    # ------------------------------------------------------------------ services
    {'id': 'services.maps', 'category': 'services', 'profiles': ALL, 'reboot': 'none', 'source': DOC['services_guide'],
     'name': T('Offline maps service off', 'Service des cartes hors ligne coupé'),
     'desc': T('Disables "Downloaded Maps Manager" (MapsBroker) and its update tasks. Only the Maps app uses it.',
               "Désactive « Gestionnaire des cartes téléchargées » (MapsBroker) et ses tâches de mise à jour. Seule l'appli Cartes s'en sert."),
     'actions': [service('MapsBroker'),
                 task(r'\Microsoft\Windows\Maps\MapsUpdateTask'),
                 task(r'\Microsoft\Windows\Maps\MapsToastTask')]},
    {'id': 'services.retaildemo', 'category': 'services', 'profiles': ALL, 'reboot': 'none', 'source': DOC['services_guide'],
     'name': T('Store demo mode service off', 'Service du mode démo des magasins coupé'),
     'desc': T('Disables "Retail Demo Service", used only by PCs on display in shops.',
               "Désactive « Service de démonstration de vente au détail », utilisé seulement par les PC exposés en magasin."),
     'actions': [service('RetailDemo')]},
    {'id': 'services.fax', 'category': 'services', 'profiles': ALL, 'reboot': 'none', 'source': DOC['services_guide'],
     'name': T('Fax service off', 'Service de fax coupé'),
     'desc': T('Disables the Fax service when it\'s there. Printing and scanning keep working.',
               "Désactive le service Fax s'il est présent. L'impression et la numérisation continuent de marcher."),
     'actions': [service('Fax')]},
    {'id': 'services.wap', 'category': 'services', 'profiles': ALL, 'reboot': 'restart', 'source': DOC['services_guide'],
     'name': T('Device management push service off', 'Service de messages de gestion coupé'),
     'desc': T('Disables "Device Management Wireless Application Protocol Push" (dmwappushservice), used by company device management. Leave it on if your PC is managed by an employer or a school.',
               "Désactive « Service de routage de messages Push WAP » (dmwappushservice), utilisé par la gestion des PC d'entreprise. Garde-le si ton PC est géré par un employeur ou une école."),
     'actions': [service('dmwappushservice')]},

    # ------------------------------------------------------------------ performances
    {'id': 'perf.gamemode', 'category': 'performance', 'profiles': ALL, 'reboot': 'none', 'source': DOC['gamemode'],
     'name': T('Game Mode on', 'Mode Jeu activé'),
     'desc': T('Windows gives the game priority and holds Windows Update installs and notifications while you play.',
               "Windows donne la priorité au jeu et retient les installations de Windows Update et les notifications pendant la partie."),
     'actions': [reg(r'HKCU\Software\Microsoft\GameBar', 'AutoGameModeEnabled', 1),
                 reg(r'HKCU\Software\Microsoft\GameBar', 'AllowAutoGameMode', 1)]},
    {'id': 'perf.hags', 'category': 'performance', 'profiles': NOT_MINIMAL, 'reboot': 'restart', 'minBuild': 19041, 'source': DOC['hags'],
     'name': T('Hardware-accelerated GPU scheduling', 'Planification GPU accélérée'),
     'desc': T('Lets the graphics card schedule its own work (needed for DLSS Frame Generation). Ignored by Windows on cards that don\'t support it.',
               "La carte graphique planifie elle-même son travail (nécessaire à DLSS Frame Generation). Ignoré par Windows sur les cartes qui ne le gèrent pas."),
     'actions': [reg(r'HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers', 'HwSchMode', 2)]},
    {'id': 'perf.dvr-background', 'category': 'performance', 'profiles': ALL, 'reboot': 'none', 'source': DOC['gamedvr'],
     'name': T('No background recording', "Pas d'enregistrement en arrière-plan"),
     'desc': T('Xbox Game Bar stops recording the last minutes of your games in the background. Manual screenshots and clips still work.',
               "La Xbox Game Bar n'enregistre plus en continu les dernières minutes de tes parties. Les captures et clips manuels marchent toujours."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR', 'HistoricalCaptureEnabled', 0)]},
    {'id': 'perf.dvr-off', 'category': 'performance', 'profiles': ['competitive', 'minimal'], 'reboot': 'none', 'source': DOC['gamedvr'],
     'name': T('Game Bar capture off', 'Capture de la Game Bar coupée'),
     'desc': T('Turns off game capture in Xbox Game Bar. Keep it if you record with Game Bar instead of OBS or your GPU app.',
               "Coupe la capture des jeux dans la Xbox Game Bar. Garde-la si tu enregistres avec la Game Bar plutôt qu'avec OBS ou l'appli de ta carte graphique."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR', 'AppCaptureEnabled', 0),
                 reg(r'HKCU\System\GameConfigStore', 'GameDVR_Enabled', 0)]},
    {'id': 'perf.background-apps', 'category': 'performance', 'profiles': ['competitive'], 'reboot': 'none', 'source': DOC['background'],
     'name': T('Store apps stay closed in the background', "Applis du Store fermées en arrière-plan"),
     'desc': T('Store apps no longer run when you don\'t use them. Desktop programs (Discord, Steam) aren\'t affected.',
               "Les applis du Store ne tournent plus quand tu ne t'en sers pas. Les programmes classiques (Discord, Steam) ne sont pas concernés."),
     'warn': T('Store apps like WhatsApp or Spotify (Store version) won\'t notify you until you open them.',
               "Les applis du Store comme WhatsApp ou Spotify (version Store) ne t'envoient plus de notification tant que tu ne les ouvres pas."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications', 'GlobalUserDisabled', 1)]},
    {'id': 'perf.mouse', 'category': 'performance', 'profiles': ALL, 'reboot': 'none', 'refresh': ['mouse'], 'source': DOC['mouse'],
     'name': T('Mouse acceleration off', 'Accélération de la souris coupée'),
     'desc': T('Turns off "Enhance pointer precision": the pointer moves exactly as far as your hand, for consistent aim.',
               "Coupe « Améliorer la précision du pointeur » : le pointeur bouge exactement autant que ta main, pour une visée constante."),
     'actions': [reg(r'HKCU\Control Panel\Mouse', 'MouseSpeed', '0', 'sz'),
                 reg(r'HKCU\Control Panel\Mouse', 'MouseThreshold1', '0', 'sz'),
                 reg(r'HKCU\Control Panel\Mouse', 'MouseThreshold2', '0', 'sz')]},
    {'id': 'perf.sticky-keys', 'category': 'performance', 'profiles': ALL, 'reboot': 'none', 'refresh': ['accessibility'], 'source': DOC['accessibility'],
     'name': T('No Sticky Keys pop-up in game', 'Plus de fenêtre Touches rémanentes en jeu'),
     'desc': T('Pressing Shift five times (or holding it) no longer opens the Sticky, Filter and Toggle Keys pop-ups that pull you out of the game. The features stay available in Settings.',
               "Appuyer cinq fois sur Maj (ou la maintenir) n'ouvre plus les fenêtres Touches rémanentes, filtres et bascule qui te sortent du jeu. Les fonctions restent dans les Paramètres."),
     'actions': [reg(r'HKCU\Control Panel\Accessibility\StickyKeys', 'Flags', '506', 'sz'),
                 reg(r'HKCU\Control Panel\Accessibility\Keyboard Response', 'Flags', '122', 'sz'),
                 reg(r'HKCU\Control Panel\Accessibility\ToggleKeys', 'Flags', '58', 'sz')]},
    {'id': 'perf.powerplan', 'category': 'performance', 'profiles': ['competitive'], 'reboot': 'none', 'source': DOC['powercfg'],
     'name': T('Rago OS power plan', "Plan d'alimentation Rago OS"),
     'desc': T('Creates and turns on a "Rago OS" plan based on Windows\' High performance plan: the processor stays ready instead of waking up for each frame. Your previous plan comes back when Rago OS is turned off.',
               "Crée et active un plan « Rago OS » basé sur le plan Performances élevées de Windows : le processeur reste prêt au lieu de se réveiller à chaque image. Ton plan d'avant revient quand Rago OS est désactivé."),
     'warn': T('Uses more power. Not for laptops on battery.', "Consomme plus. Pas pour un portable sur batterie."),
     'actions': [native('powerplan')]},
    {'id': 'perf.fast-startup', 'category': 'performance', 'profiles': [], 'reboot': 'restart', 'source': DOC['fast_startup'],
     'name': T('Fast startup off', 'Démarrage rapide coupé'),
     'desc': T('"Shut down" then really shuts down: drivers and Windows start fresh each time. Startup can take a few seconds longer.',
               "« Arrêter » arrête alors vraiment le PC : pilotes et Windows repartent de zéro à chaque fois. Le démarrage peut prendre quelques secondes de plus."),
     'actions': [reg(r'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power', 'HiberbootEnabled', 0)]},

    # ------------------------------------------------------------------ explorateur
    {'id': 'explorer.extensions', 'category': 'explorer', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['explorer'],
     'name': T('File extensions visible', 'Extensions de fichiers visibles'),
     'desc': T('Shows .exe, .zip, .png… so you can tell a real file from a disguised one.',
               "Affiche .exe, .zip, .png… pour distinguer un vrai fichier d'un fichier déguisé."),
     'actions': [reg(ADV, 'HideFileExt', 0)]},
    {'id': 'explorer.hidden-files', 'category': 'explorer', 'profiles': [], 'reboot': 'explorer', 'source': DOC['explorer'],
     'name': T('Hidden files visible', 'Fichiers cachés visibles'),
     'desc': T('Shows hidden files and folders, like AppData. Windows system files stay hidden.',
               "Affiche les fichiers et dossiers cachés, comme AppData. Les fichiers système de Windows restent cachés."),
     'actions': [reg(ADV, 'Hidden', 1)]},
    {'id': 'explorer.this-pc', 'category': 'explorer', 'profiles': [], 'reboot': 'explorer', 'source': DOC['explorer'],
     'name': T('Explorer opens on This PC', "L'Explorateur s'ouvre sur Ce PC"),
     'desc': T('Explorer opens on your drives instead of Home.', "L'Explorateur s'ouvre sur tes disques au lieu de l'Accueil."),
     'actions': [reg(ADV, 'LaunchTo', 1)]},
    {'id': 'explorer.gallery', 'category': 'explorer', 'profiles': [], 'reboot': 'explorer', 'minBuild': W11_22H2, 'source': DOC['explorer'],
     'name': T('No Gallery in Explorer', "Pas de Galerie dans l'Explorateur"),
     'desc': T('Removes Gallery from Explorer\'s left pane. Your pictures don\'t move.',
               "Retire Galerie du volet gauche de l'Explorateur. Tes images ne bougent pas."),
     'actions': [reg(r'HKCU\Software\Classes\CLSID\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}', 'System.IsPinnedToNameSpaceTree', 0)]},
    {'id': 'explorer.context-menu', 'category': 'explorer', 'profiles': [], 'reboot': 'explorer', 'minBuild': W11, 'source': DOC['explorer'],
     'name': T('Classic right-click menu', 'Menu clic droit classique'),
     'desc': T('Right-click shows the full menu at once, without "Show more options".',
               "Le clic droit affiche tout le menu d'un coup, sans « Afficher d'autres options »."),
     'actions': [reg(r'HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32', '', '', 'sz')]},
    {'id': 'explorer.taskbar', 'category': 'explorer', 'profiles': ALL, 'reboot': 'explorer', 'source': DOC['taskbar'],
     'name': T('Clean taskbar', 'Barre des tâches épurée'),
     'desc': T('Hides the search box, Task View and Chat buttons. Search still opens with the Windows key or Win+S.',
               "Masque la zone de recherche et les boutons Vue des tâches et Conversation. La recherche s'ouvre toujours avec la touche Windows ou Win+S."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Search', 'SearchboxTaskbarMode', 0),
                 reg(ADV, 'ShowTaskViewButton', 0),
                 reg(ADV, 'TaskbarMn', 0)]},
    {'id': 'explorer.taskbar-left', 'category': 'explorer', 'profiles': [], 'reboot': 'explorer', 'minBuild': W11, 'source': DOC['taskbar'],
     'name': T('Taskbar icons on the left', 'Icônes de la barre des tâches à gauche'),
     'desc': T('Aligns the Start button and apps to the left, like before Windows 11.',
               "Aligne Démarrer et les applis à gauche, comme avant Windows 11."),
     'actions': [reg(ADV, 'TaskbarAl', 0)]},
    {'id': 'explorer.end-task', 'category': 'explorer', 'profiles': ALL, 'reboot': 'none', 'minBuild': 22631, 'source': DOC['end_task'],
     'name': T('"End task" in the taskbar', '« Fin de tâche » dans la barre des tâches'),
     'desc': T('Right-click a frozen game in the taskbar to close it, without opening Task Manager.',
               "Clic droit sur un jeu figé dans la barre des tâches pour le fermer, sans ouvrir le Gestionnaire des tâches."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings', 'TaskbarEndTask', 1)]},

    # ------------------------------------------------------------------ look Rago
    {'id': 'brand.dark', 'category': 'brand', 'profiles': ALL, 'reboot': 'none', 'refresh': ['immersive'], 'source': DOC['personalize'],
     'name': T('Dark mode everywhere', 'Mode sombre partout'),
     'desc': T('Windows and apps switch to dark mode, with transparency effects on for the glass look.',
               "Windows et les applis passent en mode sombre, avec les effets de transparence activés pour le verre."),
     'actions': [reg(PERSONALIZE, 'AppsUseLightTheme', 0),
                 reg(PERSONALIZE, 'SystemUsesLightTheme', 0),
                 reg(PERSONALIZE, 'EnableTransparency', 1)]},
    {'id': 'brand.accent', 'category': 'brand', 'profiles': ALL, 'reboot': 'explorer', 'refresh': ['immersive'], 'source': DOC['accent'],
     'name': T('Rago red accent', 'Accent rouge Rago'),
     'desc': T('Rago red (#FF3B30) becomes the Windows accent color: buttons, links, toggles, selection. Start and the taskbar take a deep red-tinted black.',
               "Le rouge Rago (#FF3B30) devient la couleur d'accent de Windows : boutons, liens, interrupteurs, sélection. Démarrer et la barre des tâches prennent un noir teinté de rouge."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent', 'AccentPalette', palette(PALETTE), 'binary'),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent', 'AccentColorMenu', abgr(RED)),
                 reg(r'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent', 'StartColorMenu', abgr(PALETTE[5])),
                 reg(r'HKCU\Software\Microsoft\Windows\DWM', 'AccentColor', abgr(RED)),
                 reg(r'HKCU\Software\Microsoft\Windows\DWM', 'ColorizationColor', argb(RED)),
                 reg(r'HKCU\Software\Microsoft\Windows\DWM', 'ColorizationAfterglow', argb(RED)),
                 reg(r'HKCU\Control Panel\Desktop', 'AutoColorization', 0),
                 reg(PERSONALIZE, 'ColorPrevalence', 1)]},
    {'id': 'brand.titlebars', 'category': 'brand', 'profiles': [], 'reboot': 'none', 'refresh': ['immersive'], 'source': DOC['accent'],
     'name': T('Red title bars and borders', 'Barres de titre et bordures rouges'),
     'desc': T('Active windows get a Rago red title bar and border. Off by default: the brand is mostly black.',
               "Les fenêtres actives ont une barre de titre et une bordure rouge Rago. Coupé par défaut : la marque est surtout noire."),
     'actions': [reg(r'HKCU\Software\Microsoft\Windows\DWM', 'ColorPrevalence', 1)]},
    {'id': 'brand.wallpaper', 'category': 'brand', 'profiles': ALL, 'reboot': 'none', 'source': DOC['wallpaper'],
     'name': T('Rago OS wallpaper', "Fond d'écran Rago OS"),
     'desc': T('Sets the Rago OS wallpaper on every screen. Your wallpaper, slideshow and its settings come back when you turn Rago OS off.',
               "Pose le fond d'écran Rago OS sur tous les écrans. Ton fond, ton diaporama et leurs réglages reviennent quand tu désactives Rago OS."),
     'actions': [native('wallpaper')]},
    {'id': 'brand.lockscreen', 'category': 'brand', 'profiles': ALL, 'reboot': 'none', 'source': DOC['lockscreen'],
     'name': T('Rago OS lock screen', 'Écran de verrouillage Rago OS'),
     'desc': T('The lock screen shows the Rago OS picture instead of Windows Spotlight.',
               "L'écran de verrouillage affiche l'image Rago OS au lieu de Windows à la une."),
     'actions': [reg(CDM, 'RotatingLockScreenEnabled', 0), native('lockscreen')]},
    {'id': 'brand.theme', 'category': 'brand', 'profiles': ALL, 'reboot': 'none', 'source': DOC['theme'],
     'name': T('"Rago OS" theme in Settings', 'Thème « Rago OS » dans les Paramètres'),
     'desc': T('Adds a Rago OS theme to Settings > Personalization > Themes, to pick it again later in one click.',
               "Ajoute un thème Rago OS dans Paramètres > Personnalisation > Thèmes, pour le reprendre plus tard en un clic."),
     'actions': [native('theme')]},
    {'id': 'brand.oem', 'category': 'brand', 'profiles': ALL, 'reboot': 'none', 'source': DOC['oem'],
     'name': T('Rago support in Settings', 'Assistance Rago dans les Paramètres'),
     'desc': T('Settings > System > About shows Rago and its website in the Support section. Your PC maker\'s details come back when you turn Rago OS off.',
               "Paramètres > Système > Informations système affiche Rago et son site dans la partie Assistance. Les infos de ton constructeur reviennent quand tu désactives Rago OS."),
     'actions': [reg(r'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\OEMInformation', 'Manufacturer', 'Rago', 'sz'),
                 reg(r'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\OEMInformation', 'SupportURL', 'https://rago-optimizer.com', 'sz')]},
]

# Applications préinstallées : retirées du compte du joueur seulement (Remove-AppxPackage), jamais du PC
# (pas de Remove-AppxProvisionedPackage) : le paquet reste dans WindowsApps et se réinscrit à la désactivation.
# Gardées volontairement : Microsoft Store, App Installer (winget), Xbox (Game Pass), Calculatrice, Appareil photo,
# Photos, Paint, Bloc-notes, Terminal, Outil Capture, Pense-bêtes, Horloge, extensions média (HEVC, HEIF, VP9, AV1…),
# Sécurité Windows, Obtenir de l'aide (dépannage de Windows 11 24H2).
APPS = [
    ('Microsoft.BingNews', T('Microsoft News', 'Actualités Microsoft'), ALL),
    ('Microsoft.BingWeather', T('Weather', 'Météo'), ALL),
    ('Microsoft.BingSearch', T('Bing Search', 'Recherche Bing'), ALL),
    ('Microsoft.Getstarted', T('Tips', 'Astuces'), ALL),
    ('Microsoft.MicrosoftOfficeHub', T('Microsoft 365 (Office) hub', 'Microsoft 365 (Office)'), ALL),
    ('Microsoft.MicrosoftSolitaireCollection', T('Solitaire Collection', 'Solitaire Collection'), ALL),
    ('Microsoft.People', T('People', 'Contacts'), ALL),
    ('Microsoft.PowerAutomateDesktop', T('Power Automate', 'Power Automate'), ALL),
    ('Microsoft.Todos', T('Microsoft To Do', 'Microsoft To Do'), ALL),
    ('Microsoft.WindowsFeedbackHub', T('Feedback Hub', 'Hub de commentaires'), ALL),
    ('Microsoft.WindowsMaps', T('Maps', 'Cartes'), ALL),
    ('Microsoft.ZuneVideo', T('Films & TV', 'Films et TV'), ALL),
    ('Clipchamp.Clipchamp', T('Clipchamp', 'Clipchamp'), ALL),
    ('Microsoft.549981C3F5F10', T('Cortana', 'Cortana'), ALL),
    ('MicrosoftCorporationII.MicrosoftFamily', T('Microsoft Family', 'Microsoft Family'), ALL),
    ('MicrosoftTeams', T('Teams (personal, old version)', 'Teams (personnel, ancienne version)'), ALL),
    ('MSTeams', T('Teams (personal)', 'Teams (personnel)'), []),
    ('Microsoft.Windows.DevHome', T('Dev Home', 'Dev Home'), ALL),
    ('Microsoft.Copilot', T('Copilot app', 'Appli Copilot'), ALL),
    ('Microsoft.OutlookForWindows', T('Outlook (new)', 'Outlook (nouveau)'), []),
    ('Microsoft.YourPhone', T('Phone Link', 'Lien avec Windows'), ['competitive', 'balanced', 'minimal']),
]


def app_tweak(pkg, name, profiles):
    return {'id': 'apps.' + pkg.lower(), 'category': 'apps', 'profiles': profiles, 'reboot': 'none', 'source': DOC['appx'],
            'name': name,
            'desc': T(f'Removes {name["en"]} from your account ({pkg}). It comes back when you turn Rago OS off.',
                      f'Retire {name["fr"]} de ton compte ({pkg}). Elle revient quand tu désactives Rago OS.'),
            'actions': [appx(pkg)]}


TWEAKS += [app_tweak(*a) for a in APPS]

# Fonctionnalités de Rago Shell (processus natif à part, rago-shell.exe) : activables une par une, hors profils.
FEATURES = [
    {'id': 'boot', 'default': True,
     'name': T('Rago OS startup animation', 'Animation de démarrage Rago OS'),
     'desc': T('When you sign in, Rago OS covers the desktop while Windows loads, then reveals it. About 3 seconds; click or Esc to skip.',
               "À l'ouverture de session, Rago OS couvre le bureau pendant que Windows charge, puis le dévoile. Environ 3 secondes ; un clic ou Échap pour passer.")},
    {'id': 'island', 'default': True,
     'name': T('Dynamic Island', 'Dynamic Island'),
     'desc': T('A black pill at the top of the screen that opens when something happens: music with play/pause/next, volume, and a timer. Hidden while a game or a full-screen app is in front.',
               "Une pastille noire en haut de l'écran, qui s'ouvre quand il se passe quelque chose : musique avec lecture/pause/suivant, volume et minuteur. Cachée quand un jeu ou une appli plein écran est devant.")},
    {'id': 'translucenttb', 'default': False,
     'name': T('Fully transparent taskbar', 'Barre des tâches entièrement transparente'),
     'desc': T('Uses TranslucentTB (free, from the Microsoft Store) set to Rago colors. Turned off automatically if Explorer restarts in a loop.',
               "Utilise TranslucentTB (gratuit, sur le Microsoft Store) réglé aux couleurs Rago. Coupé automatiquement si l'Explorateur redémarre en boucle.")},
]

TYPES = {'dword', 'sz', 'binary'}
ROOTS = ('HKCU\\', 'HKLM\\')


def check():
    ids = set()
    cats = {c['id'] for c in CATEGORIES}
    profs = {p['id'] for p in PROFILES}
    for t in TWEAKS:
        assert re.fullmatch(r'[a-z]+\.[a-z0-9.\-]+', t['id']), t['id']
        assert t['id'] not in ids, t['id']
        ids.add(t['id'])
        assert t['category'] in cats, t['id']
        assert set(t['profiles']) <= profs, t['id']
        assert t['reboot'] in ('none', 'explorer', 'restart'), t['id']
        assert t['source'].startswith('https://'), t['id']
        assert t['actions'], t['id']
        for a in t['actions']:
            if a['do'] == 'reg':
                assert a['key'].startswith(ROOTS), (t['id'], a['key'])
                assert a['type'] in TYPES, t['id']
                if a['type'] == 'dword':
                    assert isinstance(a['value'], int) and 0 <= a['value'] <= 0xFFFFFFFF, t['id']
                elif a['type'] == 'binary':
                    assert re.fullmatch(r'([0-9a-f]{2})+', a['value']), t['id']
                else:
                    assert isinstance(a['value'], str), t['id']
            elif a['do'] == 'task':
                assert a['path'].startswith('\\Microsoft\\Windows\\'), t['id']
            elif a['do'] == 'service':
                assert re.fullmatch(r'[A-Za-z0-9_]+', a['name']) and a['start'] in ('disabled', 'manual'), t['id']
            elif a['do'] == 'appx':
                assert re.fullmatch(r'[A-Za-z0-9.]+', a['name']), t['id']
            elif a['do'] == 'native':
                assert a['what'] in ('wallpaper', 'lockscreen', 'theme', 'powerplan'), t['id']
            else:
                raise AssertionError(t['id'])
        for r in t.get('refresh', []):
            assert r in ('immersive', 'mouse', 'accessibility'), t['id']


def main():
    check()
    data = {'version': 1, 'categories': CATEGORIES, 'profiles': PROFILES, 'features': FEATURES, 'tweaks': TWEAKS}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{len(TWEAKS)} réglages, {len(CATEGORIES)} catégories, {len(PROFILES)} profils -> {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
