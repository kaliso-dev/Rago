# Valeurs par défaut de Windows 10/11 (installation propre) pour ce que les réglages modifient.
# Action : ('set', type, data) | ('del',) sûr | ('delp',) probablement absent par défaut | ('delkey',)
#          | ('clean',) clé parasite créée par erreur | ('backup', raison) | ('svc',) | ('noop',)
import re

SZ, DW, BIN, EXP = 'REG_SZ', 'REG_DWORD', 'REG_BINARY', 'REG_EXPAND_SZ'
DEL = ('del',)
DELP = ('delp',)
NOOP = ('noop',)


def S(d):
    return ('set', SZ, d)


def D(d):
    return ('set', DW, str(d))


def B(why):
    return ('backup', why)


CC = r'hklm\\system\\currentcontrolset'
MM = CC + r'\\control\\session manager\\memory management'
SP = r'hklm\\software\\microsoft\\windows nt\\currentversion\\multimedia\\systemprofile'
TCP = CC + r'\\services\\tcpip\\parameters'
CPL = r'hkcu\\control panel'
CU = r'hkcu\\software\\microsoft\\windows\\currentversion'

MOUSE_X = '0000000000000000156e000000000000004001000000000029dc0300000000000000280000000000'
MOUSE_Y = '0000000000000000fd11010000000000002404000000000000fc12000000000000c0bb0100000000'

