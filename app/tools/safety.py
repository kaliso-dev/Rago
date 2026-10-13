"""Réglages risqués retirés de l'app 1.1.8 (demande de Sofiene, 2026-10-08).

Deux niveaux :
- RETIRED : réglages dont le but même est risqué (sécurité coupée, PC qui peut figer, fichiers perdus, fonction de
  Windows cassée sans gain). Ils quittent le catalogue, les profils et le plan gratuit ; leur annulation reste dans
  undo.json pour les PC qui les ont appliqués avant 1.1.8, et l'app propose de les remettre comme avant.
- DROP_EVERYWHERE / DROP_IN : lignes risquées cachées dans des packs utiles. Retirées de chaque script où elles
  apparaissent ; le pack reste. Les scripts d'avant l'audit gardent ces lignes, donc undo.json garde leur annulation.

Le build vérifie que chaque motif retire au moins une ligne, et le moteur (catalog.rs) qu'aucun ne revient.
EXPLORER_HISTORY : motif des historiques de l'Explorateur, vérifié absent après DROP_BLOCKS.
"""
import re

# id : (raison en, raison fr), affichée dans l'app quand le réglage est encore appliqué sur le PC
RETIRED = {
    'win_mitigations': ('It turned off the Spectre and Meltdown protections.',
                        'Il coupait les protections Spectre et Meltdown.'),
    'win_coreiso': ('Turning memory integrity off lowers your PC\'s protection against malicious drivers.',
                    'Couper l\'intégrité de la mémoire baisse la protection de ton PC contre les pilotes malveillants.'),
    'win_smartscreen': ('It turned off SmartScreen, which checks the files you download.',
                        'Il coupait SmartScreen, qui vérifie les fichiers téléchargés.'),
    'win_hyperv': ('It turned off Hyper-V and virtualization-based security, and broke WSL, Windows Sandbox and emulators.',
                   'Il coupait Hyper-V et la sécurité basée sur la virtualisation, et cassait WSL, le Bac à sable Windows et les émulateurs.'),
    'exp_bios': ('It changed boot security settings (virtualization-based security, DMA protection, kernel memory). '
                 'A wrong value can stop Windows from starting.',
                 'Il changeait des réglages de sécurité du démarrage (sécurité basée sur la virtualisation, protection DMA, '
                 'mémoire du noyau). Une mauvaise valeur peut empêcher Windows de démarrer.'),
    'exp_dma': ('It removed the protection against attacks through Thunderbolt and PCIe devices.',
                'Il retirait la protection contre les attaques par périphériques Thunderbolt et PCIe.'),
    'exp_harden': ('It turned off the Workstation service: shared folders and network drives stopped opening.',
                   'Il coupait le service Station de travail : les dossiers partagés et les lecteurs réseau ne s\'ouvraient plus.'),
    'net_limit': ('It blocked two Google address ranges in the firewall, which can break YouTube and other Google services, '
                  'for no gain on ping.',
                  'Il bloquait deux plages d\'adresses Google dans le pare-feu, ce qui peut casser YouTube et d\'autres services '
                  'Google, sans gain sur le ping.'),
    'pri_svc': ('It put every Windows service at idle priority: sound could crackle and the network lag in game.',
                'Il passait tous les services Windows en priorité minimale : le son pouvait grésiller et le réseau ramer en jeu.'),
    'nv_tdr': ('When the graphics driver stopped responding, the PC froze instead of recovering.',
               'Quand le pilote graphique ne répondait plus, le PC figeait au lieu de récupérer.'),
    'amd_thermal': ('It turned off the thermal protection of AMD graphics cards.',
                    'Il coupait la protection thermique des cartes graphiques AMD.'),
    'sto_cacheprot': ('Files being written could be corrupted if the power cut.',
                      'Des fichiers en cours d\'écriture pouvaient être corrompus si le courant coupait.'),
    'dbl_xbox': ('It broke Game Pass, the Xbox app and Minecraft Bedrock sign-in.',
                 'Il cassait le Game Pass, l\'appli Xbox et la connexion à Minecraft Bedrock.'),
    'dbl_edge': ('Removing Edge can\'t be undone from the app and can break Windows features that rely on it.',
                 'Supprimer Edge ne s\'annule pas depuis l\'app et peut casser des fonctions de Windows qui s\'en servent.'),
    'dbl_onedrive': ('It deleted the local OneDrive folders: files not yet synced were lost.',
                     'Il supprimait les dossiers OneDrive du PC : les fichiers pas encore synchronisés étaient perdus.'),
    'mem_prefetch': ('Apps opened slower, and on a screenshare an empty Prefetch can look like erased traces.',
                     'Les applis s\'ouvraient plus lentement, et sur un screenshare un Prefetch vide peut ressembler à des traces effacées.'),
    # RAG-67 (2026-10-13) : son script ne faisait que poser CoalescingTimerInterval à 0 (DROP_EVERYWHERE plus bas) ;
    # sans ces lignes il ne ferait plus rien
    'pow_timer': ('It set a kernel timer value to 0 that Windows divides by: on some PCs (Windows 11 24H2) this caused a '
                  'blue screen a few minutes after startup, for no measurable gain.',
                  'Il mettait à 0 une valeur du noyau par laquelle Windows divise : sur certains PC (Windows 11 24H2), '
                  'écran bleu quelques minutes après le démarrage, sans gain mesurable.'),
}

