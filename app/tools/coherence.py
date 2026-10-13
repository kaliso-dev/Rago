"""Scripts qui ne font pas ce qu'ils annoncent, qui visent le mauvais matériel, ou dont le texte est faux (1.1.9).

Sources : Linear RAG-60 (§4 catalogue, §5 petites erreurs), RAG-27 (7 incohérences relevées en 1.1.8) et les
« Points relevés sans correction » de l'audit du 2026-10-07. Branché dans tools/build_catalog_v6.py après safety.py :

- apply(scripts, drop_lines, sub_lines) : corrige les scripts (lignes retirées, valeurs, carte graphique visée,
  garde processeur, fusion des réglages DirectX…), puis check() ;
- check(scripts) : vérifie que rien de tout ça ne revient (le moteur revérifie l'essentiel dans catalog.rs) ;
- WARNINGS : avertissements ajoutés à ceux du build ;
- catalog(tweaks) : redémarrage et noms ;
- NOTES : la section de docs/CORRECTIONS.md.

Les textes (description, gain, inconvénients) sont dans tools/descriptions.json. Les scripts d'avant restent dans
undo.json (before_audit du build) : un PC qui les a lancés retrouve aussi les valeurs des lignes changées ici.
"""
import ast
import os
import re

# ------------------------------------------------------------------------------------------------ carte graphique
GPU_CLASS = r'HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
VENDOR = {'nvidia': ('10de', 'NVIDIA'), 'amd': ('1002', 'AMD')}
# Écrivaient dans la clé « …\0000 » du pilote graphique : la première carte installée, souvent la puce intégrée
# (Intel ou AMD) d'un portable à deux cartes. Ils visent maintenant chaque carte du bon fabricant (MatchingDeviceId).
# Sur un PC à une seule carte, c'est la même clé qu'avant.
GPU_TARGET = {
    'nv_accel': 'nvidia', 'nv_contig': 'nvidia', 'nv_kboost': 'nvidia', 'gpu_nvidia': 'nvidia',
    'amd_general': 'amd', 'amd_power': 'amd', 'amd_memsleep': 'amd', 'amd_delag': 'amd', 'gpu_amd': 'amd',
}
# gpu_amd prenait la DERNIÈRE clé listée par une boucle « DriverDesc » (%REGPATH_AMD%) : parfois l'iGPU ou rien
REGPATH_IDS = {'gpu_amd'}
# boucles « mode MSI » sur toutes les cartes graphiques (Win32_VideoController) : seulement celles du bon fabricant
MSI_TARGET = {'nv_msi': 'nvidia', 'gpu_nvidia': 'nvidia', 'gpu_amd': 'amd'}

KEY_0000 = re.compile(r'(?i)"(?:HKLM|HKEY_LOCAL_MACHINE)\\SYSTEM\\(?:CurrentControlSet|ControlSet00\d)\\Control\\Class\\'
                      r'\{4d36e968-e325-11ce-bfc1-08002be10318\}\\0000((?:\\[^"\\]+)*)"')
KEY_REGPATH = re.compile(r'(?i)"[!%]REGPATH_AMD[!%]((?:\\[^"\\]+)*)"')
VIDEO_LOOP = re.compile(r'(?i)Get-CimInstance Win32_VideoController\)\.PNPDeviceID')

# ------------------------------------------------------------------------------------------------ réseau
# paramètres que `netsh int tcp set global` accepte sous Windows 10 et 11 ; les autres (chimney, netdma, minrto,
# congestionprovider…) répondent « paramètre incorrect » et ne changent rien
NETSH_GLOBAL_OK = {'autotuninglevel', 'rss', 'rsc', 'ecncapability', 'timestamps', 'nonsackrttresiliency', 'fastopen',
                   'fastopenfallback', 'hystart', 'prr', 'pacingprofile', 'dca', 'initialrto', 'maxsynretransmissions'}
