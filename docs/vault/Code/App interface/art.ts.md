---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/art.ts
lignes: 12
maj: 2026-11-10
---
# art.ts

Deux petites fonctions pour dessiner la **vignette d'un jeu** quand son image officielle n'est pas (encore) là : les initiales et une teinte stable. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Bibliothèque de jeux]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
| Fonction | Ce qu'elle fait |
|---|---|
| `initials(name)` | remplace tout ce qui n'est ni lettre, ni chiffre, ni espace par un espace, découpe en mots ; deux mots ou plus → première lettre des deux premiers ; un mot → ses deux premiers caractères ; rien → `?` ; en majuscules (« Counter-Strike 2 » → `CS`, « VALORANT » → `VA`) |
| `hue(id)` | teinte de 0 à 359 calculée par un hachage simple de l'id (`h = (h × 31 + code du caractère) mod 360`) : le même jeu garde toujours la même couleur de dégradé |

## Liens avec le reste
- [[Games.tsx]] : tuiles de la bibliothèque (initiales + dégradé tant que `gameArt` n'a rien renvoyé, voir [[api.ts]]).
- [[Dashboard.tsx]] : teinte des pastilles des presets par jeu.
- Styles : dégradé des vignettes dans `features.css` (voir [[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Changer la formule de `hue` change la couleur de tous les jeux chez tous les joueurs (rien n'est stocké, tout est recalculé).
