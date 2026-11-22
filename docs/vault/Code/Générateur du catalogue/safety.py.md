---
type: code
tags: [code, app, catalogue, générateur, python, sécurité]
fichier: app/tools/safety.py
lignes: 221
maj: 2026-11-10
---
# safety.py

La liste des **réglages risqués retirés** de l'app (17) et des **lignes risquées** retirées des réglages gardés, avec la fonction qui les retire et celle qui vérifie qu'il n'en reste aucune. Demande de Sofiene du 08/10/2026 (app 1.1.8). Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Tweaks retirés]], [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 09/10 (commit `bd62ada`, 1.1.8), dernier changement le 16/10 (`995b238`, 1.1.14 : ajout de `pow_timer` et du motif `CoalescingTimerInterval`, ticket RAG-67 du 13/10).

## Rôle et place dans l'ensemble
Deux niveaux (docstring) :
1. **`RETIRED`** : réglages dont le but même est risqué (sécurité coupée, PC qui peut figer, fichiers perdus, fonction de Windows cassée sans gain). Ils quittent le catalogue, les presets et le plan gratuit. **Leur annulation reste dans `undo.json`** pour les PC qui les ont appliqués avant 1.1.8, et l'app propose de les remettre comme avant ([[Tweaks retirés]], [[Tableau de bord]]).
2. **`DROP_EVERYWHERE`, `DROP_BLOCKS`, `DROP_IN`** : lignes risquées **cachées** dans des packs utiles. Elles sont retirées de chaque script où elles apparaissent ; le pack reste. Les scripts d'avant l'audit (`before_audit` de [[build_catalog_v6.py]]) gardent ces lignes, donc l'annulation sait les défaire.
Le build vérifie que chaque motif retire au moins une ligne, et le moteur ([[catalog.rs]], tests) qu'aucune ne revient.

## Ce que le fichier expose
| Nom | Forme | Nombre |
|---|---|---|
| `RETIRED` | `{id: (raison en, raison fr)}` ; la raison est affichée dans l'app quand le réglage est encore appliqué sur le PC | 17 |
| `_REG` | regex `reg add` / `reg.exe add` (défini, non utilisé) | — |
| `DROP_EVERYWHERE` | `[(motif, étiquette)]` ; motif sans casse, cherché sur chaque ligne de **tous** les scripts | 25 |
| `DROP_BLOCKS` | `[(ids, motif de début, motif de fin)]` | 1 |
| `DROP_IN` | `[(ids ou id:variante, motif)]` | 5 |
| `EXPLORER_HISTORY` | `RunMRU|TypedPaths|OpenSavePidlMRU|LastVisitedPidlMRU` | — |
| `apply(scripts)` | applique `DROP_BLOCKS`, puis `DROP_EVERYWHERE`, puis `DROP_IN` ; rend `{motif ou étiquette: ["id:variante", …]}` | — |
| `remaining(scripts)` | liste `(étiquette, id:variante, ligne)` des lignes qu'un motif de `DROP_EVERYWHERE` ou `EXPLORER_HISTORY` trouverait encore | — |
| `notes(report, n_tweaks, n_distinct)` | texte de la section « Réglages risqués retirés (1.1.8) » de [[CORRECTIONS.md (app)]] | — |

## Fonctionnement détaillé