NETSH_GLOBAL = re.compile(r'(?i)^\s*netsh\s+int(?:erface)?\s+tcp\s+set\s+global\s+(\w+)')
NETSH_IDS = ('ping_packets:hitreg', 'ping_packets:knockback', 'net_profile:hitreg', 'net_profile:knockback')
QOS_IDS = ('ping_packets:qos', 'net_profile:qos')
# hors domaine d'entreprise, Windows n'applique le marquage DSCP d'une stratégie QoS que si « Do not use NLA » vaut "1"
NLA_LINE = 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f >nul 2>&1'
# AssignmentSetOverride 04 = processeur logique n°2 : absent ou seul cœur restant sur un petit processeur
AFFINITY_IDS = ('net_affinity', 'in_adapter', 'ping_main:config4', 'ping_advanced')
CPU_GUARD = 'if %NUMBER_OF_PROCESSORS% GEQ 4 '
CPU_SKIP = ('if %NUMBER_OF_PROCESSORS% LSS 4 echo - Fewer than 4 logical processors: '
            'network interrupts stay where Windows puts them')
AFFINITY_LINE = re.compile(r'(?i)Interrupt Management\\Affinity Policy"\s+/v\s+"(AssignmentSetOverride|DevicePolicy)"')

# ------------------------------------------------------------------------------------------------ lignes retirées
DROP = [
    # ---- hitreg_suite : valeurs posées puis défaites plus bas dans le même script (AlwaysOn 0, DisableTaskOffload 0)
    (('hitreg_suite',), r'^REM AlwaysOn - Ensures gaming optimizations are enabled'),
    (('hitreg_suite',), r'/v "AlwaysOn" /t REG_DWORD /d "1"'),
    (('hitreg_suite',), r'/v "DisableTaskOffload" /t REG_DWORD /d "1"'),
    # mode jeu : c'est l'affaire de « Mode jeu Windows » (win_gamemode, conseillé par l'app et le profil Minecraft PvP).
    # hitreg_suite le coupait sans le dire, in_advanced l'allumait sans le dire
    (('hitreg_suite', 'in_advanced'), r'\\GameBar"\s+/v\s+"(AllowAutoGameMode|AutoGameModeEnabled)"'),
    # compression mémoire : « Profil mémoire » (sys_ram, mem_profile) ne la coupe qu'avec assez de RAM ; la suite
    # la coupait sur tous les PC (RAG-27)
    (('hitreg_suite',), r'Disable-MMAgent\s+-MemoryCompression'),
    # hibernation : retirée de pow_main pour la même raison (audit du 2026-10-07) ; « Désactiver l'hibernation »
    # (pow_hibernate) le fait en l'annonçant. Le démarrage rapide (HiberbootEnabled) reste coupé
    (('hitreg_suite', 'in_advanced'), r'\\Control\\Power"\s+/v\s+"HibernateEnabled"\s+/t\s+REG_DWORD\s+/d\s+"0"'),
    # Game DVR remettait l'optimisation plein écran sur 1 juste après que « Plein écran » (win_fullscreen) l'a mise
    # sur 0 : le résultat dépendait de l'ordre. Le plein écran est l'affaire de win_fullscreen (RAG-27)
    (('win_gamedvr',), r'GameConfigStore"\s+/v\s+"GameDVR_(FSEBehaviorMode|HonorUserFSEBehaviorMode)"\s+/t\s+REG_DWORD\s+/d\s+"1"'),
    # ntoskrnl.exe n'est pas un processus lancé (pas d'IFEO) ; dwm, audiodg, SearchIndexer… sont des programmes
    # 64 bits : la vue 32 bits (WOW6432Node) ne les concerne pas
    (('exp_io',), r'\\ntoskrnl\.exe\\PerfOptions"'),
    (('exp_io',), r'\\WOW6432Node\\'),
    # netsh invalides sous Windows 10 et 11 (erreur sans effet)
    (NETSH_IDS, r'(?i)^\s*netsh\s+int(?:erface)?\s+tcp\s+set\s+global\s+(?!(?:' + '|'.join(sorted(NETSH_GLOBAL_OK)) + r')\b)'),
    (('net_advanced',), r'^:: Enable NetDMA$|^echo - Enabling Network Direct Memory Access|netsh int tcp set global netdma='),
    # SACK coupé : l'audit l'a déjà retiré des autres réglages réseau (perte de paquets plus lente à rattraper)
    (('net_advanced',), r'^:: Disable SackOpts$|^echo - Disabling TCP Selective ACKs|/v "SackOpts" /t REG_DWORD /d "0"'),
]

