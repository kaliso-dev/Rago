---
type: fonctionnalité
tags: [fonctionnalité, app, technique]
version_app: 1.2.1
maj: 2026-10-31
---
# Moteur des tweaks

Comment un tweak s'applique et s'annule (`runner.rs`, `backup.rs`, `history.rs`, `seal.rs`, `catalog.rs`). Voir [[Catalogue des tweaks]].

1. **Un lot à la fois**, dans un thread ; le journal part vers l'interface ligne par ligne.
2. **Relevé avant** : pour chaque tweak, un script de relevé (`tools/probes.py`) dit ce qui va changer ; chaque élément est lu **une seule fois, avant la première modification par Rago** (« état d'avant ») et gardé dans `applied.json` (chiffré DPAPI).
3. **Exécution** : chaque script est déchiffré, écrit dans `run\` du dossier de l'app (pas `%TEMP%`, que beaucoup de tweaks vident), lancé par `cmd.exe /d /c` sans fenêtre, entrée fermée (un `pause` ne bloque jamais), puis supprimé. `run\` est vidé au démarrage. Journal dans `logs\run-<ms>.log`.
4. **Tweaks natifs** (code Rust, pas de script) : préréglage OptiFine (`mc_optifine`, 5 sauvegardes de `optionsof.txt`), profil NVIDIA (`nv_profile` via nvidiaProfileInspector), point de restauration (`rst_point`).
5. **Annuler** : décocher remet l'état d'avant, sauf les éléments qu'un autre tweak encore appliqué touche aussi (remis quand le dernier est décoché).
6. **Historique** : `history.json` (chiffré), visible dans le module Restaurer, effaçable.
7. **Scripts chiffrés** dans l'exe : Premium avec la clé fournie par le serveur à une licence active ; gratuits et retours arrière avec une clé interne. Voir [[Clés et secrets]].

Liens : [[Remise à zéro]], [[Réparations au lancement]], [[App Windows]].