### Les 17 réglages retirés (`RETIRED`)
| id | Raison (résumé) |
|---|---|
| `win_mitigations` | coupait les protections Spectre et Meltdown |
| `win_coreiso` | coupait l'intégrité de la mémoire (pilotes malveillants) |
| `win_smartscreen` | coupait SmartScreen |
| `win_hyperv` | coupait Hyper-V et la sécurité basée sur la virtualisation ; cassait WSL, le Bac à sable, les émulateurs |
| `exp_bios` | changeait la sécurité du démarrage ; une mauvaise valeur peut empêcher Windows de démarrer |
| `exp_dma` | retirait la protection DMA (Thunderbolt, PCIe) |
| `exp_harden` | coupait le service Station de travail (dossiers partagés, lecteurs réseau) |
| `net_limit` | bloquait deux plages d'adresses Google dans le pare-feu (YouTube cassé), sans gain |
| `pri_svc` | tous les services Windows en priorité minimale (son qui grésille, réseau qui rame) |
| `nv_tdr` | le PC figeait au lieu de récupérer quand le pilote graphique plantait |
| `amd_thermal` | coupait la protection thermique des cartes AMD |
| `sto_cacheprot` | fichiers corrompus si le courant coupe |
| `dbl_xbox` | cassait le Game Pass, l'appli Xbox, la connexion Minecraft Bedrock |
| `dbl_edge` | supprimer Edge ne s'annule pas et casse des fonctions de Windows |
| `dbl_onedrive` | supprimait les dossiers OneDrive locaux (fichiers non synchronisés perdus) |
| `mem_prefetch` | applis plus lentes ; un Prefetch vide ressemble à des traces effacées en screenshare |
| `pow_timer` | mettait à 0 une valeur du noyau qui sert de diviseur : **écran bleu** quelques minutes après le démarrage sur certains PC Windows 11 24H2 (RAG-67, 13/10) |

[[build_catalog_v6.py]] (`retire`) les enlève des modules, sections, renvois et presets, et écrit pour chacun `{id, name, reason, reboot, module}` dans la liste `retired` de [[catalog.json]]. Il retire aussi leurs scripts de `scripts.json` et `probes.json`, mais garde leur annulation : 14 des 17 en ont une ; `amd_thermal`, `sto_cacheprot` et `dbl_edge` n'en ont pas (le build le vérifie par `assert`).

### `DROP_EVERYWHERE` (25 motifs), par famille
- **Sécurité** : `FeatureSettingsOverride(Mask)` (Spectre/Meltdown) ; `Set-ProcessMitigation -System -Disable` ; `bcdedit /set` qui coupe l'hyperviseur, VSM, NX, ELAM, l'intégrité, l'entropie TPM, PAE, LA57, `increaseuserva`, `allowedinmemorysettings` ; VBS et intégrité de la mémoire à 0 ; protection DMA ; Microsoft Defender (temps réel, protection contre les falsifications, envoi d'échantillons) ; SmartScreen ; UAC (`ConsentPromptBehaviorAdmin 0`, `PromptOnSecureDesktop 0`, `EnableLUA 0`) ; Windows Update (`NoAutoUpdate 1`, `AUOptions 2`) ; services de mise à jour d'Edge, de WebView2 et de Chrome en `Start 4` ; `advfirewall reset` et règles de blocage ; effacement de `Image File Execution Options\*` ; `RmProfilingAdminOnly 0` (compteurs GPU ouverts à toutes les applis).
- **Stabilité** : `svchost.exe\PerfOptions` ; `dwm.exe` en priorité temps réel ; `GraphicsDrivers … Tdr*` ; limites thermiques AMD ; chien de garde DPC à 0 ; **`CoalescingTimerInterval`** sous n'importe quelle clé `Control` (écran bleu 0x7E, division par zéro ; les PC qui l'ont déjà la perdent au lancement de l'app, voir [[Réparations au lancement]]).
- **Fichiers et traces** : `CacheIsPowerProtected 1` ; `Clear-RecycleBin` ; `EnablePrefetcher 0` ; suppression du dossier `\prefetch` (hors `echo`) ; BAM en `Start 4`.
- **Fonctions de Windows** : services Xbox (`xbgm`, `XblAuthManager`, `XblGameSave`, `XboxGipSvc`, `XboxNetApiSvc`) désactivés.