# ------------------------------------------------------------------------------------------------ valeurs corrigées
SUB = [
    # KBoost : la valeur habituelle est 0x2222 (8738), celle de nv_powermizer ; « 2222 » en décimal ne bloque rien
    (('nv_kboost',), r'(/v "PerfLevelSrc" /t REG_DWORD /d )"2222"', r'\1"8738"'),
    # l'étape « Disable Clock Gating » allumait le clock gating. gpu_amd et amd_advanced reprennent la même étape (« Disabling
    # VCESW/UVD Clock Gating ») : corrigée aussi, sinon ils remettaient 1 par-dessus le 0 d'amd_power, selon l'ordre de
    # lancement (ces deux packs posent déjà 0 et DisableAllClockGating 1 dans leur bloc AMD)
    (('amd_power', 'gpu_amd', 'amd_advanced'), r'(/v "(?:EnableVceSwClockGating|EnableUvdClockGating)" /t REG_DWORD /d )"1"',
     r'\1"0"'),
    # EnergyEstimationEnabled 1 et EnergyEstimationDisabled 1 dans le même script : l'estimation est coupée partout
    (('pow_windows',), r'(/v EnergyEstimationEnabled /t REG_DWORD /d )1 ', r'\g<1>0 '),
    # texte parasite collé à la fin de la commande (cadre ASCII mal encodé) : la commande échouait
    (('gpu_amd',), r'(/f)\s+%b%.*$', r'\1'),
    # chemin de tâche avec une faute de frappe : schtasks ne trouvait rien
    (('dbl_telemetry', 'win_telemetry'), r'\\Microsoftd\\', r'\\Microsoft\\'),
    # Cortana rallumait la recherche web que « Recherche Windows sans le web » coupe (RAG-27)
    (('dbl_cortana',), r'(/v "DisableWebSearch" /t REG_DWORD /d )"0"', r'\1"1"'),
    # Actualités et centres d'intérêt : la stratégie est sous Policies\Microsoft\Dsh (comme win_feed). sys_registry : même
    # ligne, corrigée aux finitions du 2026-10-13
    (('win_services', 'sys_registry'), r'"HKLM\\SOFTWARE\\Policies\\Microsoft" (/v "AllowNewsAndInterests")',
     r'"HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" \1'),
    # commande PowerShell lancée par cmd (sans effet) et chemin de tâche faux : la vraie tâche, avec schtasks
    (('hitreg_suite',), r'^Disable-ScheduledTask -TaskPath "HKCU\\Software\\Microsoft\\Windows\\Application Experience" '
                        r'-TaskName "Microsoft Compatibility Appraiser"',
     r'schtasks /change /tn "\\Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /disable'),
    # stratégie QoS : Windows écrit ces valeurs en texte, « -1 » pour « pas de limite de débit »
    (QOS_IDS, r'/v "DSCP Value" /t REG_DWORD /d 46 ', r'/v "DSCP Value" /t REG_SZ /d "46" '),
    (QOS_IDS, r'/v "Throttle Rate" /t REG_SZ /d "Disabled" ', r'/v "Throttle Rate" /t REG_SZ /d "-1" '),
    # Jumbo Packet n'accepte pas 0 : 1514 (désactivé), la valeur que le script pose plus bas (doublon retiré ensuite)
    (('ping_main:config3',), r"(-DisplayName 'Jumbo Packet' \| Set-NetAdapterAdvancedProperty -RegistryValue )0\"", r'\g<1>1514"'),
]

# win_fullscreen écrasait DirectXUserGlobalSettings, où Windows 11 garde aussi Auto HDR et les autres réglages
# graphiques : on garde ce qui y est et on ne change que les deux réglages du script
DX_OLD = ('reg add "HKCU\\SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ '
          '/d "VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;" /f')
DX_NEW = [
    'set "rago_dx="',
    'for /f "delims=" %%v in (\'powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKCU:\\SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences\' '
    '-ErrorAction SilentlyContinue).DirectXUserGlobalSettings -split \';\' | Where-Object { $_ -and $_ -notlike \'VRROptimizeEnable=*\' '
    '-and $_ -notlike \'SwapEffectUpgradeEnable=*\' }"\') do set "rago_dx=!rago_dx!%%v;"',
    'reg add "HKCU\\SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences" /v "DirectXUserGlobalSettings" /t REG_SZ '
    '/d "!rago_dx!VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;" /f',
]

# avertissements ajoutés à ceux du build (motif, en, fr)
WARNINGS = [
    (r'Set-SmbClientConfiguration\s+-RequireSecuritySignature\s+\$True',
     'This PC will also stop opening the shared folders of old NAS drives and routers that do not support SMB signing.',
     'Ton PC ne pourra plus non plus ouvrir les dossiers partagés des vieux NAS et box qui ne gèrent pas la signature SMB.'),
]

