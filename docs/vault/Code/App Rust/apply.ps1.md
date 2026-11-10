---
type: code
tags: [code, app, powershell, réseau, packet-optimizer, premium]
fichier: app/src-tauri/netopt/apply.ps1
lignes: 295
maj: 2026-11-10
---
# apply.ps1

**Partie Premium** du moteur PowerShell du Packet Optimizer : la sauvegarde avant la première application (`Take-Snapshot`) et **l'application** des réglages (`Do-Apply`, 11 étapes). Fiche parente : [[netopt.rs]]. Fonctionnalité : [[Packet Optimizer]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Scellé avec les scripts **Premium** (`"netopt.apply"` dans `embed_scripts.rs`) : sans licence active, l'app ne l'a pas en clair et refuse `apply` (`premium_required:netopt`, ou `premium_scripts_unavailable` si la partie manque).
- [[netopt.rs]] le place entre [[common.ps1]] (dont il utilise toutes les fonctions et constantes) et [[main.ps1]], pour l'action `apply` seulement.
- Les valeurs viennent des variables `C_*` (calculées par `compute` dans [[netopt.rs]]) et `O_*` (choix de la page [[NetOpt.tsx]]).

## Ce que le fichier expose

- `Take-Snapshot` : sauvegarde (une seule fois).
- `Do-Apply` : l'application.

## Fonctionnement détaillé

### `Take-Snapshot` (seulement si `snapshot.json` n'existe pas)
Écrit `netopt\snapshot.json` (`version: 2`, `date` `aaaa-MM-jj HH:mm`) avec :
- `tcp` : `Tune`, `Ccp`, `IRto`, `MinRto`, `Icw`, `AckTo`, `AckFreq`, `Ts`, `Ecn`, `NonSack` (modèle TCP `Internet`) ;
- `offload` : `Rsc`, `Pcf` ;
- `adv` : chaque mot-clé suivi (`$AllKw`) de chaque carte physique, repéré par `InterfaceDescription` ;
- `pm` : gestion d'énergie de chaque carte (`Allow`, `D0`, `Sel`, `Sleep`) ;
- `mtu` : MTU de chaque interface IPv4 ; `pacer` : liaison `ms_pacer` de chaque carte ;
- `reg` : chaque valeur de `Get-Tracked` (chemin, nom, type, existait ou non, valeur) ;
- `scheme` : plan actif ; `wifipow` : réglage Wi-Fi (secteur et batterie) de chaque plan.

