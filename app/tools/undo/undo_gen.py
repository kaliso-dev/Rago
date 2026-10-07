"""Scripts d'annulation pour chaque réglage et variante de scripts.json.

Reprend la mécanique de tools/probes.py (mêmes boucles, mêmes conditions, mêmes variables) mais remplace chaque
commande par sa commande inverse :
  full : remet tout aux valeurs de Windows (quand il n'y a pas de sauvegarde)
  rest : seulement ce que la sauvegarde ne relève pas (netsh, PowerShell, auditpol, plans supprimés…)

    python3 undo_gen.py scripts.json catalog.json sortie.json
"""
import collections
import json
import os
import re
import sys

sys.dont_write_bytecode = True  # ne rien écrire dans app/rago-hub/tools
W = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, W)
# tools/probes.py de l'app (mêmes découpages de lignes, de boucles et de conditions que les relevés)
sys.path.insert(0, os.environ.get('RAGO_TOOLS', os.path.join(W, '..')))
import probes as P  # noqa: E402
import defaults as DF  # noqa: E402

R = ' >nul 2>&1'
BALANCED = '381b4222-f694-41f0-9685-ff5bb260df2e'
PLANS = {
    '381b4222-f694-41f0-9685-ff5bb260df2e': 'Utilisation normale',
    '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c': 'Performances élevées',
    'a1841308-3541-4fab-bc81-f71556f20b4a': "Économie d'énergie",
}
KERNEL_SVC = {'gpuenergydrv', 'bam', 'dam', 'amdppm', 'intelppm'}
# auditpol : GUID des sous-catégories (les noms anglais échouent sur un Windows en français)
AUDIT_GUID = {
    'security state change': '0CCE9210', 'security system extension': '0CCE9211', 'system integrity': '0CCE9212',
    'ipsec driver': '0CCE9213', 'other system events': '0CCE9214', 'filtering platform connection': '0CCE9226',
    'process termination': '0CCE922C', 'dpapi activity': '0CCE922D', 'rpc events': '0CCE922E',
}
# Nom affiché anglais d'une propriété de carte réseau → mot-clé du registre (identique dans toutes les langues)
NIC_KW = {
    'arp offload': '*PMARPOffload', 'ns offload': '*PMNSOffload', 'flow control': '*FlowControl',
    'energy-efficient ethernet': '*EEE', 'energy-efficent ethernet': '*EEE', 'advanced eee': 'AdvancedEEE',
    'green ethernet': 'EnableGreenEthernet', 'gigabit lite': 'GigaLite', 'gitabit lite': 'GigaLite',
    'power saving mode': 'PowerSavingMode', 'interrupt moderation': '*InterruptModeration',
    'interrupt moderation rate': 'ITR', 'jumbo packet': '*JumboPacket', 'jumbo frame': '*JumboPacket',
    'large send offload v2 (ipv4)': '*LsoV2IPv4', 'large send offload v2 (ipv6)': '*LsoV2IPv6',
    'ipv4 checksum offload': '*IPChecksumOffloadIPv4', 'tcp checksum offload (ipv4)': '*TCPChecksumOffloadIPv4',
    'tcp checksum offload (ipv6)': '*TCPChecksumOffloadIPv6', 'udp checksum offload (ipv4)': '*UDPChecksumOffloadIPv4',
    'udp checksum offload (ipv6)': '*UDPChecksumOffloadIPv6', 'receive side scaling': '*RSS',
    'maximum number of rss queues': '*NumRssQueues', 'priority & vlan': '*PriorityVLANTag',
    'packet priority & vlan': '*PriorityVLANTag', 'receive buffers': '*ReceiveBuffers',
    'transmit buffers': '*TransmitBuffers', 'wake on magic packet': '*WakeOnMagicPacket',
    'wake on pattern match': '*WakeOnPattern', 'shutdown wake-on-lan': 'S5WakeOnLan',
    'wol & shutdown link speed': 'WolShutdownLinkSpeed', 'wait for link': 'WaitAutoNegComplete',
    'log link state event': 'LogLinkStateEvent', 'gigabit master slave mode': 'MasterSlave',
    'wake on magic packet when system is in the s0ix power state': '*ModernStandbyWoLMagicPacket',
}
NIC_PM = ['*PMARPOffload', '*PMNSOffload', '*PMWiFiRekeyOffload', '*DeviceSleepOnDisconnect', '*SelectiveSuspend',
          '*WakeOnMagicPacket', '*WakeOnPattern', '*ModernStandbyWoLMagicPacket']
# netsh int tcp set global : valeur de Windows (None = paramètre inexistant sur Windows 10/11)
TCP_GLOBAL = {
    'autotuninglevel': 'normal', 'rss': 'default', 'rsc': 'default', 'ecncapability': 'default', 'timestamps': 'default',
    'nonsackrttresiliency': 'default', 'fastopen': 'default', 'fastopenfallback': 'default', 'hystart': 'default',
    'prr': 'default', 'dca': 'default', 'initialrto': '1000', 'maxsynretransmissions': '4',
}
TCP_GLOBAL_SAME = {'autotuninglevel': {'normal'}, 'rss': {'enabled', 'default'}, 'rsc': {'enabled', 'default'},
                   'timestamps': {'disabled', 'default'}, 'nonsackrttresiliency': {'disabled', 'default'},
                   'fastopen': {'enabled', 'default'}, 'dca': {'disabled', 'default'}, 'initialrto': {'1000'},
                   'maxsynretransmissions': {'4'}}
SUPPLEMENTAL = {'internet': 'cubic', 'internetcustom': 'cubic', 'datacenter': 'dctcp', 'datacentercustom': 'dctcp',
                'compat': 'newreno', 'custom': 'cubic'}
IP_GLOBAL = {'taskoffload': 'enabled', 'icmpredirects': 'enabled', 'neighborcachelimit': '256',
             'routecachelimit': '4096', 'sourceroutingbehavior': 'dontforward'}
NETTCP = {'autotuninglevellocal': 'Normal', 'scalingheuristics': 'Disabled', 'initialrto': '1000',
          'maxsynretransmissions': '4', 'minrto': '300', 'nonsackrttresiliency': 'Disabled'}
MMFLAGS = {'-memorycompression': '-MemoryCompression', '-pagecombining': '-PageCombining',
           '-applicationprelaunch': '-ApplicationPreLaunch', '-operationapi': '-OperationAPI'}
