---
type: code
tags: [code, app, catalogue, données, json]
fichier: app/tools/descriptions.json
lignes: 2773
maj: 2026-11-10
---
# descriptions.json

Les **textes visibles** de chaque réglage du catalogue, en français et en anglais : à quoi il sert (`desc`), ce qu'on peut en attendre (`gain`) et ses inconvénients (`cons`). Fichier écrit à la main (aucun générateur) ; c'est la **seule** source des explications affichées dans l'app. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 09/10 (commit `bd62ada`, app 1.1.8 : « chaque réglage expliqué », textes du 08/10), modifié 6 fois depuis : 10/10 (`c64859e`), 15/10 (`49282a4`), 21/10 (`3301e40` presets par jeu, `365fff1` optimisations du 21/10), 22/10 (`783326a`, `b767d4d`).

## Format
```json
{
 "<id du réglage>": {
  "fr": { "desc": "…", "gain": "…", "cons": "…" },
  "en": { "desc": "…", "gain": "…", "cons": "…" }
 },
 …
}
```
- Un objet JSON, indentation d'un espace, UTF-8 (accents écrits tels quels), 2 773 lignes, 145 559 octets.
- **231 entrées**, une par entrée du catalogue (y compris les jumeaux), et **aucune pour les 17 réglages retirés**. Chaque entrée a exactement `fr` et `en`, chacun avec exactement `desc`, `gain` et `cons`, tous non vides.
- Longueur moyenne (anglais) : `desc` 92 caractères (43 à 222), `gain` 68 (18 à 123), `cons` 61 (18 à 164). Le français est environ 15 % plus long.
- Exemple (`net_nagle`, anglais) : `desc` « Turns off Nagle's algorithm and delayed ACKs, which bundle small network packets before sending them. », `gain` « Rarely measurable: Minecraft Java and most games already turn it off themselves. », `cons` « No known drawback. ».

## Comment il est utilisé
- `describe()` de [[build_catalog_v6.py]] (étape 11 de `main`, **après** tout le reste) charge le fichier et :
  1. vérifie par `assert` que l'ensemble des ids du fichier est **exactement** celui des entrées du catalogue (le message liste les ids manquants et en trop) ;
  2. remplace `desc`, `gain` et `cons` de chaque entrée par `{en, fr}` venant d'ici ;
  3. vérifie que deux jumeaux (`twin`, même script) ont des textes **identiques**.
- Le résultat est dans [[catalog.json]] ; l'interface l'affiche dans le détail de chaque réglage ([[catalog.ts]], [[Tableau de bord]]) ; [[catalogue_vault.py]] le recopie (en français) dans les notes [[Tweaks Réseau]], [[Tweaks Latence]], etc. ; le site le reprend par `site/tools/sync_app.py` ([[Site]]).
- Ligne directrice (docstring de `describe`, 08/10) : dire à quoi sert le réglage, ce qu'on peut en attendre **sans promettre de gain non vérifié**, et ses inconvénients. Beaucoup de `gain` disent franchement « Effet rarement mesurable » : voir [[Voix et ton]].

## Erreurs et cas limites
- Ajouter un réglage sans son texte, ou retirer un réglage sans enlever son texte : le build s'arrête.
- Deux jumeaux aux textes différents : le build s'arrête (corriger les deux à l'identique).

## Liens avec le reste
- Lu par [[build_catalog_v6.py]] seulement.
- Écrase les anciens textes de [[meta.py]], de `T()` v6 et de [[audit_fixes.py]] (`DESC_FIX_PLUS`) : ces textes-là ne s'affichent plus.

## À savoir avant de modifier
- **Changer une explication = modifier ce fichier puis `npm run catalog`**, jamais `catalog.json` à la main.
- Français simple pour `fr`, anglais américain pour `en` (règles de [[Voix et ton]] ; textes vus par les joueurs en anglais par défaut).
- Les clés ne suivent **pas** l'ordre du catalogue : elles sont dans l'ordre où les textes ont été écrits (réglages des `.bat` v6 d'abord, puis ceux de l'ancien programme, puis les ajouts du 21/10 à la fin). L'ordre n'a aucun effet ; ajouter un nouveau texte à la fin garde des différences git lisibles.