# redémarrage : DisabledComponents, ThreadPriority des pilotes souris et clavier, réglages Tcpip et stratégie QoS ne
# sont relus qu'au démarrage (ou à la reconnexion pour les réglages de la souris)
REBOOT = {'net_ipv6': True, 'in_mouse': True, 'in_keyboard': True, 'net_profile': True}
# net_profile « Hitreg » ne fait que des netsh et du PowerShell, appliqués tout de suite
VARIANT_REBOOT = {'net_profile': {'hitreg': False, 'knockback': True, 'qos': True}}
NAMES = {
    # EnableSuperfetch est ignoré depuis Windows 10 et le script ne touche pas le service SysMain
    'mem_superfetch': ('Disable Superfetch (legacy setting)', 'Désactiver Superfetch (ancien réglage)'),
    # DisabledComponents 32 (audit du 2026-10-07) : l'IPv4 passe avant l'IPv6, qui reste actif
    'net_ipv6': ('Prefer IPv4 over IPv6', 'Préférer l\'IPv4 à l\'IPv6'),
}


def _sep(body):
    return '\r\n' if '\r\n' in body else '\n'


def _nic_kw():
    """Nom affiché anglais → mot-clé du registre : la table de tools/undo/undo_gen.py (lue sans l'importer)."""
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'undo', 'undo_gen.py'), encoding='utf-8').read()
    return ast.literal_eval(re.search(r'^NIC_KW = (\{.*?^\})', src, re.S | re.M).group(1))


def _depth(line):
    t = line.strip()
    if re.match(r'(?i)(rem\b|::|echo\b)', t):
        return 0
    u = re.sub(r"'[^']*'", "''", re.sub(r'"[^"]*"', '""', t))
    return u.count('(') - u.count(')')


def _letters(body, n):
    used = {c.lower() for c in re.findall(r'%%(\w)', body)}
    free = [c for c in 'GHJQXYZ' if c.lower() not in used]
    assert len(free) >= n, used
    return free[:n]


def target_gpu(body, vendor, regpath=False):
    """Chaque commande sur « …\\0000 » (et %REGPATH_AMD%) passe sur les clés des cartes du fabricant, trouvées une
    fois en tête du script. Aucune carte de ce fabricant : rien n'est écrit, et le relevé ne garde rien."""
    ven, label = VENDOR[vendor]
    sep = _sep(body)
    k, l = _letters(body, 2)
    out, n = [], 0
    for line in body.split(sep):
        if regpath and re.search(r'(?i)\(set "REGPATH_AMD=%%\w"\)', line):
            continue
        new = KEY_0000.sub(lambda m: f'"%%{k}{m.group(1)}"', line)
        if regpath:
            new = KEY_REGPATH.sub(lambda m: f'"%%{k}{m.group(1)}"', new)
        if new != line:
            cmd = new.lstrip()
            assert re.match(r'(?i)reg(\.exe)?\s+(add|delete)\s', cmd), line
            new = new[:len(new) - len(cmd)] + f'for %%{k} in (!rago_gpu!) do ' + cmd
            n += 1
        out.append(new)
    assert n, vendor
    find = (f'for /f %%{k} in (\'reg query "{GPU_CLASS}" 2^>nul ^| findstr /r /c:"}}\\\\[0-9][0-9][0-9][0-9]"\') do '
            f'for /f %%{l} in (\'reg query "%%{k}" /v MatchingDeviceId 2^>nul ^| findstr /i "ven_{ven}"\') do '
            f'set "rago_gpu=!rago_gpu! %%{k}"')
    head = ['set "rago_gpu="', find, f'if not defined rago_gpu echo - No {label} graphics card found: its driver settings are skipped']
    return sep.join(head + out)


def drop_broken_video_loops(body):
    """gpu_nvidia : boucles où `echo %w%- %%b` donnait « - » comme clé (Control\\Class\\-) ; les boucles juste
    au-dessus font déjà le même travail correctement."""
    sep = _sep(body)
    lines = body.split(sep)
    out, i, n = [], 0, 0
    while i < len(lines):
        if VIDEO_LOOP.search(lines[i]) and any('%w%-' in x for x in lines[i + 1:i + 4]):
            d, j = 0, i
            while True:
                d += _depth(lines[j])
                if d == 0:
                    break
                j += 1
            i, n = j + 1, n + 1
            continue
        out.append(lines[i])
        i += 1
    return sep.join(out), n