PS = 'powershell -NoProfile -ExecutionPolicy Bypass -Command'
# Valeurs écrites sur une clé trouvée par une boucle (« %%g », « %%k\\Device ») dont le défaut est connu
BARE = {'tcpackfrequency': DF.DEL, 'tcpnodelay': DF.DEL, 'tcpdelackticks': DF.DEL,
        'netbiosoptions': ('set', 'REG_DWORD', '0'), 'cacheispowerprotected': DF.DEL, 'userwritecachesetting': DF.DEL}
# Mots-clés de carte réseau écrits dans la clé du pilote (boucles sur Class\\{4D36E972…})
NIC_NAMES = {x.lower() for x in '''*EEE *FlowControl *NumRssQueues *WakeOnMagicPacket *WakeOnPattern AdvancedEEE
AutoDisableGigabit AutoPowerSaveModeEnabled DisableDelayedPowerUp EEE EEELinkAdvertisement EnableConnectedPowerGating
EnableDynamicPowerGating EnableGreenEthernet EnablePME EnablePowerManagement EnableSavePowerNow EnableWakeOnLan
FatChannelIntolerant FlowControlCap GigaLite IPChecksumOffloadIPv4 JumboPacket LsoV1IPv4 LsoV2IPv4 LsoV2IPv6
NicAutoPowerSaver PMARPOffload PMNSOffload PowerDownPll PowerSavingMode RSS RSSProfile ReceiveBuffers
ReduceSpeedOnPowerDown RxAbsIntDelay S5NicKeepOverrideMacAddrV2 S5WakeOnLan TCPChecksumOffloadIPv4
TCPChecksumOffloadIPv6 TransmitBuffers TxAbsIntDelay TxIntDelay UDPChecksumOffloadIPv4 UDPChecksumOffloadIPv6 ULPMode
WakeOnDisconnect WakeOnLink WolShutdownLinkSpeed *NicAutoPowerSaver AlternateSemaphoreDelay MIMOPowerSaveMode'''.split()}

LOG = collections.defaultdict(set)


class Ctx:
    def __init__(self, mode, where):
        self.mode = mode
        self.where = where
        self.sans_retour = []
        self.sauvegarde = []
        self.notes = []
        self.reversible = False
        self.power = []
        self.active = False
        self.plans = []
        self.added = []
        self.nic_kw = []
        self.nic_kw_reg = []
        self.nic_pm = False
        self.svc_start = []
        self.mm = []
        self.hib = False
        self.same = 0

    def add(self, lst, x):
        lst = getattr(self, lst)
        if x not in lst:
            lst.append(x)


C = None


def both(cmd):
    """Commande inverse que la sauvegarde ne couvre pas : dans full et dans rest."""
    C.reversible = True
    return cmd


def full_only(cmd):
    """Commande inverse couverte par la sauvegarde : dans full seulement."""
    C.reversible = True
    return cmd if C.mode == 'full' else None


def backup(what, why):
    C.add('sauvegarde', f'{what} : {why}')


def gone(what):
    C.add('sans_retour', what)


def note(what):
    C.add('notes', what)


def key_out(k):
    """Clé telle qu'elle sera écrite dans le script d'annulation."""
    k = k.strip().strip('"').rstrip('\\')
    for a, b in (('HKEY_LOCAL_MACHINE', 'HKLM'), ('HKEY_CURRENT_USER', 'HKCU'), ('HKEY_USERS', 'HKU'),
                 ('HKEY_CLASSES_ROOT', 'HKCR')):
        if k.upper().startswith(a):
            k = b + k[len(a):]
    k = re.sub(r'\\\\+', r'\\', k)
    return re.sub(r'(?i)\\ControlSet00\d\\', r'\\CurrentControlSet\\', k)


def esc(d):
    return d.replace('%', '%%')


def to_int(x):
    try:
        x = x.strip().strip('"')
        return int(x, 16) if x.lower().startswith('0x') else int(x)
    except (ValueError, AttributeError):
        return None


def same_value(typ, data, dtyp, ddata):
    if data is None:
        return False
    if dtyp == 'REG_DWORD':
        return to_int(data) is not None and to_int(data) == to_int(ddata)
    if dtyp == 'REG_BINARY':
        return data.lower().replace(',', '') == ddata.lower()
    return (typ or 'REG_SZ').upper() == dtyp and data == ddata


def junk_root(key):
    """Pour une clé parasite : le chemin jusqu'au composant fautif inclus."""
    k = key_out(key)
    low = k.lower()
    for kr, vr, a in DF._COMPILED:
        if a[0] == 'clean':
            m = kr.search(DF.norm(key))
            if m:
                p = m.end()
                if p and low[p - 1:p] == '\\':
                    p -= 1
                q = low.find('\\', p)
                return k if q < 0 else k[:q]
    return k


