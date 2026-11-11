---
type: code
tags: [code, app, json, donnees, couleurs, résolution]
fichier: app/src/data/pros.json
lignes: 30
maj: 2026-11-11
---
# pros.json

Les **réglages d'écran des pros** proposés dans la page « Couleurs et résolution » : saturation et résolution de 22 joueurs (5 Valorant, 13 CS2, 4 Fortnite), importables en un clic avec Premium. Fichier écrit **à la main** (aucun générateur), lu seulement par l'interface. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Couleurs et résolution]]. Page : [[Display.tsx]].

Tout ce qui suit est CONFIRMÉ (code de la branche `claude/project-thread-7n0ikn`, 11/11). Relevé fait le 11/11/2026 sur prosettings.net et specs.gg.

## Format
Un objet JSON : `_doc` (explication en français), `updated` (`2026-11-11`, date du relevé, affichée dans la page) et `pros`, une liste. Chaque pro :

| Clé | Sens |
|---|---|
| `id` | identifiant (gardé dans le profil du jeu, champ `pro`) |
| `name` | nom affiché |
| `game` | `valorant`, `cs2` ou `fortnite` |
| `vibrance` | Digital Vibrance du panneau NVIDIA : 50 = couleurs de Windows, 100 = maximum ; `null` = pas publiée (les couleurs du joueur restent à l'import) |
| `resolution` | `[largeur, hauteur]`, `null` = résolution native de l'écran |
| `stretch` | étirée (sinon bandes noires) |
| `source`, `url` | site et page d'où vient le relevé |
| `checked` | date de mise à jour de la page source (`AAAA-MM-JJ`, ou `AAAA-MM` quand le site ne donne que le mois) |
| `monitor`, `ingame` | réglages de son écran et dans le jeu, **affichés seulement**, jamais appliqués |

## Contenu (relevé du 11/11/2026)
| Jeu | Pros (saturation · résolution) |
|---|---|
| Valorant | TenZ (100 % · native, specs.gg), kaajak (55 % · 1440×1080 étirée), Demon1, Derke, Less (50 % · native) |
| CS2 | ZywOo (50 % · 1024×768), donk, m0NESY, s1mple, sh1ro, b1t, Twistzz (50 % · 1280×960), NiKo et frozen (60 % · 1280×960), ropz (100 % · native), device (non publiée · 1280×960), XANTARES (100 % · 1024×768), jL (100 % · 1280×960) ; toutes les résolutions 4:3 sont étirées |
| Fortnite | Bugha (75 %), Peterbot (70 %), Veno (70 %), Malibuca (65 %), tous en résolution native |

Sources : prosettings.net pour tous, sauf TenZ (specs.gg). Les dates des pages vont de septembre 2025 (Bugha) à novembre 2026.

## Qui le lit
- Seulement [[Display.tsx]] (`import prosData from "../data/pros.json"`). Le moteur ([[display.rs]]) ne le lit pas : il reçoit le profil déjà rempli, et ne garde que l'id du pro pour savoir si un import est nouveau (Premium, voir [[lib.rs]]).

## À savoir avant de modifier
- **Revérifier avant chaque sortie** : les pros changent souvent de réglages. Mettre à jour `checked` de chaque pro touché et `updated`.
- Quelques saturations de pros CS2 viennent de pages lues en résumé : À VÉRIFIER ([[Questions ouvertes]]).
- Ajouter un jeu : il faut aussi l'onglet (`PRO_GAMES`) et `proGameOf` dans [[Display.tsx]], et son fichier de réglages dans `GameFile` de [[display.rs]] si on veut y écrire la résolution.
- Ne jamais écrire une valeur devinée : `null` quand la saturation n'est pas publiée.