### `DROP_BLOCKS` et `DROP_IN`
- `sto_general` : la boucle `reg query "HKU" ^| findstr` … `)` qui effaçait l'historique de l'Explorateur (fichiers récents, Exécuter, chemins tapés) — ressemble à des traces effacées.
- `in_advanced` : `sc config|stop` de `WSearch`, `Fax`, `Spooler`, `CscService`, `RemoteRegistry`, `WerSvc` (le réglage « Couper les services inutiles » le fait en l'annonçant).
- `net_server:s1`, `net_server:s2` : `netsh int ip reset` et `netsh winsock reset` (IP fixe et DNS manuels perdus ; « Réinitialiser le réseau » reste l'action dédiée).
- `app_remove`, `win_apps` : `MicrosoftStickyNotes` (Pense-bêtes gardé).
- `cpu_advanced`, `cpu_registry` : clés `VetoPolicy` et `GlobalPowerPolicy` (audit D22).
- `win_gamedvr` : la ligne qui réautorisait Game DVR juste après l'avoir coupé.

### `apply` et `remaining`
`apply` garde le séparateur de chaque script (`\r\n` ou `\n`). Chaque motif de `DROP_EVERYWHERE` doit toucher au moins un script (`assert hits, 'motif sans effet : …'`) et chaque entrée de `DROP_IN` au moins une ligne. [[build_catalog_v6.py]] appelle `apply` à l'étape 8 de `postprocess`, puis exige `remaining(scripts) == []`.

### `notes`
Écrit la section de [[CORRECTIONS.md (app)]] : nombre de retirés, nombre d'entrées et de réglages distincts **calculés** (231 et 218 au 10/11), liste des 17 raisons, liste des packs touchés par motif, puis un paragraphe fixe sur le point de restauration de 1.1.8 (case cochée d'office seulement pour un réglage `restore` et si l'app n'en a pas créé un réussi dans les 24 dernières heures).

## Données touchées
Modifie en mémoire le dictionnaire `scripts` passé par [[build_catalog_v6.py]]. Aucun fichier.

## Erreurs et cas limites
- Un motif qui ne trouve plus rien arrête le build : si un script a été corrigé ailleurs et ne contient plus la ligne, il faut retirer ou adapter le motif.
- `rbw_mode` est posé **après** `apply` ([[rbw.py]]) pour qu'aucune de ses lignes ne soit retirée (il remet BAM, le Prefetch, SysMain… en route).

## Liens avec le reste
- Appelé par [[build_catalog_v6.py]] (`SAFETY.apply`, `SAFETY.remaining`, `SAFETY.RETIRED`, `SAFETY.notes`).
- Côté app : la liste `retired` de [[catalog.json]] est lue par [[catalog.ts]] ; l'annulation vient de [[backup.rs]].
- Tests Rust de [[catalog.rs]] : `retired_tweaks_cannot_run` (17 retirés, aucun script, relevé ni entrée de preset ; annulation présente pour `win_mitigations`, `nv_tdr`, `dbl_xbox`, `win_smartscreen`, `exp_bios`, `win_coreiso:off` ; 16 motifs de lignes risquées absents de tous les scripts hors `echo` et `rem`), `dangerous_lines_stay_out`, `kernel_timer_value_stays_out` (aucun script ni relevé n'écrit `CoalescingTimerInterval` ; les annulations la suppriment et ses clés sont dans `repair::TIMER_KEYS`).

## À savoir avant de modifier
- **Retirer un réglage** = l'ajouter à `RETIRED` avec ses deux raisons, l'enlever de [[descriptions.json]] (sinon `describe()` échoue) et de [[free.json]] ; si l'annulation n'existe pas, mettre à jour l'`assert` du build sur les retirés sans annulation. Recette dans [[Code du générateur de catalogue]].
- Ne jamais retirer un id de `RETIRED` pour le réutiliser : les PC qui l'ont appliqué le reconnaissent par son id.
- Ne pas affaiblir un motif sans en parler à Sofiene : chacun correspond à un risque identifié (audits du 05/10 et du 07/10, RAG-67 dans [[Linear]]).