# ---------------------------------------------------------------- registre
def h_reg(raw, c, args, low):
    if not low or low[0] not in ('add', 'delete') or len(args) < 2:
        if low and low[0] in ('import', 'restore', 'load', 'copy'):
            LOG['reg ' + low[0]].add(C.where)
        return None
    op = low[0]
    key = P.unq(args[1])
    name = None
    if '/v' in low and low.index('/v') + 1 < len(args):
        name = P.unq(args[low.index('/v') + 1])
    elif '/ve' in low:
        name = ''
    typ = args[low.index('/t') + 1].upper() if '/t' in low and low.index('/t') + 1 < len(args) else None
    data = P.unq(args[low.index('/d') + 1]) if '/d' in low and low.index('/d') + 1 < len(args) else None
    k = key_out(key)
    nk = DF.norm(key)

    if op == 'delete' and name is None:
        if '/va' in low:
            if re.search(r'comdlg32|runmru|typedpaths|recentdocs', nk):
                gone("historiques de l'Explorateur effacés (fichiers récents, Exécuter, chemins tapés)")
            else:
                backup(k, 'toutes les valeurs de la clé effacées')
            return None
        a = DF.lookup(key, None)
        if re.search(r'shell\\bags$', nk):
            gone("vues des dossiers de l'Explorateur réinitialisées")
        elif a[0] == 'backup':
            backup(k + ' (clé supprimée)', a[1])
        elif a[0] not in ('clean', 'noop', 'del', 'delp', 'delkey'):
            backup(k + ' (clé supprimée)', 'seule la sauvegarde la remet')
        return None

    if op == 'add' and name is None:
        a = DF.lookup(key, None)
        if a[0] == 'delkey':
            return full_only(f'reg delete "{k}" /f{R}')
        if a[0] == 'clean':
            return full_only(f'reg delete "{junk_root(key)}" /f{R}')
        return None

    vflag = f'/v "{esc(name)}"' if name else '/ve'
    bare = re.fullmatch(r'(%%[a-z]|![a-z_]+!|%[a-z_]+%)(\\device)?', nk) is not None
    if bare and name.lower() in NIC_NAMES:
        C.add('nic_kw_reg', name)
    if re.search(r'\\control\\power$', nk) and name.lower() == 'hibernateenabled':
        if to_int(data or '1') == 0:
            C.hib = True
            C.reversible = True
        return None
    a = BARE.get(name.lower()) if bare and name else None
    a = a or DF.lookup(key, name or '(default)')
    kind = a[0]
    if kind == 'svc':
        return svc_reg(key, name, data)
    if kind == 'noop':
        return None
    if kind == 'backup':
        backup(f'{k} › {name or "(par défaut)"}', a[1])
        return None
    if kind == 'set':
        if op == 'add' and same_value(typ, data, a[1], a[2]):
            C.same += 1
            return None
        return full_only(f'reg add "{k}" {vflag} /t {a[1]} /d "{esc(a[2])}" /f{R}')
    if kind in ('del', 'delp'):
        if op == 'delete':
            C.same += 1
            return None
        return full_only(f'reg delete "{k}" {vflag} /f{R}')
    if kind == 'delkey':
        return full_only(f'reg delete "{k}" /f{R}')
    if kind == 'clean':
        if op == 'delete':
            return None
        return full_only(f'reg delete "{junk_root(key)}" /f{R}')
    LOG['reg kind ' + kind].add(C.where)
    return None


def svc_default(svc):
    d = DF.SERVICES.get(svc.lower())
    if d is None:
        LOG['service inconnu ' + svc].add(C.where)
    return d


def svc_reg(key, name, data):
    k = key_out(key)
    svc = k.split('\\')[-1]
    d = svc_default(svc)
    if not d or d[0] is None:
        backup(f'service {svc}', "démarrage d'origine variable")
        return None
    start, delayed = d[0], 'd' in d[1:]
    guard = f'reg query "{k}" /v ImagePath >nul 2>&1 && '
    if name.lower() == 'start':
        if data is not None and to_int(data) == start:
            C.same += 1
            return None
        cmds = [f'reg add "{k}" /v Start /t REG_DWORD /d {start} /f{R}']
        if delayed:
            cmds.append(f'reg add "{k}" /v DelayedAutostart /t REG_DWORD /d 1 /f{R}')
        if start == 2 and svc.lower() not in KERNEL_SVC and '%' not in svc:
            C.add('svc_start', svc)
    else:
        cmds = [f'reg add "{k}" /v DelayedAutostart /t REG_DWORD /d 1 /f{R}' if delayed
                else f'reg delete "{k}" /v DelayedAutostart /f{R}']
    return full_only(' & '.join(guard + x for x in cmds))


# ---------------------------------------------------------------- services
def h_sc(raw, c, args, low):
    if low and low[0] == 'config' and len(args) >= 2 and any(a.startswith('start=') for a in low):
        svc = P.unq(args[1])
        i = next(i for i, a in enumerate(low) if a.startswith('start='))
        orig = low[i][6:] or (low[i + 1] if i + 1 < len(low) else '')
        d = svc_default(svc)
        if not d or d[0] is None:
            backup(f'service {svc}', "démarrage d'origine variable")
            return None
        word = 'delayed-auto' if d[0] == 2 and 'd' in d[1:] else DF.SC_WORD[d[0]]
        if orig == word:
            C.same += 1
            return None
        if d[0] == 2 and svc.lower() not in KERNEL_SVC and '%' not in svc:
            C.add('svc_start', svc)
        return full_only(f'sc config "{svc}" start= {word}{R}')
    if low and low[0] == 'delete':
        gone(f'service {P.unq(args[1])} supprimé')
    return None


# ---------------------------------------------------------------- fsutil, bcdedit, tâches, setx
def h_fsutil(raw, c, args, low):
    if len(low) >= 4 and low[0] == 'behavior' and low[1] == 'set':
        name, val = low[2], low[-1]
        d = DF.FSUTIL.get(name)
        if d is None:
            backup(f'fsutil {name}', 'valeur non répertoriée')
            return None
        if val == d:
            return None
        return full_only(f'fsutil behavior set {name} {d}{R}')
    return None


BCD_SET = {'nx': 'optin', 'bootmenupolicy': 'standard', 'allowedinmemorysettings': '0x15000075',
           'isolatedcontext': 'yes', 'hypervisorlaunchtype': 'auto'}
BCD_SKIP = {'vm'}


def h_bcd(raw, c, args, low):
    if not low:
        return None
    sub = low[0].replace('-', '/')
    if sub == '/timeout':
        return None if len(args) > 1 and args[1] == '30' else full_only(f'bcdedit /timeout 30{R}')
    if sub == '/set' and len(args) >= 3:
        if args[1].startswith('{'):
            store, name, val = args[1], low[2], (low[3] if len(low) > 3 else '')
        else:
            store, name, val = None, low[1], low[2]
        st = f'{store} ' if store else ''
        if name in BCD_SKIP:
            note(f'bcdedit « {name} » : élément inexistant, la commande ne fait rien')
            return None
        if name in BCD_SET:
            if val == BCD_SET[name]:
                return None
            if name == 'hypervisorlaunchtype':
                note("hypervisorlaunchtype remis sur auto (Hyper-V, WSL, intégrité de la mémoire). Sur un PC qui "
                     "n'utilisait aucun des trois, l'état d'origine est l'absence de valeur : la sauvegarde le sait")
            return full_only(f'bcdedit /set {st}{name} {BCD_SET[name]}{R}')
        return full_only(f'bcdedit /deletevalue {st}{name}{R}')
    return None


def h_schtasks(raw, c, args, low):
    if low and low[0] in ('/change', '-change') and '/tn' in low:
        tn = args[low.index('/tn') + 1]
        if '/disable' in low:
            return full_only(f'schtasks /change /tn {P.q(tn)} /enable{R}')
        return None
    if low and low[0] in ('/delete', '-delete'):
        gone(f'tâche planifiée {P.unq(args[low.index("/tn") + 1]) if "/tn" in low else "?"} supprimée')
    return None


