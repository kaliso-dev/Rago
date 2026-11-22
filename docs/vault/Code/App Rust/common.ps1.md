---
type: code
tags: [code, app, powershell, réseau, packet-optimizer]
fichier: app/src-tauri/netopt/common.ps1
lignes: 620
maj: 2026-11-10
---
# common.ps1

**Partie gratuite** du moteur PowerShell du Packet Optimizer : les outils communs (sortie, registre, cartes réseau, plan d'alimentation, mesures), la **remise exacte** (`restore`), la **remise aux valeurs de Windows** (`defaults`) et les **tests** (`quality`, `loaded`, `mtu`, `detect`, `status`). Fiche parente : [[netopt.rs]]. Fonctionnalités : [[Packet Optimizer]] et [[Test réseau]] (Diagnostic avancé).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Repris du `network_optimizer.bat` v2 de Sofiene (Minecraft PvP : enregistrement des coups et recul).
- [[netopt.rs]] le place en tête du script (avant [[apply.ps1]] et [[main.ps1]]), l'écrit dans `run\`, le lance caché puis le supprime.
- Livré dans la partie **gratuite** des scripts scellés (`"netopt"` dans `embed_scripts.rs`) : la remise et les tests marchent **sans licence**. C'est ce qui permet la remise automatique en fin de licence (`netopt::put_back`, appelée par [[lib.rs]] et `reset.rs`).
- Les choix de la page arrivent par l'environnement : `O_*` (choix bruts) et `C_*` (valeurs exactes calculées par `compute` dans [[netopt.rs]]).

## Ce que le fichier expose

### Constantes
- `$Dir` = `RN_DIR` ; `snapshot.json` (sauvegarde) et `log.txt` (journal) dans ce dossier.
- `$Games` : `javaw.exe`, `java.exe`, `Minecraft.Windows.exe`.
- `$BgApps` (gros téléchargeurs, marqués « fond » par [[apply.ps1]]) : `steam.exe`, `EpicGamesLauncher.exe`, `OneDrive.exe`, `Dropbox.exe`, `GoogleDriveFS.exe`, `qbittorrent.exe`, `uTorrent.exe`, `BitTorrent.exe`, `Battle.net.exe`.
- `$QosTag = 'Rago_Net_'` : préfixe des stratégies QoS créées par Rago (seules celles-là sont supprimées).
- Clés de registre : `$MM` (`HKLM\…\Multimedia\SystemProfile`), `$GTask` (`…\SystemProfile\Tasks\Games`), `$IFEO` (Image File Execution Options), `$TcpIf` (`Tcpip\Parameters\Interfaces`), `$QosK` (`Tcpip\QoS`), `$PrioK` (`Control\PriorityControl`), `$DoK` (Delivery Optimization du compte `S-1-5-20`), `$DvrK` (`HKCU\System\GameConfigStore`), `$CapK` (`HKCU\…\GameDVR`), `$GbK` (`HKCU\Software\Microsoft\GameBar`).
- Plans d'alimentation de Windows : `$HighPerf` (Performances élevées, `8c5e7fda-…`), `$Balanced` (Utilisation normale, `381b4222-…`), `$PowerSaver` (Économie d'énergie, `a1841308-…`). Réglage « économie d'énergie de la carte Wi-Fi » : sous-groupe `19cbb8fa-…`, réglage `12bbebe6-…`.
- Mots-clés des pilotes (indépendants de la langue ; ceux en `*` sont les mots-clés NDIS standard) :

