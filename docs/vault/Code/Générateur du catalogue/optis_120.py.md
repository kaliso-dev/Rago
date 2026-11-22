---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/optis_120.py
lignes: 486
maj: 2026-11-10
---
# optis_120.py

Les optimisations envoyées par Sofiene le **21/10/2026** (version 1.2.0), vérifiées une à une contre le catalogue : 20 réglages ajoutés, des réglages existants remplacés par une meilleure version, un avertissement, et le compte rendu de ce qui a été écarté. C'est aujourd'hui **le fichier où l'on ajoute ou corrige un réglage**. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 21/10 (commit `365fff1`), modifié le 22/10 (`783326a` : ajout de `win_bgdownloads` ; `b767d4d` : Mode jeu plus performant) et le 27/10 (`b4caa2c` : un commentaire renommé, rien d'appliqué ne change).

## Rôle et place dans l'ensemble
- **Sources** (docstring) : le dump Hone.gg (« Basic » et « General & Advanced » : fichiers On/Off `.bat` et journaux du registre), `OptiCore-Tweaks.ps1`, `Hone-Optimizations.ps1`, `network_optimizer.bat` et `[RAGO APP] GAME V1.bat`. Aucun de ces fichiers n'est dans le dépôt. Consigne de Sofiene : ne pas ajouter ce qu'on a déjà, remplacer ce qui est moins bien, ajouter le reste après vérification.
- Importé par [[build_catalog_v6.py]] sous le nom `OPT`. Ses corrections passent **après l'audit** ([[audit_fixes.py]]) et après la copie `before_audit` : l'annulation couvre donc l'ancienne et la nouvelle version de chaque script (règle écrite dans le docstring).
- Les textes visibles (à quoi ça sert, gain, inconvénients) ne sont **pas** ici : ils sont dans [[descriptions.json]].

## Ce que le fichier expose
| Nom | Forme | Utilisé par le build |
|---|---|---|
| `I(en, fr=None)` | texte bilingue | — |
| `tweak(id, en, fr, desc_en, desc_fr, risk='safe', reboot=True)` | entrée de catalogue `{id, name, desc, risk, reboot, kind: 'tweak', requires: [], legacy: []}` | — |
| `body(*lignes)` | lignes jointes par `\n` (scripts en LF) | — |
| `NEW_SECTIONS` | `[(module, id, nom, après)]` : `('windows', 'comfort', « Interface and comfort / Interface et confort », 'system')` | créée juste après la section `system` de Windows |
| `CU` | `HKCU\Software\Microsoft\Windows\CurrentVersion` (raccourci) | — |
| `NLA_SZ` | `reg add …\Tcpip\QoS /v "Do not use NLA" /t REG_SZ /d "1"` | dans `net_dscp` |
| `QOS`, `qos(exe)` | les 11 valeurs d'une stratégie QoS telle que l'éditeur de stratégie de groupe la crée (tout en `REG_SZ`, `DSCP Value` 46, `Throttle Rate` -1, ports et adresses `*`) sous `HKLM\SOFTWARE\Policies\Microsoft\Windows\QoS\<exe>` | dans `net_dscp` |
| `DSCP_GAMES` | 12 exe : `dota2.exe`, `cod.exe`, `destiny2.exe`, `HaloInfinite.exe`, `RustClient.exe`, `Warframe.x64.exe`, `aces.exe` (War Thunder), `WorldOfTanks.exe`, `DeadByDaylight-Win64-Shipping.exe`, `Brawlhalla.exe`, `bfv.exe`, `Titanfall2.exe` | dans `net_dscp` |
| `NEW_TWEAKS` | `[(module, section, entrée, script)]`, 20 réglages | ajoutés à la fin de leur section, script `{'_': script}` |
| `NLA` | paire (avant, après) : `Do not use NLA` de `REG_DWORD` à `REG_SZ` | dans `FIXES` |
| `GAME_FX` | commande PowerShell qui applique tout de suite les animations lues dans le registre (voir plus bas) | dans `FIXES['game_mode']` |
| `FIXES` | `{id ou id:variante: [(avant, après)]}`, 11 clés | `fix_scripts` |
| `REPLACE` | `{id: script complet}` : `amd_power` | remplace le script entier (réglage sans variante seulement, `assert`) |
| `APPEND` | `{id: [lignes]}` : `win_search`, `exp_search` | lignes ajoutées à la fin de chaque variante |
| `DROP` | `[(ids, motif)]`, 2 | `drop_lines` |
| `SUB` | `[(ids, motif, remplacement)]`, 5 | `sub_lines` |
| `WARNINGS` | 1 motif (`DisableFileSyncNGSC 1`) | ajouté aux `WARNINGS` du build → `confirm` de `dbl_onedrive_off` |
| `NOTES` | texte Markdown | section « Optimisations envoyées le 2026-10-21 (1.2.0) » de [[CORRECTIONS.md (app)]] |