def h_setx(raw, c, args, low):
    if not args:
        return None
    k = r'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' if '/m' in low else r'HKCU\Environment'
    return full_only(f'reg delete "{k}" /v "{P.unq(args[0])}" /f{R}')


# ---------------------------------------------------------------- alimentation
def h_powercfg(raw, c, args, low):
    if not low:
        return None
    sub = low[0].lstrip('/-')
    if sub in ('setacvalueindex', 'setdcvalueindex') and len(args) >= 4:
        e = (P.unq(args[1]), P.unq(args[2]), P.unq(args[3]))
        if C.mode == 'full':
            C.add('power', e)
        C.reversible = True
        return None
    if sub in ('change', 'x') and len(low) >= 2:
        alias = re.sub(r'-(ac|dc)$', '', low[1].lstrip('-/'))
        if alias in P.PWR_CHANGE:
            if C.mode == 'full':
                C.add('power', ('scheme_current',) + P.PWR_CHANGE[alias])
            C.reversible = True
        return None
    if sub in ('setactive', 's'):
        if args[1:] and P.unq(args[1]).lower() not in ('scheme_current',):
            C.active = True
            C.reversible = True
        return None
    if sub in ('import', 'duplicatescheme') and len(args) >= 3 and re.fullmatch(r'[0-9a-f-]{36}', P.unq(args[2]).lower()) \
            and P.unq(args[2]).lower() not in PLANS:
        # plan importé sous un GUID fixe : l'annulation peut le retirer
        C.active = True
        C.add('added', P.unq(args[2]).lower())
        C.reversible = True
        return None
    if sub in ('duplicatescheme', 'import'):
        C.active = True
        C.reversible = True
        note("le plan d'alimentation ajouté reste dans la liste de Windows ; l'annulation remet le plan « Utilisation "
             "normale » actif (la sauvegarde remet le plan d'avant)")
        return None
    if sub in ('h', 'hibernate'):
        if len(low) > 1 and low[1] == 'off':
            C.hib = True
            C.reversible = True
        return None
    if sub in ('delete', 'd') and len(args) >= 2:
        g = P.unq(args[1]).lower()
        if g in PLANS:
            C.add('plans', g)
            C.reversible = True
        else:
            gone(f'plan d\'alimentation {g} supprimé')
        return None
    if sub in ('restoredefaultschemes',):
        gone("plans d'alimentation remis à zéro")
    return None


def power_block(entries):
    """Remet chaque réglage d'alimentation à la valeur par défaut de Windows pour le plan concerné."""
    arr = ','.join("@('{}','{}','{}')".format(*e) for e in entries)
    return (f"{PS} \"$a=@{{}}; powercfg /aliases | ForEach-Object {{ $p=@($_ -split '\\s+' | Where-Object {{ $_ }}); "
            "if($p.Count -ge 2){ $a[$p[1].ToUpper()]=$p[0] } }; "
            "function G($x){ if($a.ContainsKey($x.ToUpper())){ $a[$x.ToUpper()] } else { $x } }; "
            "$r='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power'; "
            "$act=(Get-ItemProperty ($r+'\\User\\PowerSchemes')).ActivePowerScheme; "
            f"foreach($e in @({arr})){{ "
            "$s=$(if($e[0] -match 'scheme_current'){ $act } else { G $e[0] }); $u=G $e[1]; $t=G $e[2]; "
            "$d=$r+'\\PowerSettings\\'+$u+'\\'+$t+'\\DefaultPowerSchemeValues\\'; "
            f"$k=$(if(Test-Path ($d+$s)){{ $d+$s }} else {{ $d+'{BALANCED}' }}); "
            "$v=Get-ItemProperty $k -ErrorAction SilentlyContinue; "
            "if($v){ powercfg /setacvalueindex $s $u $t $v.ACSettingIndex; powercfg /setdcvalueindex $s $u $t $v.DCSettingIndex } }; "
            "powercfg /setactive $act\"" + R)


# ---------------------------------------------------------------- réseau
def h_netsh(raw, c, args, low):
    s = ' '.join(low)
    s = re.sub(r'^interface\b', 'int', s)
    s = re.sub(r'^int ipv4\b', 'int ip', s)
    if re.search(r'^(winsock reset|int ip reset|int ipv6 reset|int reset all|int ip reset all)', s) or s == 'int ipv4 reset':
        gone('pile réseau remise à zéro (une IP fixe ou des DNS manuels sont à ressaisir)')
        return None
    if s.startswith('advfirewall reset'):
        gone('pare-feu Windows remis à zéro (les règles ajoutées par les jeux et les applications sont perdues)')
        return None
    m = re.match(r'int tcp set global (.*)$', s)
    if m:
        out = []
        for k, v in re.findall(r'(\w+)=(\S+)', m.group(1)):
            k2 = k.lower()
            if k2 not in TCP_GLOBAL:
                k2 = next((x for x in TCP_GLOBAL if x.startswith(k2)), k2)
            if k2 not in TCP_GLOBAL:
                note(f'netsh « {k} » : paramètre inexistant sur Windows 10/11, la commande ne fait rien')
                continue
            if v.rstrip('ms') in TCP_GLOBAL_SAME.get(k2, set()):
                continue
            out.append(f'netsh int tcp set global {k2}={TCP_GLOBAL[k2]}{R}')
        return both(' & '.join(out)) if out else None
    if re.match(r'int tcp set heuristics', s):
        return None if 'disabled' in s else both(f'netsh int tcp set heuristics disabled{R}')
    if re.match(r'int tcp set security', s):
        return both(f'netsh int tcp set security profiles=enabled{R}') if 'profiles=disabled' in s else None
    m = re.match(r'int tcp set supplemental (?:template=)?(\w+)(.*)$', s)
    if m:
        t = m.group(1)
        full = next((x for x in SUPPLEMENTAL if x == t), None) or next((x for x in sorted(SUPPLEMENTAL, key=len) if x.startswith(t)), None)
        cp = re.search(r'congestionprovider=(\w+)', m.group(2))
        if cp and full:
            if cp.group(1) == SUPPLEMENTAL[full]:
                return None
            return both(f'netsh int tcp set supplemental template={full} congestionprovider={SUPPLEMENTAL[full]}{R}')
        note('netsh supplemental custom : modèle « custom » inutilisé par Windows, sans effet')
        return None
    m = re.match(r'int ip set global (.*)$', s)
    if m:
        out = []
        for k, v in re.findall(r'(\w+)=(\S+)', m.group(1)):
            d = IP_GLOBAL.get(k)
            if d is None:
                LOG['netsh ip global ' + k].add(C.where)
            elif v != d:
                out.append(f'netsh int ip set global {k}={d}{R}')
        return both(' & '.join(out)) if out else None
    m = re.match(r'int (isatap|teredo|6to4) set state (\w+)', s)
    if m:
        return None if m.group(2) == 'default' else both(f'netsh int {m.group(1)} set state default{R}')
    if s.startswith('int ipv6 set state'):
        note('netsh int ipv6 set state : commande inexistante, IPv6 reste actif')
        return None
    if s.startswith('int udp set global'):
        return None if 'uro=enabled' in s else both(f'netsh int udp set global uro=enabled{R}')
    m = re.match(r'int ip set interface (\S+) currenthoplimit=(\d+)', s)
    if m:
        return both(f'netsh int ip set interface {m.group(1)} currenthoplimit=128{R}')
    m = re.match(r'int ip set subinterface .* mtu=(\d+)', s)
    if m:
        if m.group(1) == '1500':
            return None
        return both(f'{PS} "Get-NetAdapter -Physical | Set-NetIPInterface -AddressFamily IPv4 -NlMtuBytes 1500 -ErrorAction SilentlyContinue"{R}')
    if s.startswith('winsock set autotuning'):
        return None if s.endswith('off') else both(f'netsh winsock set autotuning off{R}')
    m = re.match(r'advfirewall firewall add rule name=("[^"]*"|\S+)', ' '.join(args).lower())
    if m:
        name = re.search(r'(?i)name=("[^"]*"|\S+)', ' '.join(args)).group(1)
        return both(f'netsh advfirewall firewall delete rule name={name}{R}')
    LOG['netsh ' + s[:60]].add(C.where)
    return None


