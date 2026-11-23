---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/art.ts
lignes: 5
maj: 2026-11-23
---
# art.ts

Une petite fonction : les **initiales** d'un nom, pour ce qui n'a pas d'image. Fiche parente : [[Code de l'app (interface)]]. À ne pas confondre avec `s5/art.ts` (images embarquées des jeux et photos des pros, [[Maquettes v5 dans l'app (s5)]]).

## Ce que le fichier expose
| Fonction | Ce qu'elle fait |
|---|---|
| `initials(name)` | remplace tout ce qui n'est ni lettre, ni chiffre, ni espace par un espace, découpe en mots ; deux mots ou plus → première lettre des deux premiers ; un mot → ses deux premiers caractères ; rien → `?` ; en majuscules (« Counter-Strike 2 » → `CS`, « VALORANT » → `VA`) |

## Liens avec le reste
- [[Display.tsx]] : carte d'un pro sans photo (initiales sur fond rayé).
- `hue(id)` (teinte stable d'un jeu pour les anciennes vignettes) a été retirée le 23/11 : plus aucune page ne s'en servait depuis que Jeux, le tableau de bord et Display sont refaits sur les maquettes v5.
