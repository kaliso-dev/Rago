---
type: code
tags: [code, app, catalogue, générateur, python, sécurité]
fichier: app/tools/audit_fixes.py
lignes: 455
maj: 2026-11-10
---
# audit_fixes.py

Les corrections de l'**audit ligne par ligne du 07/10/2026** : chaque commande des scripts a été relue, et ce fichier dit quoi réparer, retirer ou annoncer. Il ne contient que des données ; c'est [[build_catalog_v6.py]] qui les applique (`apply_audit`). Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `29a1e67`, app 1.1.6), modifié une fois le 10/10 (`c64859e`, app 1.1.9 : import sécurisé du plan d'alimentation Rago Low Latency fourni ce jour-là).

## Rôle et place dans l'ensemble
- Le rapport d'audit (`audit/audit-commandes-2026-10-07.md`) et l'outil d'origine (`audit/outils-annulation/propositions.py`, `audit_apply.py`) sont **hors du dépôt** (dossier de projet de Sofiene) : ce fichier en est une copie « telle quelle ». Son en-tête le dit.
- Il passe **après** les corrections propres au build (`SCRIPT_FIXES`, `DROP_LINES`, `SUB_LINES`) et **après la copie `before_audit`** : l'annulation générée par [[undo_gen.py]] couvre donc aussi les lignes que l'audit retire (les PC qui avaient lancé l'ancienne version peuvent revenir en arrière).
- Il alimente aussi les avertissements (`WARNINGS_PLUS`), et des descriptions (`DESC_FIX_PLUS`, `MAINTENANCE_NOTE`) qui ne sont plus visibles (voir « À savoir »).

## Ce que le fichier expose
| Nom | Forme | Nombre | Appliqué ? |
|---|---|---|---|
| `SCRIPT_FIXES_PLUS` | `{clé: [(texte avant, texte après ou None)]}` | 6 clés | oui, en premier |
| `DROP_BLOCKS` | `[(clés, motif 1re ligne, motif dernière ligne)]` | 3 | oui, en deuxième |
| `DROP_LINES_PLUS` | `[(clés, motif)]` : toute ligne qui correspond (insensible à la casse) est retirée | 75 | oui, en troisième |
| `SUB_LINES_PLUS` | `[(clés, motif, remplacement texte ou fonction)]` | 27 | oui, en dernier |
| `AUDIT_GUID` | nom anglais d'une sous-catégorie d'audit → GUID `{0CCE92xx-69AE-11D9-BED3-505054503030}` | 9 | utilisé par `SUB_LINES_PLUS` |
| `WARNINGS_PLUS` | `[(motif, texte en, texte fr)]` | 6 | ajouté à `WARNINGS` du build |
| `DESC_FIX_PLUS` | `{id: (desc en, desc fr)}` | 17 | fusionné dans `DESC_FIX`, puis écrasé par [[descriptions.json]] |
| `MAINTENANCE_NOTE` | phrase ajoutée à `win_maintenance` et `exp_maintenance` | 1 | idem, écrasée |
| `PLACEBO` | 8 ids jugés sans effet | 8 | **non** : Sofiene garde ces réglages (07/10) |
| `CATALOG` | `{'sto_defrag': "kind 'action' …"}` | 1 | indirectement : `sto_defrag` est dans `ONE_SHOT` du build |
| `BUILD_PATCH` | texte de code Python à intégrer au build | — | **non** : déjà intégré dans `variants_of`, `drop_lines`, `apply_audit` |

Une « clé » est un id (`gpu_amd`) ou un `id:variante` (`ping_main:config4`). Une clé sans variante vise toutes les variantes du réglage.

## Fonctionnement détaillé (tel qu'appliqué par `apply_audit`)
1. `SCRIPT_FIXES_PLUS` : remplacement de texte exact. Les textes sont écrits en CRLF ; si le script est en LF, ils sont convertis ; `after = None` retire la ligne et son saut de ligne. Chaque « avant » doit exister (`assert`).
2. `DROP_BLOCKS` : de la première ligne qui correspond au motif de début jusqu'à la première ligne suivante qui correspond au motif de fin (incluse). `next()` lève `StopIteration` si rien n'est trouvé.
3. `DROP_LINES_PLUS` (via `drop_lines` du build) : au moins une ligne doit être retirée dans chaque variante visée (`assert`).
4. `SUB_LINES_PLUS` (via `sub_lines`) : `re.sub` sur chaque ligne ; au moins une ligne doit changer par variante (`assert`).
Le séparateur de lignes (`\r\n` ou `\n`) de chaque script est gardé.

### Les 6 `SCRIPT_FIXES_PLUS`
- `ping_main:config4` : la 1re boucle `*SpeedDuplex` n'était jamais fermée, rien après la ligne 42 ne s'exécutait (erreur de syntaxe) : `)` ajoutée au bon endroit, `)` orpheline retirée plus loin.
- `mem_svchost` : seuil `SvcHostSplitThresholdInKB` calculé par `wmic` et écrit avec `!SVCHOST!` sans expansion retardée (la valeur écrite était le texte « !SVCHOST! ») : remplacé par une boucle `powershell … Get-CimInstance Win32_OperatingSystem` qui écrit `TotalVisibleMemorySize + 1024000`.
- `ping_advanced`, `gpu_nvidia`, `gpu_amd` : `)` orphelines retirées.
- `dbl_onedrive` : `rd "%USERPROFILE%\OneDrive"` seulement si aucun dossier de `User Shell Folders` ne pointe dans OneDrive (sous Windows 11, le Bureau et les Documents y sont souvent : les supprimer viderait le Bureau).

### Les 3 `DROP_BLOCKS`
- `in_driver` : 2e boucle jamais fermée qui écrivait dans le magasin de pilotes (`DriverDatabase\DriverPackages … IoLatencyCap` jusqu'à `msahci_Inst`).
- `sys_usb` : lignes `Enum\%%a` hors boucle puis boucle sur **tous** les périphériques PCI avec `setlocal` sans `endlocal`.
- `gpu_general` : `Scaling` à 1 sur toutes les configurations d'écran (condition toujours vraie faute d'expansion retardée) : les résolutions étirées (4:3 étiré) passaient en bandes noires.

### `DROP_LINES_PLUS` (75 entrées), par thème
- **Réseau** : `InterfaceMetric` 55 sur toutes les interfaces (VPN contourné, Wi-Fi préféré au câble) ; ligne collée de ChatGPT ; NewReno/BBR2 forcés ; sockets brutes ouvertes aux non-administrateurs ; blobs `Nsi` d'un autre PC ; SACK coupé ; mise à l'échelle de fenêtre TCP coupée (fenêtre plafonnée à 64 Ko) ; fenêtres fixes de 8 760 octets ; règle de pare-feu « StopThrottling » cachée (gardée dans `net_limit`, annoncée) ; découverte du MTU coupée ; routage IP activé ; plafond de connexions TCP ; boucle `wmic` vide ; `netsh int ipv6 set state` (n'existe pas).
- **Latence, processeur, priorités** : fermeture forcée des applis à l'arrêt ; veille autorisée à 0 (gardée dans `cpu_cstates_off`) ; nombre de processeurs figé dans le BCD (gardé dans `cpu_numproc`) ; TSX réactivé (faille TAA) ; valeur magique de `Control\Processor` ; bornes « cœurs minimum » à 0 ; réécriture des valeurs **par défaut** des plans Windows ; états PEP, veto de veille moderne ; protections du chargeur de démarrage cachées ; MMCSS Audio de 6 à 2 (crépitements) ; svchost et lsass en priorité « inactif » cachés ; mode tablette ; pages larges forcées ; doublons souris/clavier ; gauchers remis en droitier ; `Keyboard Response\Flags` en mauvais type, Verr. Num éteint.
- **Mémoire** : valeur parasite `Start` dans `Memory Management`.
- **Alimentation** : hibernation coupée sans le dire ; clés `PowerSettings\xxx_yyy` parasites ; veille moderne coupée ; faute `GpuEnergyDr` ; fenêtre du Panneau de configuration ouverte en plein script.
- **Stockage, USB** : « cache protégé contre les coupures » caché ; périphériques plus réessayés, clavier et souris qui ne réveillent plus le PC.
- **Carte graphique** : TDR coupé caché (gardé dans `nv_tdr`, annoncé) ; clé `Class{4d36e968…}` sans `\` ; bridage thermique AMD caché (gardé dans `amd_thermal`, annoncé) ; protection d'un écran précis (EDID d'un autre PC).
- **Windows** : Game DVR réactivé juste après avoir été coupé ; protections anti-exploit coupées (CFG : FACEIT refuse de lancer le jeu ; SEHOP, ASLR) ; « Mark of the Web » ; alertes de disque qui lâche ; Windows Hello caché ; maintenance automatique cachée ; moteur de compatibilité ; contrôle parental ; synchronisation de l'heure (codes 2FA refusés) ; mises à jour du Store (Minecraft Launcher) ; SmartScreen, capteurs, outil antimalware ; audit de sécurité caché ; déclencheurs UBPM ; mises à jour de Chrome ; cache du Planificateur effacé à la main ; masque d'effets visuels corrompu ; DPI ; réactivation de la télémétrie (l'inverse de la description) ; « Exécuter en tant qu'autre utilisateur », clavier tactile, saisie asiatique ; codecs `.webp`/`.heic`.
- **Pack Latence avancée (`in_advanced`) et Latence de Windows (`in_windows`)** : UAC coupé (`EnableLUA 0` : **toutes** les applis du Store et MSIX ne s'ouvrent plus, dont Minecraft Launcher) ; suppression de **toutes** les règles du pare-feu ; mises à jour de Firefox, Alt+Maj, Veille et Verrouiller, SafeSearch ; fichiers d'un autre PC ; processeur maintenu en C0 ; menu de démarrage à 0 s ; suppression et recréation des dossiers Temp.
- **Suite Hitreg** : effets cachés hors jeu. **Mode jeu** : arrêt de Windows Update et effacement de son historique à chaque activation.

### `SUB_LINES_PLUS` (27 entrées), principales réparations
- **`rbw_mode:off` (MAJEUR)** : passait en **manuel** des services qui sont en automatique dans Windows (`EventLog`, `Schedule`, `DPS`, `SysMain`, `PcaSvc`, CDP) : `demand` → `auto` (ce script est de toute façon remplacé ensuite par [[rbw.py]]).
- Autotuning TCP coupé ou « experimental » caché (sauf `ping_hitreg`, qui l'annonce) ; déchargement réactivé comme annoncé (`taskoffload=enabled`) ; cache système « serveur » retiré.
- `net_ipv6` : préférer IPv4 (`0x20`) au lieu de la commande inexistante.
- `cpu_away`, `cpu_advanced` : schéma `95533644…` d'un autre PC → `scheme_current`.
- `pow_link` : `/f` manquant dans `reg query … /s "EnableHIPM"`.
- `pow_ultimate`, `pow_plan` : chemins `xxx_yyy` → GUID `xxx-yyy` ; plan « Performances optimales » copié sous un **GUID fixe** puis activé (avant : jamais activé, un plan de plus à chaque passage) ; plan Rago (`LowLatency.pow`, fourni le 10/10, issu d'un plan « IIIEXOIII LOW LATENCY ») importé sous un GUID fixe, renommé Rago, activé, avec trois réglages remis comme Windows (repos processeur, mot de passe au réveil, bouton d'alimentation).
- `nv_powermizer` : écrit dans la vraie clé du pilote NVIDIA ; `gpu_intel`/`intel_gpu` : recherche `"Intel"` corrigée ; `win_feed` : politique sous `Policies\Microsoft\Dsh`.
- `kbm_1to1` : courbes de lissage gardées, l'accélération coupée (mouvement 1:1 sans curseur figé).
- `sto_cacheprot` : pose bien `CacheIsPowerProtected` ; `sto_general`, `sto_writecache`, `sto_cacheprot` : disques USB exclus (`findstr /v /i "USBSTOR"`).
- `pri_game:minecraft` : `javaw.exe.exe` → `javaw.exe` (QoS et IFEO sans effet avant).
- `in_advanced` : points de restauration seulement sur `C:` (plus `D:` à `G:`).
- `hitreg_suite`, `game_mode:off` : `UserPreferencesMask` sur 8 octets (`9E1E078012000000`), `VisualFXSetting` 0 (« laisser Windows choisir »).
- `game_mode:on` : `rd /s /q %temp%` (supprimait le dossier TEMP lui-même) remplacé.
- `exp_harden` : `RunAsPPL` 2 au lieu de 1 (même protection, sans verrou UEFI, annulable).
- `win_audit` : `/failure:Enable` (qui **activait** l'audit des échecs et inondait le journal Sécurité) → `Disable` pour les connexions filtrées ; noms de sous-catégories remplacés par leurs GUID (`AUDIT_GUID`), pour marcher sur un Windows non anglais.

### `WARNINGS_PLUS` (6 avertissements « Read this first »)
Motif trouvé dans une ligne de commande → avertissement ajouté à `confirm` et réglage passé en `advanced` (par `postprocess` du build) :
1. `svchost.exe\PerfOptions … CpuPriorityClass … 1` : tous les services Windows en priorité minimale.
2. `CacheIsPowerProtected 1` : fichiers corrompus en cas de coupure de courant.
3. `PP_ThermalAutoThrottlingEnable 0` ou `PP_DisablePowerContainment 1` : carte AMD sans bridage thermique.
4. `XblAuthManager start= disabled` : Game Pass, appli Xbox et connexion Minecraft Bedrock cassés.
5. `ConsentPromptBehaviorAdmin 0` : demandes d'autorisation administrateur (UAC) coupées (remplace l'avertissement sur `EnableLUA 0`, ligne retirée).
6. `Set-SmbServerConfiguration -EncryptData $True` : vieux NAS, box et TV ne lisent plus les dossiers partagés.
Plusieurs de ces réglages ont été retirés ensuite par [[safety.py]] (`amd_thermal`, `sto_cacheprot`, `dbl_xbox`) ; au 10/11, seul `exp_smb` porte encore un `confirm` venant d'ici (voir [[build_catalog_v6.py]]).

### `PLACEBO` (non appliqué)
`pow_mmcss`, `cpu_idle`, `pri_csrss`, `gpu_directx`, `lat_directx`, `in_frames`, `mem_superfetch`, `win_store` : jugés sans effet sur un Windows 10 ou 11 à jour (valeurs inventées, clés ignorées). **Choix de Sofiene (07/10) : les garder.** Ils sont tous encore dans le catalogue au 10/11.

## Données touchées
Aucune : module de données, importé par [[build_catalog_v6.py]]. Les scripts modifiés finissent dans [[Scripts embarqués (JSON)]].

## Erreurs et cas limites
- Si un script source change et qu'un motif ne trouve plus rien, le build s'arrête (`assert` ou `StopIteration`). Il faut alors adapter le motif, pas le supprimer sans vérifier.
- Les entrées qui visent un réglage retiré plus tard par [[safety.py]] restent utiles : l'annulation de ce réglage est calculée sur le script d'avant et d'après.

## Liens avec le reste
- Appliqué par `apply_audit`, `drop_lines`, `sub_lines` de [[build_catalog_v6.py]], avant [[optis_120.py]] et [[safety.py]].
- Les lignes retirées restent annulables grâce à [[undo_gen.py]] et [[merge_full.py]].
- Les avertissements s'affichent dans l'app avant d'appliquer (voir [[Moteur des tweaks]], [[Tableau de bord]]).

## Tests
Les tests Rust de [[catalog.rs]] vérifient le résultat : `dangerous_lines_are_flagged` (réglages qui coupent Spectre/Meltdown ou BAM marqués `advanced` avec avertissement), `dangerous_lines_stay_out`, etc.

## À savoir avant de modifier
- Ce fichier est une **copie d'audit** : pour une nouvelle correction, l'ajouter plutôt dans [[optis_120.py]] (`FIXES`, `DROP`, `SUB`), qui est le fichier « vivant » depuis le 21/10.
- Les textes de `DESC_FIX_PLUS` et `MAINTENANCE_NOTE` ne s'affichent plus : [[descriptions.json]] a le dernier mot.
- `PLACEBO` est une décision de Sofiene : ne pas retirer ces réglages sans lui demander.