| Groupe | Mots-clés |
|---|---|
| `$KwLatency` (tampons) | `*InterruptModeration`, `ITR`, `*FlowControl`, `*LsoV2IPv4`, `*LsoV2IPv6`, `*LsoV1IPv4`, `*PacketCoalescing`, `*RscIPv4`, `*RscIPv6` |
| `$KwPower` (économies d'énergie) | `*EEE`, `EEE`, `EEELinkAdvertisement`, `AdvancedEEE`, `EnableGreenEthernet`, `GigaLite`, `PowerSavingMode`, `ULPMode`, `SipsEnabled`, `ReduceSpeedOnPowerDown`, `AutoPowerSaveModeEnabled`, `*SelectiveSuspend` |
| `$KwWifi` | `RoamAggressiveness`, `uAPSDSupport`, `MIMOPowerSaveMode` |

`$AllKw` = les trois groupes (24 mots-clés) ; `$KwNames` donne leur nom lisible dans le journal.

### Sortie (protocole lu par [[netopt.rs]])
- `Log(tag, msg)` : écrit `@@NO|<tag>|<msg>` et l'ajoute à `log.txt` avec la date ; compte `OK` (réussi), `!` (avertissement), `X` (échec) ; `..` = information.
- `Title` → `@@NO|#|…` ; `Step(i, n)` → `@@NO|%|i|n` ; `Result(objet)` → `@@NO|=|<JSON compact>` ; `Summary` → `@@NO|sum|ok|warn|fail`.

### Outils
- `EnvStr(nom, défaut)`, `EnvInt(nom, défaut)` (entier de 1 à 6 chiffres, sinon le défaut), `On(nom)` (vaut `1`).
- `NS(args)` lance `netsh.exe`, `CmdLine` lance `cmd.exe /d /c` ; la sortie va dans `$script:nsOut` (pour les messages d'erreur).
- Registre : `RGet`, `RSet` (crée la clé si besoin), `RDel`, `Conv`.
- `Get-Tracked` : **toutes les valeurs de registre que l'application peut changer** (sauvegardées avant la première application, remises par `restore`) : `NetworkThrottlingIndex`, `SystemResponsiveness` ; `GPU Priority`, `Priority`, `Scheduling Category`, `SFIO Priority` (tâche Games) ; `Win32PrioritySeparation` ; `GameDVR_Enabled`, `AppCaptureEnabled`, `AutoGameModeEnabled` ; `Do not use NLA` ; `DownloadMode` ; `CpuPriorityClass` des 3 exes Minecraft (IFEO `PerfOptions`) ; `TcpAckFrequency`, `TcpDelAckTicks`, `TCPNoDelay` de **chaque** interface.
- `Snap-Reg`, `Revert-Reg(p, n, t)` (remet la valeur d'avant, ou la supprime si elle n'existait pas), `Clean-Ifeo(exe)` (supprime les clés IFEO vides).
- Cartes réseau : `Get-Nics` (physiques et connectées), `Get-AllNics` (physiques), `Test-Wifi` (802.11, `NdisPhysicalMedium` 9 ou nom « Wireless/Wi-Fi/WLAN »), `Get-Prop`.
- `Set-Kw(carte, mot-clé, valeurs voulues)` : prend la première valeur voulue que le pilote accepte, ne fait rien si déjà réglée, applique **sans redémarrer** la carte (`-NoRestart`) et note la carte à redémarrer ; « the driver refused » si le pilote refuse.
- `Set-KwByLabel` : choisit la valeur dont le libellé correspond (pilotes qui numérotent leurs choix).
- `Revert-Kw` : remet la valeur de la sauvegarde (même `InterfaceDescription`), sinon la valeur par défaut du pilote. `Reset-Kw` : valeur par défaut du pilote. `Want-Kw(on)` : `Set-Kw` si l'option est active, sinon `Revert-Kw`.
- `Set-Pm(carte, mode)` : gestion d'énergie de la carte (`AllowComputerToTurnOffDevice`, `D0PacketCoalescing`, `SelectiveSuspend`, `DeviceSleepOnDisconnect`). `off` = tout désactivé ; `orig` = valeurs de la sauvegarde (rien sans sauvegarde) ; `default` = sauvegarde, ou à défaut seulement « Windows peut éteindre la carte » réactivé. Une propriété non réglable est gardée (`..`).
- `Restart-Nics` : redémarre les cartes notées, attend qu'elles soient connectées (**30 s** au plus, contrôle toutes les 800 ms) puis qu'une route par défaut revienne (**45 s** au plus) ; sinon avertissement « still reconnecting ».
- Plan d'alimentation : `Get-ActiveScheme`, `Get-Schemes` (par `powercfg /getactivescheme` et `/list`), `Get-WifiPow`/`Set-WifiPow` (valeurs secteur et batterie du réglage Wi-Fi), `Refresh-Scheme` (réactive le plan pour prendre le changement).
- `Get-MainIf` : interface IPv4 connectée de la route par défaut à la plus petite métrique (route + interface).
- `Get-Target` : cible de `O_TARGET` (défaut `1.1.1.1`), sans le port ; une adresse IPv4 est gardée telle quelle ; sinon enregistrement SRV `_minecraft._tcp.<nom>` s'il existe, puis première adresse IPv4.
- `Find-Mtu(ip)` : ping avec « ne pas fragmenter » (TTL 64, délai 1 200 ms, 2 essais par taille) ; rien à 548 octets → `null` ; 1 472 passe → **1 500** ; sinon recherche par dichotomie entre 548 et 1 472, résultat = taille + 28 (en-têtes IP et ICMP).
- `Ping-Series(ip, nombre, écart, …)` : pings de 32 octets, délai 1 000 ms, progression tous les 5 pings ; s'arrête si la condition `keepGoing` devient fausse.
- `Stats` : `Min`, `Max`, `Avg`, `Med`, `P95`, `Jitter` (écart moyen entre deux pings successifs), `Loss` (%), `Spikes` (pings au-dessus du minimum + 30 ms).
- `Load-Snapshot`, `Remove-QosOurs` (supprime les stratégies QoS `Rago_Net_*`).

## Fonctionnement détaillé

### `Do-Restore` (remise exacte : bouton « Restaurer » > « Mes réglages d'origine »)
1. Pas de `snapshot.json` lisible → `X` « No readable backup found. Use Reset to Windows defaults instead. », code **1**.
2. Supprime les stratégies QoS de Rago.
3. TCP global (`netsh int tcp set global`) : `autotuninglevel`, `initialrto`, `timestamps`, `ecncapability`, `nonsackrttresiliency` aux valeurs sauvegardées ; algorithme de congestion du modèle `internet` (sauf `default`) ; `minrto`, `delayedacktimeout`, `delayedackfrequency`, `icw` seulement s'ils diffèrent de la valeur actuelle.
4. Déchargement global : `ReceiveSegmentCoalescing` et `PacketCoalescingFilter` sauvegardés.
5. Toutes les valeurs de `Get-Tracked` remises (`Revert-Reg`), clés IFEO vides supprimées.
6. Chaque carte physique : les 24 mots-clés remis (`Revert-Kw`), gestion d'énergie `orig` ; liaison `ms_pacer` (Planificateur de paquets QoS) remise comme avant ; redémarrage des cartes.
7. MTU de chaque interface remis s'il a changé (`netsh interface ipv4 set subinterface … store=persistent`) ; réglage Wi-Fi de chaque plan remis ; plan d'alimentation d'avant réactivé.
8. Redémarre le service `DoSvc`, vide le cache DNS, **archive** la sauvegarde en `snapshot-restored-<aaaaMMjj-HHmmss>.json` : la prochaine application en refait une neuve. Code 0.

### `Do-Defaults` (bouton « Restaurer » > « Valeurs de Windows » ; sans licence, le bouton « Restaurer » choisit `restore` s'il y a une sauvegarde, sinon `defaults`)
Marche avec ou sans sauvegarde.
- Stratégies QoS de Rago supprimées.
- `netsh int tcp set global` : `autotuninglevel=normal`, `rss=enabled`, `initialrto=1000`, `timestamps=disabled`, `ecncapability=default`, `nonsackrttresiliency=disabled`.
- Modèle `internet` : `congestionprovider=cubic` ; `minrto=300`, `delayedacktimeout=40`, `delayedackfrequency=2`, `icw=10` (seulement si différent).
- `ReceiveSegmentCoalescing` activé ; `PacketCoalescingFilter` de la sauvegarde s'il y en a une.
- Registre : `TcpAckFrequency`, `TcpDelAckTicks`, `TCPNoDelay` supprimés de chaque interface ; `NetworkThrottlingIndex` = **10** ; `SystemResponsiveness` = **20** ; tâche Games : `GPU Priority` **8**, `Priority` **2**, `Scheduling Category` **Medium**, `SFIO Priority` **Normal** ; `Win32PrioritySeparation` = **2** ; `GameDVR_Enabled` = **1** ; `AppCaptureEnabled`, `AutoGameModeEnabled`, `Do not use NLA`, `DownloadMode` supprimés ; `CpuPriorityClass` des exes Minecraft supprimé.
- Cartes : les 24 mots-clés remis à la valeur du pilote (`Reset-Kw`), gestion d'énergie `default`, redémarrage.
- MTU remis aux valeurs de la sauvegarde s'il y en a une, sinon laissé (`..`).
- Économie d'énergie Wi-Fi : Utilisation normale = secteur 0 / batterie 2 ; Performances élevées = 0 / 0.
- Plan : **seulement** si Performances élevées est actif → Utilisation normale. Un plan personnalisé (Rago Low Latency) choisi par le joueur reste actif.
- Redémarre `DoSvc`, vide le cache DNS. Code 0. La sauvegarde n'est pas archivée.

### Tests (rien n'est changé dans Windows ; outils de `NetTools.tsx`, dont « Diagnostic avancé » de [[NetTest.tsx]] : `quality`, `loaded`, `mtu`)
- `Do-Quality` (« Test de stabilité ») : **100 pings** espacés de 100 ms vers la cible. Adresse introuvable → `X`, code 1. Aucune réponse → résultat `noAnswer: true` (« this server blocks ping »), code 1. Résultat `{kind: "quality", ip, min, avg, p95, max, jitter, loss, spikes, stable}` ; `stable` = pertes ≤ 1 %, gigue ≤ 5 ms et `p95 − min` ≤ 25 ms.
- `Do-Loaded` (« Test de bufferbloat », latence sous charge ; la page demande confirmation) : 30 pings au repos, puis 2 téléchargements `curl.exe` de 100 Mo en parallèle depuis `speed.cloudflare.com` (12 s au plus chacun, 200 Mo au plus), 1,5 s d'attente, puis jusqu'à 100 pings tant qu'un téléchargement tourne. `curl.exe` absent (Windows 10 avant 1803) → `X`. Note selon `delta` = médiane chargée − médiane au repos : **A+** < 5 ms, **A** < 30, **B** < 60, **C** < 200, **D** < 400, sinon **F**. Résultat `{kind: "loaded", ip, idleMed, idleJitter, busyMed, busyJitter, busyLoss, delta, grade}`.
- `Do-Mtu` (« Mesurer le MTU ») : `Find-Mtu` vers la cible, puis vers `1.1.1.1` si rien. Résultat `{kind: "mtu", ip, mtu, current, alias}` (MTU actuel de l'interface principale). Ping bloqué → `!`.
- `Do-Detect` : `{kind: "detect", connected, wifi, alias, desc, speed, backup}` (`backup` = date de `snapshot.json`).
- `Do-Status` (« État actuel ») : tableau de lignes `{s, k, v}` par section : `tcp` (fenêtre de réception, congestion, RTO initial et minimal, délai et fréquence d'ACK, horodatages, ECN, résilience RTT, RSS, RSC, filtre de regroupement), `main` (interface principale, MTU, `TcpAckFrequency`, `TcpDelAckTicks`), `nic` (chaque carte connectée et ses réglages suivis), `qos` (stratégies `Rago_Net_*` et leur DSCP), `power` (plan actif, `NetworkThrottlingIndex`, `SystemResponsiveness`, priorité processeur de Minecraft : `high` si `CpuPriorityClass` de `javaw.exe` vaut 3). Une valeur absente s'affiche « Windows default ».

## Données touchées

- Fichiers : `netopt\snapshot.json` (lu), `snapshot-restored-*.json` (écrit par `restore`), `log.txt` (ajout à chaque ligne).
- Windows : TCP global et modèle `internet`, déchargement global, registre (liste de `Get-Tracked`), 24 réglages avancés et gestion d'énergie des cartes réseau, liaison `ms_pacer`, MTU, stratégies QoS `Rago_Net_*`, réglage Wi-Fi des plans, plan actif, service `DoSvc`, cache DNS.
- Réseau : pings vers la cible et téléchargements de test (`loaded`).

## Erreurs et cas limites

- `$ErrorActionPreference = 'SilentlyContinue'` : une commande qui échoue ne coupe pas le script ; chaque étape importante écrit son propre `!` ou `X`.
- Remettre ou réinitialiser **redémarre les cartes réseau** (coupure de quelques secondes, attente jusqu'à 45 s).
- Une cible qui bloque le ping donne `noAnswer` : la page propose `1.1.1.1` (la ligne seule).
- `Find-Mtu` ne distingue pas « paquet trop gros » d'un ping perdu deux fois : [[apply.ps1]] refait la mesure et refuse un résultat sous 1 280.

## Liens avec le reste

- Assemblé et lancé par [[netopt.rs]] ; complété par [[apply.ps1]] (Premium) ; point d'entrée [[main.ps1]].
- Interface : [[NetOpt.tsx]] (bouton « Restaurer » et outils), [[NetTest.tsx]] (« Diagnostic avancé »). Fonctionnalités : [[Packet Optimizer]], [[Test réseau]].

## Tests

Pas de test PowerShell. Les tests Rust de [[netopt.rs]] vérifient le texte : ASCII, aucune commande interactive (`engine_text_is_safe_to_run_hidden`), chaque variable lue est passée (`engine_gets_every_variable_it_reads`), pas de `Do-Apply` ni de `Take-Snapshot` dans cette partie (`apply_needs_the_premium_part`).

## À savoir avant de modifier

- Toute valeur de registre que [[apply.ps1]] change doit être ajoutée à `Get-Tracked`, sinon `restore` ne la remet pas.
- Tout mot-clé de pilote changé doit être dans `$AllKw` (sauvegarde, remise, état).
- Garder `Do-Restore`, `Do-Defaults` et les tests **ici** (partie gratuite) : la remise doit marcher sans licence.
- Ne jamais supprimer une stratégie QoS qui ne commence pas par `Rago_Net_`.
- Texte en ASCII seulement, jamais de saisie ni de fenêtre.