def filter_msi(body, vendor):
    ven = VENDOR[vendor][0].upper()
    sep = _sep(body)
    out, n = [], 0
    for line in body.split(sep):
        if VIDEO_LOOP.search(line):
            new = re.sub(r'(?i)findstr /L "(?:PCI\\)?VEN_"', f'findstr /i "VEN_{ven}"', line)
            if new == line:
                new = re.sub(r'''(?i)(PNPDeviceID")('\))''', rf'\1 ^| findstr /i "VEN_{ven}"\2', line)
            assert new != line, line
            line, n = new, n + 1
        out.append(line)
    assert n, vendor
    return sep.join(out)


def nic_keywords(body):
    """ping_main:config3 : propriétés de la carte choisies par leur mot-clé du registre (le même dans toutes les
    langues) au lieu de leur nom affiché anglais. Deux noms pour le même mot-clé et la même valeur : une seule ligne."""
    kw_of = _nic_kw()
    sep = _sep(body)
    out, seen, n = [], set(), 0
    for line in body.split(sep):
        m = re.search(r"-DisplayName '([^']+)' \| Set-NetAdapterAdvancedProperty -RegistryValue (\w+)\"", line)
        if m:
            kw = kw_of[m.group(1).lower()]
            if (kw, m.group(2)) in seen:
                continue
            seen.add((kw, m.group(2)))
            line = line.replace(f"-DisplayName '{m.group(1)}'", f"-RegistryKeyword '{kw}'")
            n += 1
        out.append(line)
    assert n > 20, n
    return sep.join(out)


def guard_affinity(body):
    sep = _sep(body)
    lines = body.split(sep)
    hits = [i for i, x in enumerate(lines) if AFFINITY_LINE.search(x)]
    assert len(hits) == 2, hits
    for i in hits:
        lines[i] = CPU_GUARD + lines[i].lstrip()
    loop = max(i for i in range(hits[0]) if re.match(r'(?i)\s*for\b', lines[i]))
    lines.insert(loop, CPU_SKIP)
    return sep.join(lines)


def add_nla(body):
    sep = _sep(body)
    out = []
    for line in body.split(sep):
        out.append(line)
        if '/v "Throttle Rate"' in line:
            out.append(NLA_LINE)
    assert NLA_LINE in out
    return sep.join(out)


def merge_dx(body):
    sep = _sep(body)
    lines = body.split(sep)
    i = lines.index(DX_OLD)
    return sep.join(lines[:i] + DX_NEW + lines[i + 1:])


def _each(scripts, keys, fn):
    for key in keys:
        tid, _, only = key.partition(':')
        for v in scripts[tid]:
            if not only or v == only:
                scripts[tid][v] = fn(scripts[tid][v])


# Lignes que safety.py retire peut-être déjà (packs GPU Safe sans préemption, RAG-64) : retirées ici seulement si elles
# sont encore là, pour que les deux corrections restent indépendantes l'une de l'autre.
DROP_IF_PRESENT = [
    # pack NVIDIA : coupait la préemption de calcul des cartes AMD (souvent la puce intégrée d'un portable Ryzen)
    (('gpu_nvidia',), r'\(set "REGPATH_AMD=%%i"\) else Reg\.exe add "!REGPATH_AMD!" /v "KMD_EnableComputePreemption"'),
]


def apply(scripts, drop_lines, sub_lines):
    drop_lines(scripts, DROP)
    present = [(ids, pat) for ids, pat in DROP_IF_PRESENT
               if any(re.search(pat, l, re.I) for i in ids for b in scripts[i].values() for l in b.splitlines())]
    drop_lines(scripts, present)
    sub_lines(scripts, SUB)
    for tid in ('gpu_nvidia',):
        for v in scripts[tid]:
            scripts[tid][v], n = drop_broken_video_loops(scripts[tid][v])
            assert n == 3, n
    for tid, vendor in MSI_TARGET.items():
        _each(scripts, (tid,), lambda b, vendor=vendor: filter_msi(b, vendor))
    for tid, vendor in GPU_TARGET.items():
        _each(scripts, (tid,), lambda b, vendor=vendor, tid=tid: target_gpu(b, vendor, tid in REGPATH_IDS))
    _each(scripts, ('ping_main:config3',), nic_keywords)
    _each(scripts, AFFINITY_IDS, guard_affinity)
    _each(scripts, QOS_IDS, add_nla)
    _each(scripts, ('win_fullscreen',), merge_dx)
    check(scripts)