def h_powershell(raw, c, args, low):
    t = c
    tl = t.lower()
    if 'remove-appxpackage' in tl:
        m = re.search(r'(?i)Get-AppxPackage\s+(?:-allusers\s+)?\*?([^*|"}]+)\*?', t)
        gone(f'application {m.group(1).strip() if m else "?"} désinstallée (réinstallable depuis le Microsoft Store)')
        return None
    if 'image file execution options' in tl and 'remove-item' in tl:
        gone("TOUTES les options d'exécution des programmes (IFEO) effacées : seule une sauvegarde reg export les remet")
        return None
    if 'pnputil' in tl and 'remove-device' in tl:
        gone('périphériques débranchés retirés du Gestionnaire de périphériques (Windows les redétecte au branchement)')
        return None
    if 'clear-recyclebin' in tl:
        gone('Corbeille vidée')
        return None
    if re.search(r'(?i)optimize-volume|checkpoint-computer|restart-netadapter|write-host|get-mmagent|start-process', t) \
            and not re.search(r'(?i)\b(set|disable|enable)-', t):
        return None
    if 'enable-computerrestore' in tl:
        drives = [d for d in re.findall(r"'([A-Za-z]):\\'", t) if d.upper() != 'C']
        if drives:
            lst = ','.join(f"'{d}:\\'" for d in drives)
            return both(f'{PS} "Disable-ComputerRestore -Drive {lst} -ErrorAction SilentlyContinue"{R}')
        return None
    m = re.search(r'(?i)disable-mmagent((?:\s+-\w+)+)', t)
    if m:
        for f in re.findall(r'-\w+', m.group(1).lower()):
            if f in MMFLAGS:
                C.add('mm', MMFLAGS[f])
        C.reversible = True
        return None
    if re.search(r'(?i)enable-mmagent', t):
        return None
    if re.search(r'(?i)disable-netadapterlso', t):
        return both(f"{PS} \"Enable-NetAdapterLso -Name '*' -ErrorAction SilentlyContinue\"{R}")
    if re.search(r'(?i)disable-netadapterpowermanagement', t):
        C.nic_pm = True
        C.reversible = True
        return None
    m = re.search(r'(?i)set-netoffloadglobalsetting\s+-(\w+)\s+(\w+)', t)
    if m:
        if m.group(2).lower() == 'enabled':
            return None
        return both(f'{PS} "Set-NetOffloadGlobalSetting -{m.group(1)} Enabled"{R}')
    m = re.search(r'(?i)set-nettcpsetting\s+-settingname\s+(\w+)\s+-(\w+)\s+(\w+)', t)
    if m:
        p, v = m.group(2).lower(), m.group(3)
        d = NETTCP.get(p)
        if d is None:
            LOG['nettcp ' + p].add(C.where)
            return None
        if v.lower() == d.lower():
            return None
        return both(f'{PS} "Set-NetTCPSetting -SettingName Internet -{m.group(2)} {d} -ErrorAction SilentlyContinue"{R}')
    m = re.search(r"(?i)-displayname\s+'([^']+)'\s*\|\s*set-netadapteradvancedproperty", t)
    if m:
        kw = NIC_KW.get(m.group(1).lower())
        if kw:
            C.add('nic_kw', kw)
        else:
            LOG['nic displayname ' + m.group(1)].add(C.where)
        C.reversible = True
        note('propriétés de la carte réseau choisies par leur nom anglais : sans effet sur un Windows dans une autre '
             'langue ; l\'annulation passe par le mot-clé du registre (toutes langues)')
        return None
    if re.search(r'(?i)set-processmitigation\s+-system', t):
        k = r'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel'
        return both(f'reg delete "{k}" /v MitigationOptions /f{R} & reg delete "{k}" /v MitigationAuditOptions /f{R}')
    if 'mspower_deviceenable' in tl:
        inv = re.sub(r'(?i)\$false', '$True', P.strip_redir(raw))
        return both(inv + R)
    m = re.search(r'(?i)set-smbclientconfiguration\s+-(\w+)\s+\$(\w+)', t)
    if m:
        if m.group(1).lower() == 'requiresecuritysignature' and m.group(2).lower() == 'true':
            return both(f'{PS} "if([Environment]::OSVersion.Version.Build -lt 26100){{ Set-SmbClientConfiguration '
                        f'-RequireSecuritySignature $False -Force }}"{R}')
        return None
    m = re.search(r'(?i)set-smbserverconfiguration\s+-(\w+)\s+\$(\w+)', t)
    if m:
        if m.group(1).lower() == 'encryptdata' and m.group(2).lower() == 'true':
            return both(f'{PS} "Set-SmbServerConfiguration -EncryptData $False -Force"{R}')
        return None
    if re.search(r'(?i)disable-windowsoptionalfeature.*smb1', t):
        return None
    LOG['ps ' + t[:90]].add(C.where)
    return None