# (regex de clé, regex de valeur ou None pour toutes, action) : la première qui correspond gagne
RULES = [
    # --- clés parasites créées par des fautes dans les scripts ---
    (r'\\control\\class\{4d36e968', None, ('clean',)),
    (CC + r'\\services\\gpuenergydr$', None, ('clean',)),
    (r'\\power\\powersettings\\[0-9a-f]{8}_', None, ('clean',)),
    (r'policies &#8203', None, ('clean',)),
    (r'^hklm\\software\\microsoft\\windowsnt\\', None, ('clean',)),
    (r'image file execution options\\javaw\.exe\.exe', None, ('clean',)),
    (r'^hklm\\currentcontrolset\\', None, NOOP),  # HKLM\CurrentControlSet : refusé par Windows, rien n'est créé
    (r'\\enum\\%a(\\|$)', None, ('clean',)),

    # --- stratégies : absentes par défaut ---
    (r'\\policies\\microsoft\\windows\\qos\\[^\\]+$', None, ('delkey',)),
    (r'\\policies\\', None, DEL),
    (r'^hk(lm|cu)\\software\\policies$', None, DEL),

    # --- Multimedia Class Scheduler ---
    (SP + r'$', r'systemresponsiveness', D(20)),
    (SP + r'$', r'networkthrottlingindex', D(10)),
    (SP + r'$', None, DEL),
    (SP + r'\\tasks\\low latency$', None, ('delkey',)),
    (SP + r'\\tasks\\games$', r'affinity', D(0)),
    (SP + r'\\tasks\\games$', r'background only', S('False')),
    (SP + r'\\tasks\\games$', r'clock rate', D(10000)),
    (SP + r'\\tasks\\games$', r'gpu priority', D(8)),
    (SP + r'\\tasks\\games$', r'priority', D(2)),
    (SP + r'\\tasks\\games$', r'scheduling category', S('Medium')),
    (SP + r'\\tasks\\games$', r'sfio priority', S('Normal')),
    (SP + r'\\tasks\\games$', None, DEL),
    (SP + r'\\tasks\\audio$', r'affinity', D(0)),
    (SP + r'\\tasks\\audio$', r'background only', S('True')),
    (SP + r'\\tasks\\audio$', r'clock rate', D(10000)),
    (SP + r'\\tasks\\audio$', r'gpu priority', D(8)),
    (SP + r'\\tasks\\audio$', r'priority', D(6)),
    (SP + r'\\tasks\\audio$', r'scheduling category', S('Medium')),
    (SP + r'\\tasks\\audio$', r'sfio priority', S('Normal')),
    (SP + r'\\tasks\\audio$', None, DEL),
    (SP + r'\\tasks\\displaypostprocessing$', r'affinity', D(0)),
    (SP + r'\\tasks\\displaypostprocessing$', r'background only', S('True')),
    (SP + r'\\tasks\\displaypostprocessing$', r'backgroundpriority', D(24)),
    (SP + r'\\tasks\\displaypostprocessing$', r'clock rate', D(10000)),
    (SP + r'\\tasks\\displaypostprocessing$', r'gpu priority', D(18)),
    (SP + r'\\tasks\\displaypostprocessing$', r'priority', D(8)),
    (SP + r'\\tasks\\displaypostprocessing$', r'scheduling category', S('High')),
    (SP + r'\\tasks\\displaypostprocessing$', r'sfio priority', S('Normal')),
    (SP + r'\\tasks\\displaypostprocessing$', None, DEL),
    (SP + r'\\tasks\\window manager$', r'affinity', D(0)),
    (SP + r'\\tasks\\window manager$', r'background only', S('True')),
    (SP + r'\\tasks\\window manager$', r'clock rate', D(10000)),
    (SP + r'\\tasks\\window manager$', r'gpu priority', D(8)),
    (SP + r'\\tasks\\window manager$', r'priority', D(5)),
    (SP + r'\\tasks\\window manager$', r'scheduling category', S('Medium')),
    (SP + r'\\tasks\\window manager$', r'sfio priority', S('Normal')),
    (SP + r'\\tasks\\window manager$', None, DEL),

    # --- mémoire, priorités, contrôle ---
    (MM + r'$', r'largesystemcache|disablepagingexecutive|clearpagefileatshutdown|nonpagedpoolquota|nonpagedpoolsize|pagedpoolquota|pagedpoolsize|secondleveldatacache|systempages', D(0)),
    (MM + r'$', r'sessionpoolsize', D(4)),
    (MM + r'$', r'sessionviewsize', D(48)),
    (MM + r'$', r'physicaladdressextension', D(1)),
    (MM + r'$', r'featuresettings$', DELP),
    (MM + r'$', None, DEL),
    (MM + r'\\prefetchparameters$', r'enableprefetcher', D(3)),
    (MM + r'\\prefetchparameters$', None, DELP),
    (CC + r'\\control\\prioritycontrol$', r'win32priorityseparation', D(2)),
    (CC + r'\\control\\prioritycontrol$', r'convertibleslatemode', B("mode tablette des 2-en-1 : valeur gérée par Windows")),
    (CC + r'\\control\\prioritycontrol$', None, DEL),
    (CC + r'\\control$', r'waittokillservicetimeout', S('5000')),
    (CC + r'\\control$', r'svchostsplitthresholdinkb', D(3670016)),
    (CC + r'\\control$', None, DEL),
    (CC + r'\\control\\session manager$', r'protectionmode', D(1)),
    (CC + r'\\control\\session manager$', None, DEL),
    (CC + r'\\control\\session manager\\power$', r'hiberbootenabled', D(1)),
    (CC + r'\\control\\session manager\\power$', None, DEL),
    (CC + r'\\control\\session manager\\environment$', None, DEL),
    (CC + r'\\control\\session manager\\(kernel|executive|i/o system|quota system|throttle)$', None, DEL),
    (CC + r'\\control\\crashcontrol$', r'crashdumpenabled', D(7)),
    (CC + r'\\control\\crashcontrol$', None, DEL),
    (CC + r'\\control\\crashcontrol\\storagetelemetry$', r'devicedumpenabled', D(1)),
    (CC + r'\\control\\crashcontrol\\storagetelemetry$', None, DEL),
    (CC + r'\\control\\lsa$', r'restrictanonymous$', D(0)),
    (CC + r'\\control\\lsa$', r'restrictanonymoussam', D(1)),
    (CC + r'\\control\\lsa$', r'runasppl', B("protection LSA : avec la valeur 1, Windows la garde dans une variable UEFI ; supprimer la valeur ne suffit pas")),
    (CC + r'\\control\\lsa$', None, DEL),
    (CC + r'\\control\\remote assistance$', None, D(1)),
    (CC + r'\\control\\deviceguard\\scenarios\\hypervisorenforcedcodeintegrity$', None, B("intégrité de la mémoire : choix de l'utilisateur ou du fabricant")),
    (CC + r'\\control\\wmi\\autologger\\(mellanox-kernel|wifidriverihvsessionrepro|winphonecritical|holographicdevice|iclsclient|iclsproxy|socketheciserver|tcpiplogger|setupplatformtel|datamarket|cellcore)$', None, B("journal système : valeur d'origine variable selon le PC")),
    (CC + r'\\control\\wmi\\autologger\\', r'^start$', D(1)),
    (CC + r'\\control\\wmi\\autologger\\', None, B("journal système")),
    (CC + r'\\control\\power\\powersettings\\.*\\defaultpowerschemevalues', None, B("valeur par défaut d'un plan d'alimentation réécrite : seule la sauvegarde la remet")),
    (CC + r'\\control\\power\\powersettings\\', r'attributes', B("réglage d'alimentation affiché ou masqué (cosmétique)")),
    (CC + r'\\control\\power\\powersettings\\', None, B("bornes d'un réglage d'alimentation : seule la sauvegarde les remet")),
    (CC + r'\\control\\power\\pdc\\', None, B("politique de veille moderne")),
    (CC + r'\\control\\power\\energyestimation\\', None, B("paramètres d'estimation d'énergie")),
    (CC + r'\\control\\power$', r'hibernateenabled$', B("remis par powercfg -h on")),
    (CC + r'\\control\\power$', r'customizeduringsetup', NOOP),
    (CC + r'\\control\\power', None, DEL),
    (CC + r'\\control\\processor$', None, DEL),
    (CC + r'\\control\\graphicsdrivers', None, DEL),
    (CC + r'\\control\\filesystem$', None, B("remis par fsutil")),
    (CC + r'\\control\\(kernelvelocity|diagnostics\\performance|storage|storagedevicepolicies|lsa\\credssp)$', None, DEL),
    (CC + r'\\control\\securityproviders\\wdigest$', None, DEL),
    (CC + r'\\control\\nsi\\', None, B("table réseau binaire : seule la sauvegarde la remet")),
    (CC + r'\\control\\class\\\{4d36e968-e325-11ce-bfc1-08002be10318\}\\[^\\]+\\umd', None, B("réglage du pilote AMD : réinitialiser les paramètres Radeon ou réinstaller le pilote")),
    (CC + r'\\control\\class\\\{4d36e968-e325-11ce-bfc1-08002be10318\}\\', r'^(pp_|enableulps|kmd_|stuttermode|enableaspm|.*gating)', B("réglage du pilote AMD : réinstaller le pilote remet tout")),
    (CC + r'\\control\\class\\\{4d36e968-e325-11ce-bfc1-08002be10318\}\\', None, DELP),
    (r'^%regpath_amd%|^!regpath_amd!|^!regpath!', None, B("réglage du pilote AMD (clé trouvée par le script)")),
    (CC + r'\\control\\class\\%%', None, B("réglage du pilote (clé trouvée par le script)")),
    (r'^%%b$', r'^%%a$', B("économie d'énergie USB et périphériques : valeur fixée par chaque pilote")),
    (r'^%%b$', r'^pnpcapabilities$', DEL),
    (r'^%%b$', None, B("réglage avancé de la carte réseau : remis par Reset-NetAdapterAdvancedProperty")),

    # --- périphériques (Enum) ---
    (r'\\enum\\.*\\affinity policy$', None, DEL),
    (r'\\enum\\.*\\messagesignaledinterruptproperties$', None, B("mode MSI fixé par le pilote : seule la sauvegarde le remet")),
    (r'\\enum\\.*\\device parameters(\\wdf|\\disk)?$', None, DELP),
    (r'^%%[a-z]$', None, B("valeur de périphérique (clé trouvée par le script)")),
    (r'^%%[a-z]\\', None, B("valeur de périphérique (clé trouvée par le script)")),

    # --- services ---
    (CC + r'\\services\\[^\\]+$', r'^start$', ('svc',)),
    (CC + r'\\services\\[^\\]+$', r'^delayedautostart$', ('svc',)),
    (CC + r'\\services\\tcpip\\parameters$', r'ipenablerouter|forwardbroadcasts|dontadddefaultgatewaydefault', D(0)),
    (CC + r'\\services\\tcpip\\parameters$', r'enableicmpredirect|syncdomainwithmembership|usedomainnamedevolution|deadgwdetectdefault', D(1)),
    (CC + r'\\services\\tcpip\\parameters$', None, DEL),
    (CC + r'\\services\\tcpip\\parameters\\winsock$', None, D(16)),
    (CC + r'\\services\\tcpip\\parameters\\interfaces', None, DEL),
    (CC + r'\\services\\tcpip\\serviceprovider$', r'localpriority', D(499)),
    (CC + r'\\services\\tcpip\\serviceprovider$', r'hostspriority', D(500)),
    (CC + r'\\services\\tcpip\\serviceprovider$', r'dnspriority', D(2000)),
    (CC + r'\\services\\tcpip\\serviceprovider$', r'netbtpriority', D(2001)),
    (CC + r'\\services\\lanmanserver\\parameters$', r'restrictnullsessaccess', D(1)),
    (CC + r'\\services\\lanmanserver\\parameters$', r'autodisconnect', D(15)),
    (CC + r'\\services\\w32time\\parameters$', r'^type$', S('NTP')),
    (CC + r'\\services\\sharedaccess\\parameters\\firewallpolicy\\firewallrules', None, B("règles du pare-feu : seule la sauvegarde les remet")),
    (CC + r'\\services\\nvlddmkm\\fts$', None, B("télémétrie du pilote NVIDIA : réinstaller le pilote remet tout")),
    (CC + r'\\services\\', None, DEL),
    (r'^hklm\\system\\maps$', None, D(1)),
    (r'^hklm\\system\\resourcepolicystore', None, B("politique de ressources de Windows : seule la sauvegarde la remet")),

    # --- panneau de configuration (HKCU) ---
    (CPL + r'\\mouse$', r'^mousespeed$', S('1')),
    (CPL + r'\\mouse$', r'^mousethreshold1$', S('6')),
    (CPL + r'\\mouse$', r'^mousethreshold2$', S('10')),
    (CPL + r'\\mouse$', r'^mousesensitivity$', S('10')),
    (CPL + r'\\mouse$', r'^smoothmousexcurve$', ('set', BIN, MOUSE_X)),
    (CPL + r'\\mouse$', r'^smoothmouseycurve$', ('set', BIN, MOUSE_Y)),
    (CPL + r'\\mouse$', r'^mousehovertime$', S('400')),
    (CPL + r'\\mouse$', r'^(mousehoverheight|mousehoverwidth|doubleclickheight|doubleclickwidth)$', S('4')),
    (CPL + r'\\mouse$', r'^doubleclickspeed$', S('500')),
    (CPL + r'\\mouse$', r'^(beep|extendedsounds)$', S('No')),
    (CPL + r'\\mouse$', r'^(mousetrails|snaptodefaultbutton)$', S('0')),
    (CPL + r'\\mouse$', r'^activewindowtracking$', D(0)),
    (CPL + r'\\mouse$', r'^swapmousebuttons$', B("choix de l'utilisateur (gaucher ou droitier)")),
    (CPL + r'\\mouse$', None, DELP),
    (CPL + r'\\keyboard$', r'keyboarddelay', S('1')),
    (CPL + r'\\keyboard$', r'keyboardspeed', S('31')),
    (CPL + r'\\keyboard$', r'initialkeyboardindicators', B("état du Verr. Num au démarrage (choix de l'utilisateur ; défaut 2147483648)")),
    (CPL + r'\\desktop$', r'^menushowdelay$', S('400')),
    (CPL + r'\\desktop$', r'^fontsmoothing$', S('2')),
    (CPL + r'\\desktop$', r'^fontsmoothingtype$', D(2)),
    (CPL + r'\\desktop$', r'^foregroundlocktimeout$', D(200000)),
    (CPL + r'\\desktop$', r'^mousewheelrouting$', D(2)),
    (CPL + r'\\desktop$', r'^userpreferencesmask$', ('set', BIN, '9E1E078012000000')),
    (CPL + r'\\desktop$', None, DEL),
    (CPL + r'\\desktop\\windowmetrics$', r'minanimate', S('1')),
    (CPL + r'\\desktop\\windowmetrics$', None, DEL),
    (CPL + r'\\accessibility$', None, D(1)),
    (CPL + r'\\accessibility\\keyboard response$', r'^flags$', S('126')),
    (CPL + r'\\accessibility\\keyboard response$', r'^delaybeforeacceptance$', S('1000')),
    (CPL + r'\\accessibility\\keyboard response$', r'^last valid wait$', D(1000)),
    (CPL + r'\\accessibility\\keyboard response$', None, D(0)),
    (CPL + r'\\accessibility\\stickykeys$', r'^flags$', S('510')),
    (CPL + r'\\accessibility\\togglekeys$', r'^flags$', S('62')),
    (CPL + r'\\accessibility\\mousekeys$', r'^flags$', S('62')),
    (CPL + r'\\accessibility\\mousekeys$', r'^maximumspeed$', S('80')),
    (CPL + r'\\accessibility\\mousekeys$', r'^timetomaximumspeed$', S('3000')),
    (CPL + r'\\accessibility\\highcontrast$', r'^flags$', S('126')),
    (CPL + r'\\accessibility\\soundsentry$', r'^flags$', S('2')),
    (CPL + r'\\accessibility\\soundsentry$', None, S('0')),
    (CPL + r'\\accessibility\\', None, B("réglage d'accessibilité")),
    (CPL + r'\\cursors$', r'^\(default\)$', S('Windows Default')),
    (CPL + r'\\cursors$', r'^scheme source$', D(2)),
    (CPL + r'\\cursors$', r'^contactvisualization$', D(1)),
    (CPL + r'\\cursors$', r'^gesturevisualization$', D(31)),
    (CPL + r'\\cursors$', r'^(crosshair|ibeam)$', ('set', EXP, '')),
    (CPL + r'\\cursors$', r'^appstarting$', ('set', EXP, r'%SystemRoot%\cursors\aero_working.ani')),
    (CPL + r'\\cursors$', r'^arrow$', ('set', EXP, r'%SystemRoot%\cursors\aero_arrow.cur')),
    (CPL + r'\\cursors$', r'^hand$', ('set', EXP, r'%SystemRoot%\cursors\aero_link.cur')),
    (CPL + r'\\cursors$', r'^help$', ('set', EXP, r'%SystemRoot%\cursors\aero_helpsel.cur')),
    (CPL + r'\\cursors$', r'^no$', ('set', EXP, r'%SystemRoot%\cursors\aero_unavail.cur')),
    (CPL + r'\\cursors$', r'^nwpen$', ('set', EXP, r'%SystemRoot%\cursors\aero_pen.cur')),
    (CPL + r'\\cursors$', r'^sizeall$', ('set', EXP, r'%SystemRoot%\cursors\aero_move.cur')),
    (CPL + r'\\cursors$', r'^sizenesw$', ('set', EXP, r'%SystemRoot%\cursors\aero_nesw.cur')),
    (CPL + r'\\cursors$', r'^sizens$', ('set', EXP, r'%SystemRoot%\cursors\aero_ns.cur')),
    (CPL + r'\\cursors$', r'^sizenwse$', ('set', EXP, r'%SystemRoot%\cursors\aero_nwse.cur')),
    (CPL + r'\\cursors$', r'^sizewe$', ('set', EXP, r'%SystemRoot%\cursors\aero_ew.cur')),
    (CPL + r'\\cursors$', r'^uparrow$', ('set', EXP, r'%SystemRoot%\cursors\aero_up.cur')),
    (CPL + r'\\cursors$', r'^wait$', ('set', EXP, r'%SystemRoot%\cursors\aero_busy.ani')),
    (CPL + r'\\international\\user profile$', None, DEL),
    (CPL + r'\\powercfg\\', None, B("ancienne politique d'alimentation binaire")),
    (CPL, None, B("réglage du Panneau de configuration")),
    (r'^hku\\\.default\\control panel\\desktop$', r'^menushowdelay$', S('400')),
    (r'^hku\\\.default\\control panel\\desktop$', r'^foregroundlocktimeout$', D(200000)),
    (r'^hku\\\.default\\control panel\\desktop$', r'^mousewheelrouting$', D(2)),
    (r'^hku\\\.default\\control panel\\mouse$', r'^mousespeed$', S('1')),
    (r'^hku\\\.default\\control panel\\mouse$', r'^mousethreshold1$', S('6')),
    (r'^hku\\\.default\\control panel\\mouse$', r'^mousethreshold2$', S('10')),
    (r'^hku\\\.default\\control panel\\mouse$', r'^mousehovertime$', S('400')),
    (r'^hku\\\.default\\control panel\\mouse$', None, S('No')),
    (r'^hku\\\.default\\control panel\\sound$', None, S('yes')),
    (r'^hkcu\\keyboard layout\\toggle$', r'^layout hotkey$', S('2')),
    (r'^hkcu\\keyboard layout\\toggle$', None, S('1')),
    (r'^hkcu\\software\\microsoft\\ctf\\langbar$', r'showstatus', D(4)),
    (r'^hkcu\\software\\microsoft\\ctf\\langbar$', r'label', D(1)),
    (r'^hkcu\\software\\microsoft\\ctf\\langbar$', r'transparency', D(255)),
    (r'^hkcu\\software\\microsoft\\ctf\\langbar$', None, D(0)),

    # --- Explorateur, jeu, recherche (HKCU) ---
    (CU + r'\\explorer\\advanced$', r'^iconsonly$', D(0)),
    (CU + r'\\explorer\\advanced$', r'^listviewshadow$', D(1)),
    (CU + r'\\explorer\\advanced$', None, DEL),
    (CU + r'\\contentdeliverymanager$', r'(enabled|allowed)$', D(1)),
    (CU + r'\\contentdeliverymanager$', None, DEL),
    (CU + r'\\search$', r'^isassignedaccess$', D(0)),
    (CU + r'\\search$', r'^devicehistoryenabled$', D(1)),
    (CU + r'\\search$', r'^iswindowshelloactive$', NOOP),
    (CU + r'\\search$', None, DEL),
    (CU + r'\\searchsettings$', r'^safesearchmode$', D(1)),
    (CU + r'\\searchsettings$', None, DEL),
    (CU + r'\\cdp$', r'^nearsharechanneluserauthzpolicy$', D(0)),
    (CU + r'\\cdp$', None, D(1)),
    (CU + r'\\pushnotifications$', r'^toastenabled$', D(1)),
    (CU + r'\\pushnotifications$', r'^databasemigrationcompleted$', NOOP),
    (CU + r'\\pushnotifications$', None, DEL),
    (CU + r'\\themes\\personalize$', r'enabletransparency', D(1)),
    (CU + r'\\immersiveshell$', r'^tabletmode$', D(0)),
    (CU + r'\\immersiveshell$', None, B("mode tablette des 2-en-1")),
    (CU + r'\\storagesense\\', None, B("Assistant stockage : choix de l'utilisateur")),
    (CU + r'\\explorer\\accent$', None, B("couleur d'accentuation du thème")),
    (CU + r'\\explorer\\visualeffects\\themes$', None, NOOP),
    (CU + r'\\capabilityaccessmanager\\consentstore\\[^\\]+$', r'^value$', S('Allow')),
    (CU + r'\\capabilityaccessmanager\\consentstore\\[^\\]+\\', None, DEL),
    (CU + r'\\deviceaccess\\global\\', None, S('Allow')),
    (CU + r'\\settingsync\\', None, DEL),
    (r'^hkcu\\software\\microsoft\\windows\\dwm$', r'^enableaeropeek$', D(1)),
    (r'^hkcu\\software\\microsoft\\windows\\dwm$', r'^(accentcolor|colorization)', B("couleurs du thème")),
    (r'^hkcu\\software\\microsoft\\windows\\dwm$', None, DEL),
    (r'^hkcu\\system\\gameconfigstore$', r'^gamedvr_enabled$', D(1)),
    (r'^hkcu\\system\\gameconfigstore$', r'^gamedvr_fsebehaviormode$', D(2)),
    (r'^hkcu\\system\\gameconfigstore$', r'^(gamedvr_honoruserfsebehaviormode|gamedvr_dxgihonorfsewindowscompatible|gamedvr_efsefeatureflags)$', D(0)),
    (r'^hkcu\\system\\gameconfigstore$', r'^win32_', B("profils Game Mode effacés : seule la sauvegarde les remet")),
    (r'^hkcu\\system\\gameconfigstore', None, DEL),
    (r'^hkcu\\software\\microsoft\\directx\\usergpupreferences$', None, B("réglages graphiques de Windows (Auto HDR, VRR…)")),
    (r'^hkcu\\software\\microsoft\\inputpersonalization$', None, D(0)),
    (r'^hkcu\\software\\microsoft\\inputpersonalization\\traineddatastore$', r'harvestcontacts', D(1)),
    (r'^hkcu\\software\\classes\\local settings\\software\\microsoft\\windows\\shell\\bags', None, NOOP),
    (r'^hkcu\\software\\nvidia corporation\\', None, B("réglage du panneau NVIDIA")),
    (r'^hkcu\\', None, DEL),
    (r'^hku\\s-1-5-20\\', None, DEL),

    # --- HKLM\SOFTWARE ---
    (r'^hklm\\software\\microsoft\\policymanager\\default\\applicationmanagement\\allowgamedvr$', None, D(1)),
    (r'^hklm\\software\\microsoft\\policymanager\\default\\dmaguard\\deviceenumerationpolicy$', None, D(1)),
    (r'^hklm\\software\\microsoft\\policymanager\\default\\update\\excludewudriversinqualityupdate$', None, D(0)),
    (r'^hklm\\software\\microsoft\\policymanager\\default\\update$', None, DEL),
    (r'^hklm\\software\\microsoft\\policymanager\\default\\', r'^value$', D(1)),
    (r'^hklm\\software\\microsoft\\policymanager\\current\\', None, DEL),
    (r'^hklm\\software\\microsoft\\windows photo viewer\\capabilities\\fileassociations$', r'^\.tiff?$', S('PhotoViewer.FileAssoc.Tiff')),
    (r'^hklm\\software\\microsoft\\windows photo viewer\\', None, DEL),
    (r'^hklm\\software\\microsoft\\windows\\currentversion\\explorer$', r'^smartscreenenabled$', S('Warn')),
    (r'^hklm\\software\\microsoft\\windows\\currentversion\\driversearching$', None, D(1)),
    (r'^hklm\\software\\microsoft\\windows\\currentversion\\explorer\\mycomputer\\namespace', None, B("dossier « Objets 3D » de Windows 10 (absent de Windows 11)")),
    (r'^hklm\\software\\microsoft\\windows\\currentversion\\run$', r'^nvbackend$', B("démarrage de NVIDIA Backend : réinstaller GeForce Experience le remet")),
    (r'^hklm\\software\\microsoft\\windows nt\\currentversion\\schedule\\taskcache', None, B("cache des tâches planifiées : seule la sauvegarde le remet")),
    (r'^hklm\\software\\microsoft\\windows nt\\currentversion\\image file execution options\\[^\\]+\\perfoptions$', None, ('delkey',)),
    (r'^hklm\\software\\(wow6432node\\)?microsoft\\windows nt\\currentversion\\image file execution options\\[^\\]+\\perfoptions$', None, ('delkey',)),
    (r'^hklm\\software\\microsoft\\windows nt\\currentversion\\image file execution options\\lsass\.exe$', r'auditlevel', DEL),
    (r'^hklm\\software\\microsoft\\windows nt\\currentversion\\image file execution options\\', None, DEL),
    (r'^hklm\\software\\microsoft\\windows\\dwm$', r'^overlaytestmode$', DEL),
    (r'^hklm\\software\\microsoft\\windows defender\\', None, B("Defender : protégé contre les modifications")),
    (r'^hklm\\software\\nvidia corporation\\', None, DELP),
    (r'^hklm\\software\\intel\\', None, DELP),
    (r'^hkcr\\', None, B("classe COM (dossier OneDrive dans l'Explorateur)")),
    (r'^hklm\\software\\', None, DELP),
]