def _lines(scripts, tid, only=None):
    for v, body in scripts[tid].items():
        if only and v != only:
            continue
        for line in body.replace('\r\n', '\n').split('\n'):
            yield v, line


def check(scripts):
    for tid in GPU_TARGET:
        for v, line in _lines(scripts, tid):
            assert not KEY_0000.search(line) and 'regpath_amd' not in line.lower(), (tid, line)
        body = '\n'.join(scripts[tid].values())
        assert body.count('MatchingDeviceId') == len(scripts[tid]) and f'ven_{VENDOR[GPU_TARGET[tid]][0]}' in body, tid
    for tid, vendor in MSI_TARGET.items():
        for v, line in _lines(scripts, tid):
            if VIDEO_LOOP.search(line):
                assert f'findstr /i "VEN_{VENDOR[vendor][0].upper()}"' in line, (tid, line)
    assert not any('%w%-' in line for _, line in _lines(scripts, 'gpu_nvidia'))
    for key in NETSH_IDS + ('net_advanced',):
        tid, _, only = key.partition(':')
        for v, line in _lines(scripts, tid, only or None):
            m = NETSH_GLOBAL.match(line)
            assert not m or m.group(1).lower() in NETSH_GLOBAL_OK, (key, line)
    assert not any('-displayname' in line.lower() for _, line in _lines(scripts, 'ping_main'))
    for tid, vs in scripts.items():
        for v, body in vs.items():
            assert '\\Microsoftd\\' not in body, tid
    for key in AFFINITY_IDS:
        tid, _, only = key.partition(':')
        for v, line in _lines(scripts, tid, only or None):
            if AFFINITY_LINE.search(line):
                assert line.startswith(CPU_GUARD), (key, line)
    for key in QOS_IDS:
        tid, _, only = key.partition(':')
        body = scripts[tid][only]
        assert NLA_LINE in body and '/d "Disabled"' not in body and 'REG_DWORD /d 46' not in body, key
    for v, line in _lines(scripts, 'hitreg_suite'):
        low = line.lower()
        assert 'disable-scheduledtask' not in low and 'disable-mmagent' not in low and 'autogamemode' not in low, line
        assert '"hibernateenabled"' not in low, line
    assert 'rago_dx' in scripts['win_fullscreen']['_']
    assert '"8738"' in scripts['nv_kboost']['_']
    for tid in ('win_services', 'sys_registry', 'win_feed'):
        assert 'Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests"' in scripts[tid]['_'], tid
    # clock gating vidéo AMD : aucun réglage ne le rallume (deux réglages ne se contredisent pas sur la même valeur)
    gating_on = re.compile(r'(?i)/v "?(EnableVceSwClockGating|EnableUvdClockGating)"? /t REG_DWORD /d "?1\b')
    for tid, vs in scripts.items():
        for v, body in vs.items():
            assert not gating_on.search(body), (tid, v)


def catalog(tweaks):
    for tid, reboot in REBOOT.items():
        tweaks[tid]['reboot'] = reboot
    for tid, by_variant in VARIANT_REBOOT.items():
        ids = {v['id'] for v in tweaks[tid]['variants']}
        assert ids == set(by_variant), (tid, ids)
        for v in tweaks[tid]['variants']:
            v['reboot'] = by_variant[v['id']]
    for tid, (en, fr) in NAMES.items():
        tweaks[tid]['name'] = {'en': en, 'fr': fr}