def h_auditpol(raw, c, args, low):
    m = re.search(r'(?i)/subcategory:(?:"([^"]+)"|\{([0-9a-f]{8})-69AE-11D9-BED3-505054503030\})', c)
    if not m:
        return None
    if m.group(2):
        # déjà sous forme d'identifiant (scripts corrigés par l'audit)
        g = m.group(2).upper()
        name = next((n for n, x in AUDIT_GUID.items() if x == g), None)
        if not name:
            LOG['audit ' + g].add(C.where)
            return None
    else:
        name = m.group(1).lower()
        g = AUDIT_GUID.get(name)
        if not g:
            LOG['audit ' + name].add(C.where)
            return None
        note('auditpol avec le nom anglais de la catégorie : sans effet sur un Windows en français ; '
             "l'annulation utilise l'identifiant (toutes langues)")
    s, f = DF.AUDIT.get(name, ('disable', 'disable'))
    return both(f'auditpol /set /subcategory:{{{g}-69AE-11D9-BED3-505054503030}} /success:{s} /failure:{f}{R}')


def h_net(raw, c, args, low):
    if low[:1] == ['accounts'] and any(a.startswith('/maxpwage') for a in low):
        return both(f'net accounts /maxpwage:42{R}')
    return None


ONE_SHOT_FILES = re.compile(r'(?i)temp|prefetch|crashdumps|\\wer\\|softwaredistribution\\download|deliveryoptimization'
                            r'|thumbcache|c:\\nvidia\\|dir /b|__pycache__')


def h_files(head, raw, c, args, low):
    t = ' '.join(args)
    if re.search(r'(?i)microsoft\\edge', t):
        gone('dossier de Microsoft Edge supprimé (réinstaller Edge depuis microsoft.com)')
    elif re.search(r'(?i)onedrive', t):
        gone('dossiers OneDrive supprimés (les fichiers restés seulement dans le dossier local sont perdus)')
    elif re.search(r'(?i)softwaredistribution\\datastore', t):
        gone('historique de Windows Update effacé')
    elif re.search(r'(?i)c:\\windows\\temp$|^/s /q c:\\windows\\temp', t.strip()) and head in ('rd', 'rmdir'):
        gone('dossier Windows\\Temp supprimé puis recréé (ses droits d\'accès d\'origine sont perdus)')
    elif ONE_SHOT_FILES.search(t):
        pass
    else:
        LOG[f'{head} {t[:80]}'].add(C.where)
    return None


def other(head, raw, c, args, low):
    t = ' '.join(low)
    if head in ('del', 'erase', 'rd', 'rmdir', 'forfiles'):
        return h_files(head, raw, c, args, low)
    if head in ('takeown', 'icacls'):
        gone("droits d'accès des dossiers de nettoyage changés (Administrateurs propriétaires)")
        return None
    if head == 'start':
        if 'onedrivesetup' in t and '/uninstall' in t:
            gone('OneDrive désinstallé (réinstallable depuis microsoft.com)')
        return None
    if head == 'nvidiaprofileinspector':
        backup('profil NVIDIA du pilote', "réimporter le profil exporté avant, ou « Restore » du profil Base dans "
               "nvidiaProfileInspector ; réinstaller le pilote NVIDIA remet aussi tout")
        C.reversible = True
        return None
    if head == 'setup' and '--uninstall' in t:
        gone('Microsoft Edge désinstallé (réinstallable depuis microsoft.com ; WebView2 reste en place)')
        return None
    if head in ('rstrui',):
        return None
    if head == 'dism' and 'startcomponentcleanup' in t:
        gone('anciennes versions des composants Windows effacées (les mises à jour déjà installées ne se désinstallent plus)')
        return None
    if head in ('dism', 'cleanmgr', 'lodctr', 'ipconfig', 'taskkill', 'timeout', 'ping', 'call', 'md', 'mkdir',
                'cd', 'pushd', 'popd', 'tasklist', 'find', 'findstr', 'wmic', 'mode', 'sfc', 'disable-scheduledtask',
                'chkdsk', 'explorer', 'msg', 'type', 'copy', 'xcopy', 'move', 'attrib', 'goto', 'net1', 'sleep',
                'powercfg.cpl', 'compact', 'verify', 'choice', 'w32tm', 'gpupdate', 'title'):
        return None
    LOG['commande ' + head].add(C.where)
    return None


HANDLERS = {'reg': h_reg, 'sc': h_sc, 'fsutil': h_fsutil, 'bcdedit': h_bcd, 'schtasks': h_schtasks, 'setx': h_setx,
            'powercfg': h_powercfg, 'netsh': h_netsh, 'powershell': h_powershell, 'pwsh': h_powershell,
            'auditpol': h_auditpol, 'net': h_net}


def undo_cmd(cmd):
    raw = cmd.strip()
    if not raw:
        return ''
    c = P.strip_redir(raw)
    toks = P.tokens(c)
    if not toks:
        return P.NOOP
    head = re.sub(r'(?i)\.exe$', '', P.unq(toks[0]).split('\\')[-1]).lower()
    args = toks[1:]
    low = [a.lower() for a in args]
    if head in ('set', 'setlocal', 'endlocal', 'exit', 'shift'):
        return raw
    fn = HANDLERS.get(head)
    out = fn(raw, c, args, low) if fn else other(head, raw, c, args, low)
    return out or P.NOOP


