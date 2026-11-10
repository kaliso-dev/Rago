---
type: fonctionnalité
tags: [fonctionnalité, app, technique]
version_app: 1.3.0
maj: 2026-11-10
---
# Moteur des tweaks

Comment un tweak s'applique et s'annule (`runner.rs`, `backup.rs`, `history.rs`, `seal.rs`, `catalog.rs`). Voir [[Catalogue des tweaks]]. Détail du code : section « Code » plus bas.

1. **Un lot à la fois**, dans un fil ; un verrou global (`EXCLUSIVE`) empêche aussi un lot de l'interface de croiser une [[Remise à zéro]]. Le journal part vers l'interface ligne par ligne (événements `run:item`, `run:log`, `run:done`).
2. **Point de restauration d'abord** : si `rst_point` est dans le lot et échoue, les réglages suivants qui changent Windows sont **sautés** (« No restore point: the tweaks after it are not run ») ; les annulations tournent quand même. Le moteur lève la limite de Windows d'un point par 24 h (`SystemRestorePointCreationFrequency` = 0).
3. **Relevé avant** : pour chaque tweak, un script de relevé (`tools/probes.py`) dit ce qui va changer (lignes `@@RAGO`) ; chaque élément est lu **une seule fois, avant la première modification par Rago** (« état d'avant ») et gardé dans `applied.json` (chiffré DPAPI).
4. **Exécution** : chaque script est déchiffré, écrit dans `run\` du dossier de l'app (pas `%TEMP%`, que beaucoup de tweaks vident), lancé par `cmd.exe /d /c` depuis son propre dossier (un `&` ou `(` dans le nom du compte Windows ne casse rien), sans fenêtre, entrée fermée (un `pause` ne bloque jamais), puis supprimé. `run\` est vidé au démarrage. Journal dans `logs\run-<ms>.log` ; la sortie des outils Windows est lue en UTF-8, sinon en page OEM (CP850) pour garder les accents.
5. **Jumeaux** : deux tweaks cochés ensemble qui ont exactement le même script ne le lancent qu'une fois (« Same commands as …, applied above: not run again »).
6. **Tweaks natifs** (code Rust, pas de script) : préréglage OptiFine (`mc_optifine`, 5 sauvegardes de `optionsof.txt`), profil NVIDIA (`nv_profile` via nvidiaProfileInspector ; l'annuler importe un profil vide, donc les réglages du pilote), point de restauration (`rst_point`).
7. **Annuler** : décocher remet l'état d'avant, sauf les éléments qu'un autre tweak encore appliqué touche aussi (remis quand le dernier est décoché). Ce que la sauvegarde ne sait pas relever (`netsh`, PowerShell, plans d'alimentation supprimés) est remis par un script `rest`, après la sauvegarde, ou avant pour `pow_ultimate` et `pow_delete_plans` (`rest_avant` : le plan doit être recréé avant d'être réactivé). Sans sauvegarde (tweak appliqué avant la 1.1.6 ou par l'ancien `.bat`) : les valeurs par défaut de Windows (`full`). Une annulation coupée garde le tweak « appliqué » et reprend au lancement suivant.
8. **RBW Mod** : défaire `rbw_mode` ne restaure pas la sauvegarde, cela lance la variante « Activé », qui remet ce que lit le vérificateur ([[RBW Mod]]).
9. **Arrêt** : « Cancel » tue le script en cours ; une [[Remise à zéro]] de fin de licence s'arrête entre deux tweaks si la licence revient (`stop_when`), jamais au milieu d'un tweak.
10. **Historique** : `history.json` (chiffré), visible dans le module Restaurer, effaçable.
11. **Scripts chiffrés** dans l'exe : Premium avec la clé fournie par le serveur à une licence active ; gratuits et retours arrière avec une clé interne. Voir [[Clés et secrets]].

Liens : [[Remise à zéro]], [[Réparations au lancement]], [[App Windows]].

## Code
- Moteur des lots : [[runner.rs]] ; état d'avant et `applied.json` : [[backup.rs]] ; historique : [[history.rs]].
- Scripts et règles du plan gratuit : [[catalog.rs]] ; chiffrement : [[seal.rs]], [[embed_scripts.rs]] ; fichiers natifs : [[assets.rs]] ; OptiFine : [[minecraft.rs]].
- Format des scripts, relevés et annulations : [[Scripts embarqués (JSON)]] (générés par [[build_catalog_v6.py]]).
- Commande `run_tweaks` et règles de l'offre (`start_tweaks`) : [[lib.rs]]. Carte d'ensemble : [[Code de l'app (Rust)]].
