---
type: fonctionnalité
tags: [fonctionnalité, app]
maj: 2026-11-07
---
# Mode jeu

Réglage « Game mode » de Rago (gratuit, `win_gamemode`).

- Renforcé en [[Version 1.2.0]] (22/10) : « Activé » met en pause l'indexation de la recherche et la télémétrie jusqu'au redémarrage, coupe l'enregistrement en fond de la Xbox Game Bar, active le Mode jeu de Windows, coupe les animations tout de suite.
- « Désactivé » et l'annulation relancent tout. Les services gardent leur type de démarrage.
- La description du mode jeu sur le [[Site]] parlait encore de l'ancienne version au 22/10 (À VÉRIFIER après la PR #66).
- Icône éclair (`Zap`) contraire à la [[Charte graphique]] (écart à arbitrer).

Liens : [[Catalogue des tweaks]], [[Offres et prix]].

Depuis le 07/11 (branche locale, pas encore sur GitHub), [[Rago OS]] peut allumer et éteindre ce mode à chaque partie par le pont, et demander en plus le « Mode jeu total » (services inutiles en pause, `boost.rs`).