def undo_chain(text):
    out = []
    for piece, op in P.split_top(text, ('&&', '||', '&')):
        p = piece.strip()
        lead = ''
        while p.startswith('('):
            lead += '('
            p = p[1:].lstrip()
        trail = ''
        while p.endswith(')') and P.unquoted(p).count('(') < P.unquoted(p).count(')'):
            trail = ')' + trail
            p = p[:-1].rstrip()
        if not p:
            body = ''
        elif '|' in [o for _, o in P.split_top(p, ('|',))][:-1]:
            first = P.split_top(p, ('|',))[0][0].strip()
            last = P.split_top(p, ('|',))[-1][0].strip()
            body = undo_cmd(last) if re.match(r'(?i)^echo\b', first) else P.NOOP
            if body == P.NOOP and not re.match(r'(?i)^(echo|wmic|reg query|sc query|dir|type|findstr|find)\b', first):
                LOG['tube ' + p[:80]].add(C.where)
        elif re.match(r'(?i)^(if|for)\b', p):
            body = P.dry_line(p)
        else:
            body = undo_cmd(p)
        seg = (lead + ' ' + body if lead and body else lead + body) + (' ' + trail if trail and body else trail)
        out.append(seg.strip())
        if op:
            out.append('&')
    return ' '.join(x for x in out if x).strip(' &')


P.dry_cmd = undo_cmd
P.dry_chain = undo_chain

# ---------------------------------------------------------------- mise en forme
EFFECT = re.compile(r'(?i)(^|[\s&(])(reg|sc|netsh|powershell|bcdedit|fsutil|schtasks|auditpol|net|powercfg)\s')
KEEP = re.compile(r'(?i)(^|[\s&(])(set|setlocal|endlocal|exit|shift)\b')


def depth_delta(line):
    u = P.unquoted(line)
    return u.count('(') - u.count(')')


SETVAR = re.compile(r'(?i)\bset\s+(?:/a\s+)?"?([A-Za-z_]\w*)\s*[-+*/]?=')
STAY = re.compile(r'(?i)^\s*@?(setlocal|endlocal|shift)\b')


def refs(name, lines):
    pat = re.compile(r'(?i)([%!]' + re.escape(name) + r'[%!:])|(\bdefined\s+' + re.escape(name) + r'\b)')
    return any(pat.search(l) for l in lines)


def units(lines):
    """(début, fin) de chaque bloc entre parenthèses, « ) else ( » et « ) do ( » compris dans le même bloc."""
    out, stack = [], []
    for i, l in enumerate(lines):
        s = l.strip()
        if s.startswith(')'):
            if re.match(r'(?i)^\)\s*else\b', s) or depth_delta(s[1:]) > 0:
                continue
            if stack:
                out.append((stack.pop(), i))
            continue
        if depth_delta(s) > 0 or re.match(r'(?i)^for\b.*\bin\s*\(\s*$', s):
            stack.append(i)
    return out


def removable(part, others):
    if any(EFFECT.search(x) for x in part):
        return False
    names = {m.group(1) for x in part for m in SETVAR.finditer(x)}
    return not any(refs(n, others) for n in names)


def prune(lines):
    """Retire les lignes et les blocs qui ne font plus rien (en gardant les variables encore lues ailleurs)."""
    lines = [l for l in lines if l.strip() and l.strip() != P.NOOP]
    changed = True
    while changed:
        changed = False
        for o, j in sorted(units(lines), key=lambda u: u[1] - u[0]):
            if removable(lines[o:j + 1], lines[:o] + lines[j + 1:]):
                lines = lines[:o] + lines[j + 1:]
                changed = True
                break
        if changed:
            continue
        inside = set()
        for o, j in units(lines):
            inside.update((o, j))
        for i, l in enumerate(lines):
            s = l.strip()
            if i in inside or s.startswith(')') or depth_delta(s) != 0 or STAY.match(s):
                continue
            if removable([l], lines[:i] + lines[i + 1:]):
                lines = lines[:i] + lines[i + 1:]
                changed = True
                break
    return lines


def balance(lines):
    """Retire les « ) » orphelins et ferme les blocs restés ouverts (scripts d'origine mal parenthésés)."""
    out, d = [], 0
    for l in lines:
        s = l.strip()
        if s.startswith(')') and not (re.match(r'(?i)^\)\s*else\b', s) or depth_delta(s[1:]) > 0):
            if d == 0:
                continue
            d -= 1
        elif depth_delta(s) > 0 or re.match(r'(?i)^for\b.*\bin\s*\(\s*$', s):
            d += 1
        out.append(l)
    return out + [')'] * d


FOR_ONE = re.compile(r'(?i)^(\s*)for\s+(?:/[a-z]\s+(?:"[^"]*"\s+)?)?(%%[a-z])\s+in\s+\(.*?\)\s+do\s+(?!\()(.+)$')


def unwrap(l):
    # « for /f %%m in ('…') do reg add … /d "3670016" » : la boucle ne sert plus si la commande
    # inverse n'utilise pas sa variable (la valeur de Windows a remplacé %%m)
    m = FOR_ONE.match(l)
    if m and m.group(2).lower() not in m.group(3).lower():
        return m.group(1) + m.group(3)
    return l


def finish(text, epilogue):
    lines = prune(balance([unwrap(l) for l in text.split('\r\n')]))
    seen, out = set(), []
    depth = 0
    for l in lines:
        s = l.strip()
        if out and s == out[-1].strip() and EFFECT.search(s):
            continue
        top = depth == 0 and depth_delta(s) == 0 and not s.startswith(')')
        if top and EFFECT.search(s) and not re.match(r'(?i)^(for|if)\b', s):
            if s in seen:
                continue
            seen.add(s)
        out.append(l)
        depth += depth_delta(s)
    if not any(EFFECT.search(l) for l in out) and not epilogue:
        return None
    # l'épilogue passe avant un « exit » de premier niveau
    depth, pos = 0, len(out)
    for i, l in enumerate(out):
        s = l.strip()
        if depth == 0 and re.match(r'(?i)^exit\b', s):
            pos = i
            break
        depth += depth_delta(s)
    out = ['@echo off'] + out[:pos] + epilogue + out[pos:]
    return '\r\n'.join(out)