_COMPILED = [(re.compile(k), re.compile(v) if v else None, a) for k, v, a in RULES]


def norm(key):
    k = key.strip().strip('"').rstrip('\\')
    for a, b in (('HKEY_LOCAL_MACHINE', 'HKLM'), ('HKEY_CURRENT_USER', 'HKCU'), ('HKEY_USERS', 'HKU'), ('HKEY_CLASSES_ROOT', 'HKCR')):
        if k.upper().startswith(a):
            k = b + k[len(a):]
    k = re.sub(r'\\\\+', r'\\', k)
    k = re.sub(r'(?i)\\ControlSet00\d\\', r'\\CurrentControlSet\\', k)
    return k.lower()


def lookup(key, value):
    k = norm(key)
    v = (value or '(default)').lower()
    for kr, vr, a in _COMPILED:
        if kr.search(k) and (vr is None or vr.search(v)):
            return a
    return ('backup', 'valeur non répertoriée')


# Services : démarrage par défaut (2 auto, 3 manuel, 4 désactivé, 1 système) ; d = démarrage différé ; tp = logiciel tiers
SERVICES = {
    'amdppm': (3,), 'intelppm': (3,), 'appinfo': (3,), 'bam': (1,), 'dam': (1,),
    'bluetoothuserservice': (3,), 'btagservice': (3,), 'bthavctpsvc': (3,), 'bthserv': (3,),
    'cscservice': (3,), 'diagnosticshub.standardcollector.service': (3,), 'diagtrack': (2,),
    'dmwappushservice': (3,), 'dps': (2,), 'dsmsvc': (3,), 'eventlog': (2,), 'pcasvc': (2,),
    'schedule': (2,), 'sysmain': (2,), 'fax': (3,), 'hvhost': (3,), 'lanmanworkstation': (2,),
    'lmhosts': (3,), 'mapsbroker': (2, 'd'), 'printnotify': (3,), 'remoteregistry': (4,),
    'seclogon': (3,), 'spooler': (2,), 'tabletinputservice': (3,), 'wbiosrvc': (3,), 'wersvc': (3,),
    'wisvc': (3,), 'wsearch': (2, 'd'), 'xblauthmanager': (3,), 'xblgamesave': (3,), 'xboxgipsvc': (3,),
    'xboxnetapisvc': (3,), 'vmicguestinterface': (3,), 'vmicheartbeat': (3,), 'vmickvpexchange': (3,),
    'vmicrdv': (3,), 'vmicshutdown': (3,), 'vmictimesync': (3,), 'vmicvmsession': (3,),
    'gpuenergydrv': (2,), 'xbgm': (3, 'tp'),
    'edgeupdate': (2, 'd', 'tp'), 'edgeupdatem': (3, 'tp'), 'microsoftedgeelevationservice': (3, 'tp'),
    'googlechromeelevationservice': (3, 'tp'), 'gupdate': (2, 'd', 'tp'), 'gupdatem': (3, 'tp'),
    'nvtelemetrycontainer': (2, 'tp'), 'amdlog': (None, 'tp'),
    '%%s': (2,),  # CDPUserSvc_xxxx dans la boucle de rbw_mode
}
SC_WORD = {1: 'system', 2: 'auto', 3: 'demand', 4: 'disabled'}

# fsutil behavior set : valeur par défaut
FSUTIL = {'disablelastaccess': '2', 'disable8dot3': '2', 'memoryusage': '1', 'mftzone': '1', 'encryptpagingfile': '0',
          'disabledeletenotify': '0', 'disablecompression': '0', 'disableencryption': '0'}

# auditpol : défaut (succès, échec)
AUDIT = {'security state change': ('enable', 'disable'), 'system integrity': ('enable', 'enable'),
         'other system events': ('enable', 'enable')}
