"""Catalogue de Rago Optimizer à partir des trois .bat de Sofiene (legacy/v6, 2026-10-06).

Chaque bloc « :: Titre » des .bat devient un réglage ; les variantes (Hypixel, ON/OFF, niveaux) sont
déclarées dans SECTIONS. Le module Restore (outils de l'app) est repris de l'ancien catalogue.

    python3 tools/build_catalog_v6.py
"""
import json
import os
import re

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
      absorb=0, confirm=None):
    return dict(file=file, line=line, id=id, name=I(en, fr), desc=I(desc_en, desc_fr), risk=risk, reboot=reboot,
                requires=list(requires), variants=variants, absorb=absorb, confirm=confirm)


ONOFF = [('on', 'On', 'Activé', r'::\s*gmode ON'), ('off', 'Off', 'Désactivé', r'::\s*gmode OF')]

# module, icône, nom, accroche, [(section, nom, [réglages])]
MODULES = [
    ('network', 'network', I('Ping', 'Ping'), I('Lower ping, cleaner packets.', 'Un ping plus bas, des paquets plus propres.'), [
        ('hitreg', I('Hit registration', 'Enregistrement des coups'), [
            T('ping', 10, 'ping_hitreg', 'Hitreg profile', 'Profil hitreg',
              'TTL, TCP auto-tuning and receive coalescing, tuned for better hitreg or for Hypixel.',
              'TTL, auto-tuning TCP et regroupement des paquets, réglés pour le hitreg ou pour Hypixel.',
              reboot=False, variants=[('better', 'Better hitreg', 'Meilleur hitreg', r'^:BETTERHITREG'),
                                      ('hypixel', 'Hypixel', 'Hypixel', r'^:HYPIXEL')]),
            T('ping', 85, 'ping_packets', 'Packet optimization', 'Optimisation des paquets',
              'Offloads, RSS, MTU 1400, TCP flags and timers for steadier packets.',
              'Offloads, RSS, MTU 1400, options TCP et minuteurs pour des paquets plus réguliers.'),
        ]),
        ('ping', I('Ping', 'Ping'), [
            T('ping', 259, 'ping_main', 'Ping optimization', 'Optimisation du ping',
              'Tunes your network adapter and the Windows TCP/IP stack for low ping.',
              'Règle ta carte réseau et la pile TCP/IP de Windows pour un ping bas.'),
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
              risk='advanced',
              confirm=I('This also turns off the Spectre and Meltdown protections. Your PC gets less secure.',
                        'Ça coupe aussi les protections Spectre et Meltdown. Ton PC devient moins protégé.')),
            T('input', 732, 'in_frames', 'Frame latency', 'Latence des images',
              'How many frames Windows and DirectX queue before showing them.',
              'Nombre d\'images que Windows et DirectX mettent en file avant de les afficher.',
              variants=[('lowest', 'Lowest', 'Minimale', r'^\s*::\s*Lowest'), ('balanced', 'Balanced', 'Équilibrée', r'^\s*::\s*Balanced'),
                        ('default', 'Default', 'Par défaut', r'^\s*::\s*Default')]),
            T('input', 181, 'in_advanced', 'Advanced latency', 'Latence avancée',
              'Big pack: stops services, driver updates, UAC, Windows Update notifications, Spectre and Meltdown protections, plus dozens of Explorer settings.',
              'Gros pack : coupe des services, les mises à jour de pilotes, l\'UAC, les notifications Windows Update, les protections Spectre et Meltdown, et des dizaines de réglages de l\'Explorateur.',
              risk='advanced',
              confirm=I('This turns off UAC, Windows Update notifications and the Spectre and Meltdown protections. Your PC gets less secure.',
                        'Ça coupe l\'UAC, les notifications Windows Update et les protections Spectre et Meltdown. Ton PC devient moins protégé.')),
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
              absorb=4),
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
              'Memory management, compression and prefetch settings. Also turns off the Spectre and Meltdown protections.',
              'Gestion de la mémoire, compression et prefetch. Coupe aussi les protections Spectre et Meltdown.',
              risk='advanced',
              confirm=I('This also turns off the Spectre and Meltdown protections. Your PC gets less secure.',
                        'Ça coupe aussi les protections Spectre et Meltdown. Ton PC devient moins protégé.')),
            T('fps', 2362, 'sys_registry', 'Registry optimization', 'Optimisation du registre',
              'Large set of registry settings, including disabling the BAM service and the I/O latency cap.',
              'Grand ensemble de réglages du registre, dont la coupure du service BAM et du plafond de latence disque.',
              risk='advanced',
              confirm=I('This turns off BAM, the service that logs which programs ran. On a screenshare that can look like erased traces.',
                        'Ça coupe BAM, le service qui garde la trace des programmes lancés. Sur un screenshare, ça peut ressembler à des traces effacées.')),
        ]),
        ('power', I('Power & storage', 'Alimentation et stockage'), [
            T('fps', 1920, 'pow_main', 'Power optimization', 'Optimisation de l\'alimentation',
              'Turns off power saving that slows your CPU and devices.',
              'Coupe les économies d\'énergie qui ralentissent ton CPU et tes périphériques.'),
            T('fps', 1969, 'pow_plan', 'Ultimate power plan', 'Plan Performances optimales',
              'Adds the Ultimate Performance plan and removes the default plans.',
              'Ajoute le plan Performances optimales et supprime les plans par défaut.', risk='advanced'),
            T('fps', 1770, 'pow_saving', 'Storage power saving', 'Économies d\'énergie du stockage',
              'Keeps your drives out of idle power states.', 'Empêche tes disques de passer en veille.'),
            T('fps', 1805, 'sto_general', 'Storage optimization', 'Optimisation du stockage',
              'NTFS, disk cache and storage driver settings.', 'NTFS, cache disque et pilotes de stockage.'),
            T('fps', 1789, 'sto_ntfs', 'NTFS tweaks', 'Réglages NTFS', 'File system settings for faster access.',
              'Réglages du système de fichiers pour un accès plus rapide.'),
            T('fps', 1797, 'sto_fsutil', 'FSUTIL settings', 'Réglages FSUTIL', 'Disables last-access and 8.3 names.',
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
              risk='advanced', variants=ONOFF),
            T('fps', 2955, 'win_mitigations', 'Disable mitigations', 'Couper les protections CPU',
              'Turns off Spectre, Meltdown and other CPU security mitigations.',
              'Coupe les protections Spectre, Meltdown et autres failles CPU.', risk='advanced',
              confirm=I('Your PC loses its protection against Spectre and Meltdown attacks.',
                        'Ton PC perd sa protection contre les attaques Spectre et Meltdown.')),
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
     ['ping_hitreg:hypixel', 'ping_packets', 'ping_main', 'in_driver', 'in_adapter', 'in_windows', 'in_mouse', 'in_keyboard',
      'in_queue:low', 'win_gamemode:on', 'win_gamedvr', 'win_fullscreen']),
    ('fps', I('Max FPS', 'FPS max'), I('Graphics card, CPU and power tuned for frames.', 'Carte graphique, CPU et alimentation réglés pour les FPS.'),
     ['gpu_nvidia', 'gpu_amd', 'gpu_intel', 'gpu_general', 'gpu_directx', 'cpu_amd', 'cpu_intel', 'sys_priority', 'sys_ram',
      'pow_main', 'pow_saving', 'sys_usb', 'win_visual', 'win_gamemode:on', 'win_gamedvr']),
    ('latency', I('Low latency', 'Latence minimale'), I('Input lag first: drivers, timers and input queues.', 'L\'input lag d\'abord : pilotes, minuteurs et files d\'entrée.'),
     ['in_driver', 'in_adapter', 'in_windows', 'in_frames:lowest', 'in_mouse', 'in_keyboard', 'in_queue:ultra', 'sys_latency',
      'sys_csrss', 'sys_time', 'gpu_directx']),
]
QUEUE_VARIANTS = {'Ultra Low': ('ultra', 'Ultra low', 'Ultra basse'), 'Low': ('low', 'Low', 'Basse'),
                  'Balanced': ('balanced', 'Balanced', 'Équilibrée'), 'Default': ('default', 'Default', 'Par défaut')}


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