## Fonctionnement détaillé

### Les 20 réglages ajoutés (`NEW_TWEAKS`)
| id | Section | Risque, redémarrage | Origine |
|---|---|---|---|
| `win_taskbar`, `win_recent`, `win_highlights`, `win_classicmenu`, `win_alttab` | Windows › Interface et confort | sûr, redémarrage | Hone Basic |
| `win_lockscreen`, `win_shortcut` | Windows › Interface et confort | sûr, sans redémarrage | Hone Basic |
| `dbl_onedrive_off` | Windows › Débloat | **avancé**, redémarrage | Hone Basic (stratégie Microsoft, rien n'est supprimé, contrairement à `dbl_onedrive` retiré en 1.1.8) |
| `win_browserbg` | Windows › Nettoyage | sûr, sans redémarrage | Hone Basic (Edge, Chrome et Brave fermés pour de vrai) |
| `win_suggestions` | Interface et confort | sûr, redémarrage | Hone General & Advanced |
| `win_extensions`, `win_compact`, `win_wallpaper` | Interface et confort | sûr, sans redémarrage | idem |
| `dbl_browsers` (12 lignes), `dbl_vs` | Débloat | sûr, sans redémarrage | idem (stratégies de télémétrie Edge, Chrome, Firefox, Visual Studio) |
| `net_dscp` (134 lignes : `NLA_SZ` + 11 valeurs × 12 jeux) | Réseau › Réglages un par un | sûr, redémarrage | idem |
| `win_thispc` | Interface et confort | sûr, sans redémarrage | OptiCore |
| `net_dns` | Réseau › Réglages un par un | sûr, redémarrage | network_optimizer (DNS `1.1.1.1,8.8.8.8` sur les cartes connectées, puis `ipconfig /flushdns`) |
| `win_bgdownloads` | Windows › Système | sûr, sans redémarrage | ajouté le 22/10 (« Pack latence » : stratégies Maps et Speech à 0) |
| `net_intmod` | Réseau › Réglages un par un | sûr, redémarrage | modération des interruptions coupée (contraire de `hitreg_suite`, qui l'active) |
L'ordre ci-dessus est celui du fichier, à peu près. Le build vérifie qu'aucun id n'existe déjà (`assert entry['id'] not in scripts`).

### Réglages remplacés ou complétés (`FIXES`, `REPLACE`, `APPEND`, `DROP`, `SUB`)
- `win_visual` : les 18 lignes `VisualEffects\<effet>\DefaultApplied` (que Windows note sans les relire) sont retirées (`DROP`, avec `DWMWA_TRANSITIONS_FORCEDISABLED` et `MaxAnimate`) ; ajout de `UserPreferencesMask` `9012038010000000`, `DragFullWindows` 0, `TaskbarAnimations` 0, `ListviewAlphaSelect` 0, `EnableAeroPeek` 0.
- `in_advanced` : la valeur `link` de Windows XP → `NamingTemplates\ShortcutNameTemplate` = `"%%s.lnk"` ; `JPEGImportQuality` 256 → 100 (plage acceptée 60 à 100).
- `dbl_office` : 8 stratégies Office documentées ajoutées sous `HKCU\Software\Policies\Microsoft\Office` (anciennes lignes gardées).
- `exp_startup` : `StartupDelayInMSec` 0 écrit aussi sous HKCU.
- `win_fullscreen` : `DirectXUserGlobalSettings` n'est plus écrasé (ce qui effaçait l'Auto HDR) ; la valeur actuelle est lue par une boucle `for /f` + PowerShell (lecture seule, compatible avec [[probes.py]]), les deux réglages y sont **fusionnés** (`!dx!VRROptimizeEnable=0;SwapEffectUpgradeEnable=1;`).
- `ping_main:config2`, `net_server:s4` : `Do not use NLA` passé de `REG_DWORD` à `REG_SZ` (`NLA`).
- `game_mode:on` (Sofiene, 22/10 : « rends-le le plus performant ») : après l'arrêt du spouleur, `net stop WSearch`, `net stop DiagTrack`, `AllowAutoGameMode` et `AutoGameModeEnabled` à 1, `HistoricalCaptureEnabled` à 0. `game_mode:off` : `net start WSearch`, `net start DiagTrack`. `game_mode` (les deux variantes) : `GAME_FX` lancé avant `taskkill /f /im explorer.exe`.
- `amd_power` (`REPLACE`) : au lieu d'écrire dans `Class\{4d36e968…}\0000` (la première carte de la liste, pas forcément l'AMD), une boucle trouve chaque sous-clé `\NNNN` dont un texte contient `Advanced Micro Devices` et y écrit 11 valeurs (`DisableSAMUPowerGating`, `DisableUVDPowerGatingDynamic`, `DisableVCEPowerGating`, `DisablePowerGating`, `DisableDrmdmaPowerGating` à 1 ; `EnableVceSwClockGating`, `EnableUvdClockGating` à 1 ; `EnableAspmL0s`, `EnableAspmL1`, `EnableUlps` à 0 ; `EnableUlps_NA` à `"0"`).
- `win_search`, `exp_search` (`APPEND`) : `HKCU\Software\Policies\Microsoft\Windows\Explorer\DisableSearchBoxSuggestions` = 1.
- `SUB` : `ping_packets:qos` et `net_profile:qos` → `DSCP Value` en `REG_SZ "46"`, `Throttle Rate` `"-1"`, `Remote Port` `"*"` (tous les serveurs) ; `lat_directx` → `HwSchedMode` (inexistant) devient `HwSchMode` ; `net_advanced` → `initialRto=2000` devient `1000` (valeur Windows et RFC 6298).

