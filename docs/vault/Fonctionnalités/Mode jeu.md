---
type: fonctionnalité
tags: [fonctionnalité, app]
maj: 2026-11-10
---
# Mode jeu

Réglage « Mode jeu Rago » (« Rago game mode », `game_mode`, module « Mode jeu » du catalogue). **Premium** ; seule la variante « Désactivé » (le retour) est gratuite (`reverts` de `free.json`, déjà le cas avant la 1.3.0). Correction du 10/11 : cette note disait « gratuit, `win_gamemode` » ; `win_gamemode` est un autre réglage, « Mode jeu Windows » (module Windows, gratuit), qui allume ou coupe seulement le Mode jeu de Windows.

- Renforcé en [[Version 1.2.0]] (22/10) : « Activé » met en pause l'indexation de la recherche et la télémétrie jusqu'au redémarrage, coupe l'enregistrement en fond de la Xbox Game Bar, active le Mode jeu de Windows, coupe les animations tout de suite. Description du catalogue au 10/11 (`staging`) : vide aussi les fichiers temporaires et coupe l'impression (« la recherche de fichiers est plus lente et l'impression ne marche plus tant que le mode est activé »).
- « Désactivé » et l'annulation relancent tout. Les services gardent leur type de démarrage.
- La description du mode jeu sur le [[Site]] parlait encore de l'ancienne version au 22/10 (À VÉRIFIER après la PR #66).
- Icône éclair (`Zap`) contraire à la [[Charte graphique]] (écart à arbitrer).

Liens : [[Catalogue des tweaks]], [[Offres et prix]].


## Code
- Le réglage `game_mode` est un script scellé du catalogue, lancé par [[runner.rs]] ; plan gratuit : [[free.json]].
- Ce que l'app fait d'elle-même pendant une partie (sans ce réglage) : [[Pendant la partie]] ([[session.rs]]).