def clean(body):
    keep = []
    for l in body:
        s = l.strip()
        if not s or s.startswith('---') or re.match(r'^(cls|pause)\b', s, re.I) or re.match(r'^:(?!:)\s*[A-Za-z]', s):
            continue
        if 'extremelatencylow.nip' in s and s.lower().startswith('start'):
            l = NIP
        elif not re.match(r'(echo|::|rem )', s, re.I):
            # même rechercher/remplacer cassé que dans l'ancien .bat : « Disable » devenu « Disabling »
            l = l.replace('Disabling', 'Disable').replace('Enabling', 'Enable')
            # USER_SID n'est défini nulle part : le moteur tourne sous le compte du joueur
            l = l.replace('HKU\\!USER_SID!\\', 'HKCU\\')
        keep.append(l.rstrip())
    return '\r\n'.join(keep)


def split_variants(body, spec):
    cut = {}
    for vid, _, _, pat in spec:
        idx = next((i for i, l in enumerate(body) if re.search(pat, l)), None)
        assert idx is not None, pat
        cut[vid] = idx
    order = sorted(cut.items(), key=lambda kv: kv[1])
    res = {}
    for n, (vid, start) in enumerate(order):
        end = order[n + 1][1] if n + 1 < len(order) else len(body)
        res[vid] = clean(body[start + 1:end])
    return res


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
                    scripts[t['id']] = split_variants(sec['body'], t['variants'])
                    entry['variants'] = [{'id': v, 'label': I(en, fr)} for v, en, fr, _ in t['variants']]
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

    old = json.load(open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), encoding='utf-8'))
    old_scripts = json.load(open(os.path.join(ROOT, 'src-tauri', 'scripts', 'scripts.json'), encoding='utf-8'))
    restore = next(m for m in old['modules'] if m['id'] == 'restore')
    for s in restore['sections']:
        s['tweaks'] = [t for t in s['tweaks'] if 'ref' not in t]
        for t in s['tweaks']:
            if t['id'] in old_scripts:
                scripts[t['id']] = old_scripts[t['id']]
    restore['sections'] = [s for s in restore['sections'] if s['tweaks']]
    modules.append(restore)

    presets = [{'id': p, 'name': n, 'desc': d, 'tweaks': ts} for p, n, d, ts in PRESETS]
    catalog = {'version': 6, 'modules': modules, 'presets': presets}
    json.dump(catalog, open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(scripts, open(os.path.join(ROOT, 'src-tauri', 'scripts', 'scripts.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    n = sum(len(s['tweaks']) for m in modules for s in m['sections'])
    print(f'{n} réglages, {len(scripts)} scripts')


if __name__ == '__main__':
    main()