NOTES = '''

# Cohérence des scripts et des textes (1.1.9)

Worker « textes-scripts », 2026-10-13 : `tools/coherence.py` et `tools/descriptions.json`. Sources : Linear RAG-60
(§4 et §5), RAG-27 et les « Points relevés sans correction » de l'audit du 2026-10-07. Les scripts d'avant restent dans
undo.json : un PC qui les a lancés retrouve aussi les valeurs des lignes changées ici.

**Carte graphique visée**
- nv_accel, nv_contig, nv_kboost, gpu_nvidia, amd_general, amd_power, amd_memsleep, amd_delag, gpu_amd écrivaient
  dans `Class\\{4d36e968…}\\0000`, souvent la puce intégrée d'un portable à deux cartes. Le script cherche une fois les
  clés dont `MatchingDeviceId` est du bon fabricant (`ven_10de` NVIDIA, `ven_1002` AMD) et n'écrit que là. Une seule
  carte : même clé qu'avant. Aucune carte du fabricant : rien n'est écrit.
- gpu_amd : `%REGPATH_AMD%` (la dernière clé trouvée) remplacé de la même façon.
- nv_msi, gpu_nvidia, gpu_amd : mode MSI seulement sur les cartes du bon fabricant.
- gpu_nvidia : trois boucles cassées retirées (`echo %w%-` écrivait dans `Control\\Class\\-`) ; les boucles juste
  au-dessus font déjà ce travail. La ligne qui coupait la préemption des cartes AMD (`KMD_EnableComputePreemption`,
  souvent l'iGPU d'un portable Ryzen) quitte ce pack NVIDIA.

**Valeurs**
- nv_kboost : `PerfLevelSrc` 2222 → 8738 (0x2222, comme nv_powermizer).
- amd_power, et la même étape dans gpu_amd et amd_advanced : « Disable Clock Gating » posait 1 ; maintenant 0.
- pow_windows : `EnergyEstimationEnabled` 1 → 0 (le script posait aussi `EnergyEstimationDisabled` 1).
- gpu_amd : texte parasite collé à une commande (`%b%╚═…`) retiré.
- dbl_telemetry, win_telemetry : tâche Office `\\Microsoftd\\` → `\\Microsoft\\`.
- dbl_cortana : `DisableWebSearch` 0 → 1, comme « Recherche Windows sans le web ».
- win_services, sys_registry : `AllowNewsAndInterests` sous `Policies\\Microsoft\\Dsh`, comme win_feed.
- hitreg_suite : `Disable-ScheduledTask` (PowerShell lancé par cmd, sans effet) → `schtasks /change … /disable`.
- ping_packets et net_profile, profil QoS : « Do not use NLA » = "1" ajouté (sinon Windows ignore le marquage hors
  domaine d'entreprise), `DSCP Value` en texte "46" et `Throttle Rate` "-1", comme les écrit Windows.
- ping_main:config3 : propriétés de la carte par `-RegistryKeyword` (toutes langues) au lieu du nom anglais ; Jumbo
  Packet 0 (valeur refusée) devient 1514 (désactivé, comme plus bas), doublons retirés.
- win_fullscreen : `DirectXUserGlobalSettings` fusionné au lieu d'écrasé (Auto HDR gardé).
- net_affinity, in_adapter, ping_main:config4, ping_advanced : l'épinglage sur le processeur n°2 seulement avec 4
  processeurs logiques ou plus.

**Lignes retirées**
- hitreg_suite : `AlwaysOn` 1 et `DisableTaskOffload` 1 (défaits plus bas), mode jeu (affaire de win_gamemode),
  compression mémoire (affaire de « Profil mémoire »), `HibernateEnabled` 0.
- in_advanced : `HibernateEnabled` 0, mode jeu.
- win_gamedvr : `GameDVR_FSEBehaviorMode` 1 et `GameDVR_HonorUserFSEBehaviorMode` 1 (contraires de win_fullscreen).
- exp_io : `ntoskrnl.exe` et `WOW6432Node` (sans effet).
- ping_packets, net_profile, net_advanced : `netsh int tcp set global` refusés par Windows 10 et 11 (chimney, netdma,
  minrto, congestionprovider…) ; net_advanced : `SackOpts` 0.

**Catalogue**
- Redémarrage : net_ipv6, in_mouse, in_keyboard ; net_profile (Knockback et QoS, pas Hitreg).
- Noms : mem_superfetch « Désactiver Superfetch (ancien réglage) », net_ipv6 « Préférer l'IPv4 à l'IPv6 ».
- exp_smb : l'avertissement dit aussi que le PC n'ouvre plus les partages des vieux NAS.
- Textes (descriptions.json) : ping_hitreg, net_adapter, net_powersave, net_advanced, hitreg_suite, in_advanced,
  gpu_nvidia, nv_general, nv_kboost, mc_optifine, exp_smb, win_telemetry, win_optimize, win_services, win_ai,
  dbl_telemetry, sys_bcdedit, pow_main, pow_throttling, pow_windows, win_fullscreen, net_affinity, in_adapter.
- Point de restauration (runner.rs) : la limite d'un point par 24 h est levée le temps de le créer, puis remise.
'''
