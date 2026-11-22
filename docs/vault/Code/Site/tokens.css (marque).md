---
type: code
tags: [code, marque, css, json, design]
fichier: brand/tokens/tokens.css
lignes: 215
maj: 2026-11-22
---
# tokens.css (marque)

La feuille des jetons de design de Rago (variables CSS `--rg-*`), **v2.0 « Match day »** du 22/11/2026 ([[Charte graphique]]). Cette note couvre aussi `brand/tokens/tokens.json` (413 lignes), sa « source de vérité ». Fiche parente : [[Kit de marque (brand)]].

CONFIRMÉ (branche du site v5, PR #109 vers `staging`, 22/11). Copiés depuis le kit `rago-redesign/rendus-v5/marque/tokens/` (produits par `gen_tokens.py` de la maquette ; aucun script du dépôt ne les génère). Les noms `--rg-*` de la v1.2 sont gardés quand le rôle est le même, pour que l'app et le serveur passent en v5 sans renommer.

## Ce que le fichier expose (`:root`)
| Groupe | Jetons et valeurs |
|---|---|
| Fonds | `--rg-ink-0` `#070708` (fond du Cerveau, derrière la fenêtre), `-1` `#0A0A0B` (fond de tout), `-2` `#111113` (panneaux, cartes), `-3` `#17171A` (surface levée), `-4` `#1F1F23` (piste d'interrupteur, survol), `-5` `#2A2A30` (rare) |
| Texte | `--rg-text-1` `#F5F5F6`, `-2` `#A1A1AA`, `-3` `#6E6E78` (petits libellés, jamais une phrase), `--rg-text-inverse` `#0A0A0B` (sur le rouge et le papier) |
| Bordures | `--rg-line-1` blanc 7 %, `-2` 13 %, `-3` 16 % |
| Rouge (seul accent) | `--rg-red-300` `#FF8A82`, `-400` `#FF5E55` (survol), `-500` `#FF3B30` (accent, texte encre dessus, jamais blanc), `-600` `#F2352B`, `-700` `#C9221A`, `--rg-red-a12`, `--rg-red-a24` ; `--rg-red-gradient` = rouge plein (plus de dégradé en v5, gardé pour ne rien casser) |
| Papier | `--rg-paper` `#ECE9E2` (face du R imprimé et des icônes, ruban des titres de section) |
| États, effets d'affiche | succès, alerte, trame de points, rayures carbone, hachures (classes `.rg-halftone`, `.rg-carbon`, `.rg-hatch`) |
| Polices | `--rg-font-sans` Barlow (phrases, jamais en italique), `--rg-font-mono` = Barlow Condensed (plus de police à chasse fixe), `--rg-font-display` Barlow Condensed |
| Angles | `--rg-skew` -12° : fond penché des boutons, onglets, options, segments (classe `.rg-skew`, seul le `::before` penche) |
| Rayons v5 | segments 2,5 px, puces 8, petits boutons 9, onglets 10, options 11, boutons 12, tuiles 14, grands boutons 16, cartes 18, barre Apply 20, panneaux 22 ; anciens noms `--rg-radius-xs` à `-full` gardés avec des valeurs v5 (plus de boutons en pilule) |
| Hauteurs, espacement, ombres, mouvement | relevés sur les maquettes 1 440 × 900 ; ombres seulement pour ce qui flotte et la lueur rouge ; mouvement inchangé depuis la v1.2 |
| Styles de texte | `--rg-t-title` (900 italique 150 px), `--rg-t-num-hero`, `--rg-t-grade`, `--rg-t-metric`, `--rg-t-stat`, `--rg-t-card-title`, `--rg-t-h2`… avec leur interlettrage `--rg-ls-*` ; classes `.rg-title`, `.rg-kick`, `.rg-label`, `.rg-metric`, `.rg-overline` |
| v1.2 gardés | verre (`--rg-glass-*`) et tailles Geist, dans un bloc à part, « à retirer composant par composant » |

Thème sombre seulement : le thème clair de la v1.2 est retiré. `@media (prefers-reduced-motion: reduce)` coupe les durées.

## Copies ailleurs
- `licensing/public/tokens.css` : copie de la v2.0 avec les `@font-face` Barlow en tête (PR #107 du 22/11, voir [[Styles du serveur (CSS)]]).
- `app/src/styles/tokens.css` : passe en v5 avec la PR de l'app (fil à part, 22/11) ; tant qu'elle n'est pas fusionnée, l'app garde la v1.2.
- Le site n'importe pas ce fichier : [[v5.css]] déclare des alias courts (`--bg`, `--ink`, `--red`…) avec les mêmes valeurs.

## À savoir avant de modifier
- Modifier `tokens.json` et `tokens.css` ensemble (ou les régénérer avec `gen_tokens.py` dans le dossier partagé), puis recopier dans le serveur, l'app et vérifier [[v5.css]].
- Un seul accent, le rouge ; texte sur `#FF3B30` toujours en encre `#0A0A0B`.