### `GAME_FX`
Une seule commande `powershell -NoProfile -ExecutionPolicy Bypass -Command "…"` qui :
1. déclare `SystemParametersInfo` de `user32.dll` par `Add-Type` (classe `Rago.Spi`) ;
2. lit `HKCU\Control Panel\Desktop\UserPreferencesMask` et, pour les bits 1, 2, 3, 9, 10, 11, 12, 13, 18 (animation des menus, des listes, défilement doux, fondus, info-bulles, ombres), appelle `SystemParametersInfo(0x1001 + 2n, 0, bit, 2)` (`SPIF_SENDCHANGE` seul : le registre est déjà écrit) ;
3. lit `WindowMetrics\MinAnimate` et appelle `SystemParametersInfo(0x49, 8, ANIMATIONINFO, 2)`.
Sans cela, Windows ne relit ces valeurs qu'à la connexion suivante. **Contraintes** (commentaire du code) : ni `"` (fin d'argument pour `cmd`), ni `%`, ni `!` (variables de `cmd`) dans la commande ; les guillemets du C# viennent de `[char]34`. L'annulation la relance aussi après avoir remis la sauvegarde (règle « both » de [[undo_gen.py]]).

## Données touchées
Aucune : données importées par [[build_catalog_v6.py]]. Effets indirects : nouvelles entrées de [[catalog.json]], scripts de [[Scripts embarqués (JSON)]], section de [[CORRECTIONS.md (app)]].

## Erreurs et cas limites
- Motif sans effet ou texte « avant » introuvable : le build s'arrête (`assert` dans `fix_scripts`, `drop_lines`, `sub_lines`).
- `REPLACE` sur un réglage à plusieurs variantes : refusé (`assert list(scripts[tid]) == ['_']`).
- Un nouveau réglage sans texte dans [[descriptions.json]] arrête `describe()`.

## Liens avec le reste
- Appliqué par [[build_catalog_v6.py]] (`postprocess`, étape 5 ; `NEW_SECTIONS` et `NEW_TWEAKS` dans `main`), entre [[audit_fixes.py]] et [[safety.py]].
- Annulation des nouveaux réglages : règles de [[defaults.py]] (registre) et [[undo_gen.py]] ; relevé : [[probes.py]].
- Réglages visibles dans [[Tweaks Windows]] et [[Tweaks Réseau]] ; le Mode jeu est décrit dans [[Mode jeu]].

## Tests
Pas de test Python. Les tests Rust de [[catalog.rs]] relisent le résultat (scripts non vides, pas de bloc vide, avertissements, plan gratuit).

## À savoir avant de modifier
- **Ajouter un réglage** : une entrée `(module, section, tweak(...), body(...))` dans `NEW_TWEAKS`, puis son texte dans [[descriptions.json]], puis vérifier que [[undo_gen.py]] sait l'annuler (sinon ajouter une règle dans [[defaults.py]]). Recette complète dans [[Code du générateur de catalogue]].
- **Corriger un réglage déjà distribué** : `FIXES`, `DROP` ou `SUB` ici (après l'audit), pour que l'annulation couvre l'ancienne version.
- Garder les commandes compatibles avec le relevé « à blanc » : une boucle `for /f` ne doit lancer qu'une commande de lecture (`reg query`, `Get-…`), sinon [[probes.py]] la refuse (`lint`).
- La section `NOTES` liste en fin de texte trois choses « Pas encore fait (code de l'appli, à tester sous Windows) » : carte graphique performante et mode d'alimentation pendant le jeu, vérifications avant de jouer, préréglages graphiques dans les fichiers des jeux. Ce texte du 21/10 est **en retard** (vérifié dans le code le 10/11) : la carte graphique performante, le mode d'alimentation et les vérifications au lancement d'un jeu sont faits depuis la 1.2 ([[Pendant la partie]], [[session.rs]]) ; les préréglages graphiques n'existent que pour Minecraft (OptiFine, [[minecraft.rs]]). La phrase reste telle quelle dans [[CORRECTIONS.md (app)]] tant que `NOTES` n'est pas corrigé.