def epilogue(ctx):
    e = []
    full = ctx.mode == 'full'
    kws = list(ctx.nic_kw) + ([k for k in ctx.nic_kw_reg if k not in ctx.nic_kw] if full else [])
    if ctx.nic_pm:
        kws += [k for k in NIC_PM if k not in kws]
    if kws:
        lst = ','.join(f"'{k}'" for k in kws)
        e.append(f"{PS} \"foreach($k in @({lst})){{ Reset-NetAdapterAdvancedProperty -Name '*' -RegistryKeyword $k "
                 f"-ErrorAction SilentlyContinue }}\"{R}")
    if ctx.nic_pm:
        e.append(f"{PS} \"Set-NetAdapterPowerManagement -Name '*' -AllowComputerToTurnOffDevice Enabled "
                 f"-ErrorAction SilentlyContinue\"{R}")
    if full and ctx.power:
        e.append(power_block(ctx.power))
    for g in ctx.plans:
        e.append(f'powercfg /query {g} >nul 2>&1 || powercfg -duplicatescheme {g} {g}{R}')
    if full and (ctx.active or ctx.plans):
        e.append(f'powercfg /setactive {BALANCED}{R}')
    elif ctx.added and ctx.plans:
        # rest lancé AVANT la sauvegarde (plans supprimés) : le plan ajouté est encore actif et Windows refuse
        # de supprimer le plan actif. On passe sur « Utilisation normale », la sauvegarde remet ensuite le plan d'avant
        e.append(f'powercfg /setactive {BALANCED}{R}')
    for g in ctx.added:
        # après la sauvegarde (qui remet le plan d'avant) ou après « Utilisation normale » : il n'est plus actif
        e.append(f'powercfg -delete {g}{R}')
    if full and ctx.hib:
        e.append(f'powercfg /hibernate on{R}')
    if full:
        for s in ctx.svc_start:
            e.append(f'sc start "{s}"{R}')
    if ctx.mm:
        e.append(f'sc start SysMain{R}')
        e.append(f'{PS} "Enable-MMAgent {" ".join(ctx.mm)} -ErrorAction SilentlyContinue"{R}')
    return e


def run(body, mode, where):
    global C
    C = Ctx(mode, where)
    # « ) > nul » ferme un bloc : la redirection ne doit pas en faire une commande
    body = re.sub(r'(?m)^(\s*\))\s*\d?>\s*nul\s*(2>&1)?\s*$', r'\1', body)
    text = P.dry_script(body)
    return finish(text, epilogue(C)), C


NATIVE = {
    'mc_optifine': "réglage natif de l'app (options.txt de Minecraft) : l'app garde une copie du fichier",
    'nv_profile': "profil NVIDIA appliqué par nvidiaProfileInspector : l'annulation réimporte le profil d'origine "
                  "exporté avant (ou « Restore » du profil Base dans l'outil)",
    'rst_point': "point de restauration : rien à annuler",
}


def main(scripts_path, catalog_path, out_path):
    scripts = json.load(open(scripts_path))
    catalog = json.load(open(catalog_path))
    reverts = set()
    for m in catalog['modules']:
        for s in m.get('sections', []):
            for t in s.get('tweaks', []):
                for v in t.get('variants') or []:
                    if v.get('revert'):
                        reverts.add((t['id'], v['id']))
    out = {}
    for tid, variants in scripts.items():
        out[tid] = {}
        for v, body in variants.items():
            where = f'{tid}:{v}'
            if (tid, v) in reverts:
                out[tid][v] = {'full': None, 'rest': None, 'retour': True, 'ponctuel_sans_retour': False,
                               'notes': ['variante « retour » : elle remet elle-même les valeurs, rien à annuler']}
                continue
            full, cf = run(body, 'full', where)
            rest, _ = run(body, 'rest', where)
            entry = {'full': full, 'rest': rest,
                     'ponctuel_sans_retour': not cf.reversible and not cf.sauvegarde,
                     'sans_retour': cf.sans_retour, 'sauvegarde_seulement': cf.sauvegarde, 'notes': cf.notes}
            if tid in NATIVE:
                entry['notes'] = [NATIVE[tid]] + entry['notes']
                entry['ponctuel_sans_retour'] = tid == 'rst_point'
            elif entry['ponctuel_sans_retour'] and cf.same and not cf.sans_retour:
                entry['notes'].append('ce réglage écrit déjà les valeurs de Windows : rien à annuler')
            if cf.plans:
                entry['rest_avant'] = True
                entry['notes'].append("plans d'alimentation supprimés : lancer « rest » AVANT de remettre la sauvegarde, "
                                      "sinon le plan actif d'avant n'existe plus quand la sauvegarde le réactive")
            if 'mspower_deviceenable' in body.lower():
                entry['notes'].append("remet « Autoriser l'ordinateur à éteindre ce périphérique » sur tous les "
                                      "périphériques ; quelques pilotes le laissent décoché par défaut")
            out[tid][v] = entry
    for tid, why in NATIVE.items():
        if tid not in out:
            out[tid] = {'_': {'full': None, 'rest': None, 'ponctuel_sans_retour': tid == 'rst_point', 'notes': [why]}}
    return out


META = {'_': {'full': None, 'rest': None, 'lisez_moi': [
    "Même forme que src-tauri/scripts/undo.json : réglage → variante → {full, rest}. Les autres champs sont "
    "ignorés par serde (struct Undo sans deny_unknown_fields) : le fichier se charge tel quel.",
    "full : remet les valeurs de Windows quand il n'y a pas de sauvegarde (réglage appliqué avant 1.1.6 ou par l'ancien .bat).",
    "rest : seulement ce que la sauvegarde ne relève pas (netsh, PowerShell, auditpol, plans d'alimentation supprimés, "
    "règle de pare-feu, net accounts). À lancer après la remise de la sauvegarde, sauf si rest_avant vaut true.",
    "ponctuel_sans_retour : true = action ponctuelle (nettoyage, désinstallation, point de restauration) ou qui écrit déjà "
    "les valeurs de Windows : la case ne devrait pas rester cochée.",
    "sans_retour : ce qu'aucune annulation ne remet. sauvegarde_seulement : valeurs dont seule la sauvegarde connaît "
    "l'état d'origine (valeurs de pilote, bornes d'alimentation…) ; full n'y touche pas.",
    "retour : variante « retour » du catalogue, rien à annuler.",
    "Scripts au format .bat (CRLF, % doublés), à lancer en administrateur comme les réglages. Redémarrer le PC après.",
    "Généré par audit/outils-annulation/undo_gen.py depuis scripts.json : à relancer après chaque changement des scripts "
    "(DROP_LINES, SUB_LINES…) : python3 audit/outils-annulation/undo_gen.py <scripts.json> <catalog.json> <sortie.json>",
]}}


if __name__ == '__main__':
    res = {'_meta': META}
    res.update(main(*sys.argv[1:3], None))
    json.dump(res, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
    for k, ids in sorted(LOG.items()):
        print(f'{k} | {",".join(sorted(ids))[:120]}')
