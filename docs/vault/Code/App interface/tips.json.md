---
type: code
tags: [code, app, json, donnees, conseils]
fichier: app/src/data/tips.json
lignes: 971
maj: 2026-11-11
---
# tips.json

La **liste des réglages en jeu conseillés** des [[Conseils au lancement du jeu]] : pour 8 jeux, les réglages à changer dans le jeu, leur valeur, la raison et les sources. Écrit à la main (aucun générateur), lu par l'interface ([[tips.ts]]) et par le moteur ([[tips.rs]], seulement les identifiants). Fiche parente : [[Code de l'app (interface)]].

**Fichier ajouté le 11/11 par la PR #91 (brouillon, pas encore dans `staging`).** Tout ce qui suit est CONFIRMÉ (code de la branche `claude/project-thread-g3od2h`, 11/11).

## Format
```json
{
  "version": 1,
  "updated": "2026-11-11",
  "games": {
    "valorant": {
      "name": "VALORANT",
      "sources": [{ "name": "ProSettings", "url": "https://prosettings.net/guides/valorant-options", "date": "2026-05-18" }],
      "tips": [{ "id": "valorant.highlight", "tag": "see", "setting": "Enemy Highlight Color",
                 "value": { "en": "Yellow (Deuteranopia)", "fr": "Yellow (Deuteranopia)" },
                 "why": { "en": "…", "fr": "…" } }]
    }
  }
}
```
- Clé du jeu = clé des presets de jeu (`PRESET_EXES` de [[games.rs]], variantes de `pri_game`) : `valorant`, `fortnite`, `cs2`, `apex`, `pubg`, `lol`, `rivals`, `finals`.
- `id` : `<clé>.<réglage>`, unique ; **ne jamais le changer** (les cases cochées des joueurs y sont liées, `tips-done.json`).
- `tag` : `see` (Visibilité), `lag` (Latence), `fps`, `build` (Construction), `aim` (Visée).
- `setting` : nom exact dans le menu du jeu, en anglais ; plusieurs réglages séparés par « · ».
- `value`, `why` : en anglais et en français (tutoiement, [[Voix et ton]]).
- `sources` : nom, adresse et date de la page lue (`AAAA-MM-JJ` ou `AAAA-MM`).

## Contenu (11/11)
65 réglages : VALORANT 9, Fortnite 8, Counter-Strike 2 9, Apex Legends 8, PUBG 8, League of Legends 6, Marvel Rivals 8, THE FINALS 9. Liste lisible, réglage par réglage, avec les sources : [[Conseils au lancement du jeu]].

## À savoir avant de modifier
- Ajouter un jeu : sa clé doit exister dans `PRESET_EXES` ([[games.rs]]), sinon ses réglages ne s'afficheraient jamais en partie (le test `every_tip_belongs_to_a_known_game` de [[tips.rs]] échoue).
- Le moteur inclut le fichier dans l'exe : un changement demande une nouvelle version de l'app. Mettre à jour `updated` et les dates des sources.
- Garder des sources datées et sérieuses (pages de pros, guides récents, aide officielle) ; un réglage disparu d'un jeu doit être retiré.
