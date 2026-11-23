---
type: fonctionnalité
tags: [fonctionnalité, app, minecraft, rbw]
version_app: 1.2.1
maj: 2026-11-23
---
# RBW Mod

Module du groupe « En jeu » pour jouer en **Ranked Bedwars** (RBW), partenaire officiel ([[Partenaires et créateurs]]). Le vérificateur de RBW (RBW-SS, `Services.ps1`, relevé le 13/10, voir `app/tools/rbw.py`) contrôle des services et réglages Windows pendant un screenshare : un service arrêté peut valoir un ban.

- **Le tweak** `rbw_mode` (Premium ; son retour est gratuit) : « Activé » = exactement le script `Rago-RBW-Fix.ps1` (relance chaque service lu et rétablit les réglages coupés) ; « Désactivé » = valeurs Windows. Ne touche à rien d'autre ; lancé en dernier dans un lot. Décision du 13/10. Détail : [[Tweaks RBW Mod]].
- **Vérification Ranked Bedwars** (1.2.0, [[rbw.rs]], lecture seule) : 11 services, chaque `CDPUserSvc_*` et 6 réglages (5 valeurs de registre + « PCA Logging »), relus toutes les 5 s ; chaque service doit tourner, aucun réglage ne doit valoir 0, la stratégie AppCompat ne doit pas exister. La page du module (refaite le 23/11 à l'identique de la maquette v5 `app-module-rbw.html`, dans `staging` (PR #122, fusionnée le 23/11), jamais testée sur Windows) montre en tête le nombre d'éléments en rouge (« red at screenshare »), puis le verdict « Ready for screenshare » ou « N red at screenshare », le bouton **« turn on rbw mod »** (= RBW Mod Activé, relancé même s'il est déjà appliqué, car Windows a pu recouper un service) ou « turn off rbw mod » quand il est activé et tout vert, et deux grilles « Services » et « Settings » (vert ou rouge par élément).
- Bug RAG-69 (services laissés arrêtés) présent en [[Version 1.1.10]], corrigé en [[Version 1.1.14]].
- **Règle** : aucun preset, nettoyage ou outil ne touche à ce que lit le vérificateur ([[Presets]], [[Page Outils]]).

## Code
- [[rbw.rs]] : liste des services et réglages lus par le vérificateur, commande `rbw_status` (lecture seule).
- Le réglage `rbw_mode` (script `Rago-RBW-Fix.ps1`) vient du générateur du catalogue : [[rbw.py]] ; liste détaillée : [[Tweaks RBW Mod]].
- Interface : panneau `RbwPanel` de [[ModulePage.tsx]] (relecture toutes les 5 s et après chaque lot), seul contenu de la page RBW Mod depuis le 23/11 (l'ancien composant `RbwStatus.tsx` est retiré).
