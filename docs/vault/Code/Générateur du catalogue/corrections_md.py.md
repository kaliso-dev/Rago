---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/corrections_md.py
lignes: 38
maj: 2026-11-10
---
# corrections_md.py

Petit module qui lit et réécrit `app/docs/CORRECTIONS.md` en gardant intactes les sections écrites à la main, rangées sous une ligne marqueur. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 16/10 (commit `995b238`, app 1.1.14) : avant, chaque génération écrasait les comptes rendus écrits à la main.

## Rôle et place dans l'ensemble
`CORRECTIONS.md` ([[CORRECTIONS.md (app)]]) a deux moitiés :
1. **les sections générées** : la section v5.2 écrite par [[build_catalog.py]], puis les sections v6, « Optimisations » et « Réglages risqués retirés » ajoutées par [[build_catalog_v6.py]] (textes venant de `V6_NOTES`, [[optis_120.py]] `NOTES`, [[safety.py]] `notes()`) ;
2. **les sections écrites à la main** (plans, comptes rendus de correctifs de version), sous la ligne `MARKER`.
Ce module permet aux deux générateurs de réécrire la première moitié sans perdre la seconde.

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `PATH` | `app/docs/CORRECTIONS.md` (calculé depuis `app/tools/`) |
| `MARKER` | la ligne de séparation, un commentaire HTML invisible dans un rendu Markdown : `<!-- Sections écrites à la main : le générateur (tools/corrections_md.py) garde tel quel tout ce qui suit cette ligne. Ajouter les nouvelles sections en bas du fichier. -->` |
| `SEP` | `\n` + `MARKER` + `\n` |
| `_read(path)` | lit le fichier en UTF-8 (mode texte : un fichier en CRLF, par exemple extrait sous Windows, est lu en LF, donc le marqueur est toujours retrouvé) ; `''` si le fichier n'existe pas |
| `parts(path=PATH)` | rend `(sections générées, sections manuelles)` ; sans marqueur, tout est considéré comme généré et la partie manuelle est vide |
| `write(generated, manual, path=PATH)` | écrit `generated + SEP + manual` en UTF-8 avec fins de ligne LF (`newline=''`) ; `assert` que `generated` finit par un saut de ligne et ne contient pas le marqueur |

## Fonctionnement détaillé
1. [[build_catalog.py]] appelle `parts()` **avant** d'écrire, garde `manual`, puis `write(section v5.2, manual)`.
2. [[build_catalog_v6.py]] rappelle `parts()`, reprend la section v5.2 juste écrite, y ajoute ses sections, puis `write(tout, manual)`.
Résultat au 10/11 : marqueur ligne 616 du fichier, sections manuelles « Plan Rago Low Latency (1.1.9) », « Version 1.1.14 » et « Version 1.2.0 » en dessous.

## Données touchées
Lecture et écriture de `app/docs/CORRECTIONS.md`, rien d'autre.

## Erreurs et cas limites
- Si quelqu'un efface le marqueur, la partie manuelle est perdue à la génération suivante (tout est traité comme généré). Git permet de la retrouver.
- Le marqueur doit rester sur sa propre ligne, entouré de sauts de ligne, sinon `partition(SEP)` ne le trouve pas.

## Liens avec le reste
Importé par [[build_catalog.py]] et [[build_catalog_v6.py]]. Le fichier produit est décrit dans [[CORRECTIONS.md (app)]] ; [[Sources]] le cite parmi les documents du dépôt.

## À savoir avant de modifier
- Pour ajouter un compte rendu de correctif, l'écrire **à la fin** de `CORRECTIONS.md`, sous les sections manuelles existantes ; ne jamais écrire au-dessus du marqueur (ce serait écrasé).
- Aucune règle écrite n'oblige à ajouter une section par version : la 1.2.2 et la 1.3.0 n'en ont pas (voir [[CORRECTIONS.md (app)]]).