Si l'écriture échoue : `X` « Could not write the backup, nothing will be changed » et sortie immédiate avec le code **2** (rien n'est changé). La sauvegarde n'est refaite qu'après une remise exacte (qui l'archive).

### `Do-Apply` (11 étapes de progression)
1. **TCP** (`netsh int tcp set global`) : `autotuninglevel=C_TUNE` (sauf `keep`) ; `initialrto=C_IRTO` (défaut 1000), `timestamps=C_TS` (défaut `disabled`), `nonsackrttresiliency=C_NONSACK` (défaut `disabled`), `ecncapability=C_ECN` (défaut `disabled`), `rss=enabled`. Congestion `C_CCP` sur le modèle `internet` (sauf `keep` ; « not available on this Windows » sinon). Puis `minrto=C_MINRTO` (300), `delayedacktimeout=C_ACKTO` (40), `delayedackfrequency=C_ACKFREQ` (2) et `icw=C_ICW` (seulement s'il n'est pas `keep`) : **Windows les bloque sur la plupart des éditions familiales** ; le refus s'écrit `..` (« locked by Windows on this edition ») avec une explication, pas en échec.
2. **ACK et Nagle sur chaque interface** (`Tcpip\Parameters\Interfaces\*`) : `TcpAckFrequency = C_ACKFREQ`, `TcpDelAckTicks = C_DELACK`, `TCPNoDelay = C_NODELAY`. Si les trois valent les valeurs de Windows (2, 2, 0), les valeurs sont **supprimées** au lieu d'être écrites.
3. **Tampons de Windows et de la carte** :
   - `C_NTI = 1` → `NetworkThrottlingIndex = -1` (0xFFFFFFFF, limitation coupée), sinon valeur d'avant ;
   - `SystemResponsiveness = C_SYSRESP` (défaut 20 ; « CPU reserve for background tasks ») ;
   - `C_RSC = 1` → RSC global désactivé, sinon activé (ou valeur sauvegardée) ;
   - `C_PCF = 1` → filtre de regroupement de paquets désactivé, sinon valeur sauvegardée ;
   - sur chaque carte connectée : `*FlowControl` = 0 si `C_FC = 1` ; `*LsoV2IPv4`, `*LsoV2IPv6`, `*LsoV1IPv4` = 0 si `C_LSO = 1` ; `*PacketCoalescing` = 0 si `C_PCF = 1`, ou si `O_WIFI` et carte Wi-Fi ; `*RscIPv4`, `*RscIPv6` = 0 si `C_RSC = 1` ; `ITR` = **200** si `C_IM = 1` ; `*InterruptModeration` = 0 si `C_IM = 2`. Chaque réglage non demandé revient à sa valeur d'avant (`Want-Kw` → `Revert-Kw`).
4. **Économies d'énergie** : `O_NPS` → les 12 mots-clés de `$KwPower` à 0 et gestion d'énergie de la carte désactivée (`Set-Pm off`), sinon valeurs d'avant. `O_NPS` ou `O_WIFI` → économie d'énergie Wi-Fi du plan actif à 0 / 0 (performances maximales), sinon valeurs sauvegardées.
5. **Wi-Fi à pleine puissance** (cartes Wi-Fi connectées) : `O_WIFI` → `RoamAggressiveness` au choix dont le libellé commence par « 1. » ou « 1) » (le plus bas), `uAPSDSupport` = 0, `MIMOPowerSaveMode` au choix « No SMPS » ; sinon les trois remis. Pas de carte Wi-Fi → `..`.
6. **Redémarrage des cartes** modifiées (`Restart-Nics`, coupure de quelques secondes, jusqu'à 45 s).
7. **MTU** de l'interface principale (`O_MTUMODE`) : 0 → laissé ; 1 → mesuré vers la cible (`Find-Mtu`), puis vers `1.1.1.1` si rien ; sous 1 400, deuxième mesure et la plus grande est gardée ; sous **1 280** → jugé faux (« lost pings? »), laissé ; 2 → `O_MTU`. Déjà juste → `OK` ; sinon `netsh interface ipv4 set subinterface … mtu=… store=persistent`.
8. **Priorité du trafic du jeu** : stratégies QoS `Rago_Net_*` supprimées puis, si `O_SMART` :
   - `C_DSCP` > 0 → une stratégie `Rago_Net_Game_<exe>` par exe Minecraft (`javaw.exe`, `java.exe`, `Minecraft.Windows.exe`) avec ce DSCP, tous profils réseau ; 0 → pas de marque ;
   - une stratégie `Rago_Net_Bg_<exe>` en **DSCP 8 (CS1, fond)** pour chacun des 9 gros téléchargeurs (`$BgApps`) ;
   - `Tcpip\QoS\Do not use NLA = "1"` (pour que les marques s'appliquent hors domaine) ;
   - liaison `ms_pacer` (Planificateur de paquets QoS) réactivée sur les cartes où elle était coupée.
   Sans `O_SMART` : `Do not use NLA` remis.
9. **Priorité processeur Haute pour Minecraft** : `O_PMODE` → `IFEO\<exe>\PerfOptions\CpuPriorityClass = 3` pour les 3 exes, et les processus `javaw`, `java`, `Minecraft.Windows` déjà lancés passent en priorité Haute tout de suite. Sinon valeur d'avant et clés vides nettoyées.
10. **Performances de Windows pour le jeu** (`O_COMP`, mode Compétitif) :
    - `Win32PrioritySeparation` = **38** ; `GameDVR_Enabled` = **0** ; `AppCaptureEnabled` = **0** ; `AutoGameModeEnabled` = **1** ; tâche Games : `GPU Priority` **8**, `Priority` **6**, `Scheduling Category` **High**, `SFIO Priority` **High** ;
    - plan **Performances élevées**, sauf : Ryzen X3D à deux CCD (`RN_X3D`, AMD demande Utilisation normale pour garder le jeu sur le cache 3D) ; plan personnalisé actif (Rago Low Latency ou autre), gardé ; pas de plan Performances élevées (portable « Modern Standby ») → `!` ;
    - si `O_NPS` ou `O_WIFI`, réglage Wi-Fi du nouveau plan à 0 / 0.
    Sans `O_COMP` : les 8 valeurs remises, et si Performances élevées est actif alors qu'un autre plan était sauvegardé, retour à ce plan.
11. **Partage de Windows Update** : `O_BGUARD` → `DownloadMode = 0` (Delivery Optimization ne téléverse plus vers d'autres PC), sinon valeur d'avant ; `DoSvc` redémarré si la valeur a changé.

Fin : cache DNS vidé, `Summary`, code 0 ([[netopt.rs]] écrit alors `applied.json`).

## Données touchées

- Écrit `netopt\snapshot.json` (première fois) et ajoute au `log.txt`.
- Windows : TCP global et modèle `internet`, registre (ACK par interface, multimédia, tâche Games, priorité, Game DVR, Game Mode, QoS, IFEO de Minecraft, Delivery Optimization), réglages avancés et gestion d'énergie des cartes, MTU, stratégies QoS, liaison `ms_pacer`, plan d'alimentation et réglage Wi-Fi, priorité des processus Minecraft en cours, service `DoSvc`, cache DNS.

## Erreurs et cas limites

- Appliquer **coupe la connexion quelques secondes** (étape 6).
- Les réglages TCP bloqués par l'édition de Windows ne comptent pas comme des échecs (`..`).
- Chaque option décochée **remet la valeur d'avant la première application** (pas la valeur de Windows) : appliquer plusieurs fois de suite ne fait pas dériver les réglages.
- Le preset Minecraft PvP du catalogue touche une partie des mêmes valeurs (problème connu, voir [[Packet Optimizer]]).

## Liens avec le reste

- Utilise [[common.ps1]] ; assemblé par [[netopt.rs]] ; lancé par [[main.ps1]] (`Do-Apply`).
- Interface : [[NetOpt.tsx]]. Fonctionnalité : [[Packet Optimizer]]. Détection X3D : [[session.rs]] (`dual_ccd_x3d`).

## Tests

Pas de test PowerShell. [[netopt.rs]] vérifie que `Do-Apply` et `Take-Snapshot` ne sont **pas** dans la partie gratuite (`apply_needs_the_premium_part`), que chaque variable lue ici est bien passée (`engine_gets_every_variable_it_reads`) et que le texte est sûr à lancer caché.

## À savoir avant de modifier

- Toute nouvelle valeur de registre doit être ajoutée à `Get-Tracked` dans [[common.ps1]] (sinon la sauvegarde ne la contient pas et `restore` ne la remet pas).
- Toute nouvelle variable `C_*` ou `O_*` doit être passée par `env()` de [[netopt.rs]].
- Ne pas déplacer de fonction de remise ici : elle deviendrait Premium et la remise en fin de licence casserait.
- Ne pas changer le format de `snapshot.json` sans garder la lecture de la version 2 dans [[common.ps1]] (les sauvegardes des joueurs existent déjà).
