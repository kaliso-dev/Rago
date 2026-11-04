---
type: fonctionnalité
tags: [fonctionnalité, app, minecraft, rbw]
version_app: 1.2.1
maj: 2026-10-31
---
# RBW Mod

Module du groupe « En jeu » pour jouer en **Ranked Bedwars** (RBW), partenaire officiel ([[Partenaires et créateurs]]). Le vérificateur de RBW (RBW-SS, `Services.ps1`, relevé le 13/10, voir `app/tools/rbw.py`) contrôle des services et réglages Windows pendant un screenshare : un service arrêté peut valoir un ban.

- **Le tweak** `rbw_mode` (Premium ; son retour est gratuit) : « Activé » = exactement le script `Rago-RBW-Fix.ps1` (relance chaque service lu et rétablit les réglages coupés) ; « Désactivé » = valeurs Windows. Ne touche à rien d'autre ; lancé en dernier dans un lot. Décision du 13/10. Détail : [[Tweaks RBW Mod]].
- **Vérification Ranked Bedwars** (1.2.0, `rbw.rs`, lecture seule) : 11 services, CDPUserSvc et 6 réglages, relus toutes les 5 s ; chaque service doit tourner, aucun réglage ne doit valoir 0, la stratégie AppCompat ne doit pas exister. « Prêt pour le screenshare » ou « N éléments en rouge » ; bouton « Tout remettre en marche » (= RBW Mod Activé).
- Bug RAG-69 (services laissés arrêtés) présent en [[Version 1.1.10]], corrigé en [[Version 1.1.14]].
- **Règle** : aucun preset, nettoyage ou outil ne touche à ce que lit le vérificateur ([[Presets]], [[Page Outils]]).