# (motif, raison) : retiré de tous les scripts. Motifs sans casse, sur une ligne entière.
_REG = r'(?:reg(?:\.exe)?\s+add\s+)'
DROP_EVERYWHERE = [
    # sécurité
    (r'Memory Management"?\s+/v\s+"?FeatureSettings(Override|OverrideMask)?"?\s', 'Spectre/Meltdown'),
    (r'Set-ProcessMitigation\s+-System\s+-Disable', 'exploit protections'),
    (r'^\s*bcdedit\s+/set\s+(\{current\}\s+)?(hypervisorlaunchtype\s+off|vsmlaunchtype\s+off|vm\s+no|isolatedcontext\s+no'
     r'|nx\s+(optout|alwaysoff)|disableelamdrivers\s+yes|integrityservices\s+disable|tpmbootentropy\s+forcedisable'
     r'|pae\s+forcedisable|linearaddress57\s+optout|increaseuserva\s|allowedinmemorysettings\s)', 'boot security'),
    (r'EnableVirtualizationBasedSecurity"?\s+/t\s+REG_DWORD\s+/d\s+"?0|HVCIMATRequired"?\s+/t\s+REG_DWORD\s+/d\s+"?0'
     r'|HypervisorEnforcedCodeIntegrity"?\s+/v\s+"?Enabled"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'VBS / memory integrity'),
    (r'DisableExternalDMAUnderLock"?\s+/t\s+REG_DWORD\s+/d\s+"?0|DmaGuard\\DeviceEnumerationPolicy'
     r'|DmaRemappingCompatible"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'DMA protection'),
    (r'DisableRealtimeMonitoring"?\s+/t\s+REG_DWORD\s+/d\s+"?1|TamperProtection"?\s+/t\s+REG_DWORD\s+/d\s+"?0'
     r'|DisableAntiSpyware"?\s+/t\s+REG_DWORD\s+/d\s+"?1|SpynetReporting"?\s+/t\s+REG_DWORD\s+/d\s+"?0'
     r'|SubmitSamplesConsent"?\s+/t\s+REG_DWORD\s+/d\s+"?2', 'Microsoft Defender'),
    (r'EnableSmartScreen"?\s+/t\s+REG_DWORD\s+/d\s+"?0|SmartScreenEnabled"?\s+/t\s+REG_SZ\s+/d\s+"?Off'
     r'|EnableWebContentEvaluation"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'SmartScreen'),
    (r'ConsentPromptBehaviorAdmin"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b|PromptOnSecureDesktop"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b'
     r'|EnableLUA"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b', 'UAC'),
    (r'NoAutoUpdate"?\s+/t\s+REG_DWORD\s+/d\s+"?1|WindowsUpdate\\AU"?\s+/v\s+"?AUOptions"?\s+/t\s+REG_DWORD\s+/d\s+"?2',
     'Windows Update'),
    (r'Services\\(edgeupdate|edgeupdatem|MicrosoftEdgeElevationService|GoogleChromeElevationService)"?\s+/v\s+"?Start"?\s+'
     r'/t\s+REG_DWORD\s+/d\s+"?4', 'Edge, WebView2 and Chrome updates'),
    (r'advfirewall\s+reset|advfirewall\s+firewall\s+add\s+rule\b.*action=block', 'firewall'),
    (r'Image File Execution Options\\\*', 'IFEO wipe'),
    # compteurs de performance du GPU ouverts à toutes les applis (NVIDIA les réserve aux administrateurs depuis une faille)
    (r'"?RmProfilingAdminOnly"?\s+/t\s+REG_DWORD\s+/d\s+"?0', 'GPU counters for any app'),
    # stabilité
    (r'svchost\.exe\\PerfOptions', 'services at idle priority'),
    (r'dwm\.exe\\PerfOptions"?\s+/v\s+"?CpuPriorityClass"?\s+/t\s+REG_DWORD\s+/d\s+"?4', 'window manager in realtime'),
    (r'GraphicsDrivers"?\s+/v\s+"?Tdr', 'GPU recovery (TDR)'),
    (r'PP_ThermalAutoThrottlingEnable"?\s+/t\s+REG_DWORD\s+/d\s+"?0|PP_DisablePowerContainment"?\s+/t\s+REG_DWORD\s+/d\s+"?1',
     'AMD thermal limits'),
    (r'Session Manager\\kernel"?\s+/v\s+"?(DpcWatchdogPeriod|DpcTimeout)"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b', 'DPC watchdog'),
    # RAG-67 (2026-10-13) : valeur non documentée, lue par le noyau au démarrage, qui sert de diviseur : à 0, écran bleu
    # 0x7E (c0000094, division par zéro) quelques minutes après le démarrage (Windows 11 24H2). Toutes les clés de
    # Control (Session Manager, kernel, Executive, Memory Management, Power, ModernSleep, Control lui-même). Les PC qui
    # l'ont déjà la perdent au lancement de l'app (src-tauri/src/repair.rs) ; l'annulation la supprime toujours
    (r'(CurrentControlSet|ControlSet\d{3})\\Control\b[^"]*"?\s+/v\s+"?CoalescingTimerInterval"?\s',
     'CoalescingTimerInterval (blue screen)'),
    # fichiers et traces
    (r'CacheIsPowerProtected\s+/t\s+REG_DWORD\s+/d\s+1\b', 'cache flush'),
    (r'Clear-RecycleBin', 'Recycle Bin'),
    # EnableSuperfetch est ignoré depuis Windows 10 (audit du 2026-10-07) : seul le Prefetcher compte
    (r'PrefetchParameters"?\s+/v\s+"?EnablePrefetcher"?\s+/t\s+REG_DWORD\s+/d\s+"?0\b', 'Prefetch off'),
    (r'^(?!\s*echo).*\b(del|forfiles|rd)\b.*\\prefetch', 'Prefetch wipe'),
    (r'Services\\bam"?\s+/v\s+"?Start"?\s+/t\s+REG_DWORD\s+/d\s+"?4', 'BAM'),
    # fonctions de Windows
    (r'^\s*sc(\.exe)?\s+config\s+(xbgm|XblAuthManager|XblGameSave|XboxGipSvc|XboxNetApiSvc)\s+start=\s*disabled', 'Xbox services'),
]

# blocs retirés de réglages précis : (ids, première ligne, dernière ligne), la boucle entière
DROP_BLOCKS = [
    # « Optimisation du stockage » effaçait l'historique de l'Explorateur (fichiers récents, Exécuter, chemins tapés) :
    # sur un screenshare, ça ressemble à des traces effacées
    (('sto_general',), r'reg query "HKU" \^\| findstr', r'^\s*\)\s*$'),
]

# lignes retirées de réglages précis (ids ou « id:variante »)
DROP_IN = [
    # « Latence avancée » coupait aussi l'indexation, l'impression, les fichiers hors connexion et le rapport d'erreurs :
    # « Couper les services inutiles » (Nettoyage) le fait en l'annonçant
    (('in_advanced',), r'^\s*sc\s+(config|stop)\s+(WSearch|Fax|Spooler|CscService|RemoteRegistry|WerSvc)\b'),
    # le préréglage réseau remettait à zéro la pile réseau : IP fixe et DNS manuels perdus. « Réinitialiser le réseau »
    # (Restaurer) reste l'action dédiée et annoncée
    (('net_server:s1', 'net_server:s2'), r'^\s*netsh\s+(int\s+ip|winsock)\s+reset\b'),
    # Pense-bêtes : les notes non synchronisées partaient avec l'appli
    (('app_remove', 'win_apps'), r'MicrosoftStickyNotes'),
    # veto de la veille moderne et politique d'alimentation de Windows XP (audit D22, « dangereux ») : le motif de l'audit
    # visait le nom de la valeur, ici dans le chemin de la clé
    (('cpu_advanced', 'cpu_registry'), r'\\(VetoPolicy|GlobalPowerPolicy)"\s+/v\s'),
    # pas un risque, une contradiction : Game DVR coupé par la stratégie juste au-dessus, puis autorisé de nouveau ici
    (('win_gamedvr',), r'ApplicationManagement\\AllowGameDVR"\s+/v\s+"value"\s+/t\s+REG_DWORD\s+/d\s+"1"'),
]


def _drop(body, pat):
    sep = '\r\n' if '\r\n' in body else '\n'
    lines = body.split(sep)
    kept = [l for l in lines if not re.search(pat, l, re.I)]
    return sep.join(kept), len(lines) - len(kept)


def apply(scripts):
    """Retire les lignes risquées. Renvoie {motif: [« id:variante »…]} pour le journal du build."""
    report = {}
    for keys, start, end in DROP_BLOCKS:
        for tid in keys:
            for v, body in scripts[tid].items():
                sep = '\r\n' if '\r\n' in body else '\n'
                lines = body.split(sep)
                i = next(n for n, l in enumerate(lines) if re.search(start, l, re.I))
                j = next(n for n in range(i + 1, len(lines)) if re.search(end, lines[n], re.I))
                scripts[tid][v] = sep.join(lines[:i] + lines[j + 1:])
                report.setdefault(start, []).append(f'{tid}:{v}')
    for pat, label in DROP_EVERYWHERE:
        hits = []
        for tid, variants in scripts.items():
            for v, body in variants.items():
                new, n = _drop(body, pat)
                if n:
                    variants[v] = new
                    hits.append(f'{tid}:{v}')
        assert hits, f'motif sans effet : {label}'
        report[label] = hits
    for keys, pat in DROP_IN:
        hits = []
        for key in keys:
            tid, _, only = key.partition(':')
            for v in scripts[tid]:
                if only and v != only:
                    continue
                scripts[tid][v], n = _drop(scripts[tid][v], pat)
                assert n, (key, pat)
                hits.append(f'{tid}:{v}')
        report[pat] = hits
    return report


EXPLORER_HISTORY = r'RunMRU|TypedPaths|OpenSavePidlMRU|LastVisitedPidlMRU'


def remaining(scripts):
    """Lignes qu'un motif retiré trouverait encore (doit être vide après apply)."""
    out = []
    for pat, label in DROP_EVERYWHERE + [(EXPLORER_HISTORY, 'Explorer history')]:
        for tid, variants in scripts.items():
            for v, body in variants.items():
                for l in body.replace('\r\n', '\n').split('\n'):
                    if re.search(pat, l, re.I):
                        out.append((label, f'{tid}:{v}', l.strip()))
    return out


def notes(report, n_tweaks, n_distinct):
    """Section de docs/CORRECTIONS.md : ce que 1.1.8 retire, d'après RETIRED et le rapport d'apply()."""
    out = ['', '', '# Réglages risqués retirés (1.1.8)', '',
           f'Demande de Sofiene (2026-10-08) : `tools/safety.py`. {len(RETIRED)} réglages quittent le catalogue, les '
           f'profils et le plan gratuit. Il reste {n_tweaks} entrées au catalogue, soit {n_distinct} réglages distincts : '
           f'les {n_tweaks - n_distinct} autres lancent les mêmes commandes qu\'un autre réglage, sous un autre nom ou dans un autre module (champ `twin`), '
           'et c\'est ce nombre distinct que l\'app et le site annoncent. Leur annulation reste dans undo.json : sur un PC où '
           'une version précédente les a appliqués, le tableau de bord propose de les remettre comme avant.', '']
    out += [f'- `{tid}` : {fr}' for tid, (_, fr) in RETIRED.items()]
    out += ['', 'Lignes risquées retirées des packs qui les cachaient (le pack reste) :', '']
    labels = {label for _, label in DROP_EVERYWHERE}
    out += [f'- {label} : {", ".join(sorted(set(h.split(":")[0] for h in hits)))}' for label, hits in report.items() if label in labels]
    out += [
        '- sto_general : la boucle qui vidait les historiques de l\'Explorateur (fichiers récents, Exécuter, chemins tapés) ;',
        '- in_advanced : indexation, impression, fichiers hors connexion, registre à distance et rapport d\'erreurs coupés '
        'sans le dire (« Couper les services inutiles » le fait en l\'annonçant) ;',
        '- net_server (préréglages 1 et 2) : remise à zéro de la pile réseau (IP fixe et DNS manuels perdus) ;',
        '- app_remove, win_apps : Pense-bêtes gardé (notes non synchronisées perdues) ;',
        '- cpu_advanced, cpu_registry : veto de la veille moderne et politique d\'alimentation XP (audit D22, motif sur le '
        'chemin de la clé) ;',
        '- win_gamedvr : la ligne qui réautorisait Game DVR juste après l\'avoir coupé.',
    ]
    out += ['', 'Point de restauration (1.1.8) : la case de 1.1.6 revient. Elle est cochée d\'office seulement pour un '
            'réglage `restore` (avancé, ou que l\'app ne remet pas entièrement) et si Rago n\'en a pas créé un réussi '
            'dans les 24 dernières heures.', '']
    return '\n'.join(out)
