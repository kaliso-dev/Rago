---
type: code
tags: [code, app, react, composant, jeux, presets]
fichier: app/src/components/PresetPicker.tsx
lignes: 163
maj: 2026-11-23
---
# PresetPicker.tsx

La fenêtre **« Pick a preset »** : le choix du preset d'un jeu, avec **une cover verticale par jeu**, comme une affiche de match. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Presets]], [[Bibliothèque de jeux]].

Demande de Sofiene du 23/11/2026 : « pour les games preset on doit faire des design pour chaque presets avec les vrais cover des jeux […] il faudrait que chaque jeu est une cover vertical comme ça il pourront choisir leur preset », avec une photo en exemple (cartes verticales, nom du jeu, bande penchée, grande abréviation). Maquette faite le 23/11 : `rendus-v5/src/app-preset-picker.html` (capture : `app-strict/2-choix-du-preset-maquette.jpg` dans le dossier du projet), **en attente de la validation de Sofiene** ; le composant la reprend au pixel près. Pas encore essayé sur un vrai Windows.

## Rôle et place dans l'ensemble
- Ouverte par [[Games.tsx]] : case « preset » du jeu en tête, ou bouton réglages d'une vignette.
- Props : `game` (nom affiché dans « VALORANT // PRESET »), `value` (preset actuel du jeu), `games` (jeux trouvés, pour « on your pc »), `onPick(ref)`, `onClose()`.
- Posée par un portail React sur `document.body`, au-dessus de la barre latérale (la page est animée et rognée).
- Rien n'est appliqué ici : le preset choisi sert au prochain « Optimize and play ».
- CSS : `s5/pages/picker.css` (le `<style>` de la maquette, plus les règles de fenêtre `.dim2`, `.mdl`, `.ml`, `.mf` de `win.css` limitées à `.ovl`), et la fin de `s5/app.css`.

## Ce que le fichier expose
- `PresetPicker(props)` : la fenêtre.
- `presetCount(entrées)` : nombre de réglages utilisables d'un preset (`kind === "tweak"` dans le catalogue), aussi utilisé par [[Games.tsx]].
- `presetArtKey(id)` : clé de l'image d'un preset de jeu (`game_valorant` → `valorant`, `mc_pvp` → `minecraft`).

## Fonctionnement détaillé
- **En-tête** : « VALORANT // PRESET », titre « PICK A PRESET » sur bande rouge (`.h2.tape`), « The game starts with these tweaks applied. You can change it any time, nothing is applied until you press play. », et trois onglets :
  - **game presets** (16) : les presets `game: true` du catalogue et `mc_pvp` (Minecraft Java), dans l'ordre Valorant, CS2, Fortnite, Minecraft, Apex, Rainbow Six Siege, Overwatch 2, Rocket League, League of Legends, PUBG, Marvel Rivals, The Finals, Tarkov, Roblox, GTA V, Minecraft Bedrock ; ceux dont le jeu est sur le PC passent devant ;
  - **ready-made** (5) : Max FPS (« fps »), Low latency (« ping »), Laptop (« eco »), Privacy (« priv ») et « No preset » (« off ») ;
  - **mine** : les presets de « Mes presets » (grisé s'il n'y en a pas).
- **Carte** (8 par ligne, 2:3) : la cover du jeu (`artByKey(..., "cover")`, 400 × 600 embarquée), un dégradé sombre en bas, l'abréviation du preset (le `tag` du catalogue : VAL, CS2, FN, MC, APEX, R6, OW2, RL, LOL, PUBG, MR, TF, EFT, RBX, GTA, MCBE) en Barlow Condensed 900 italique sur une bande rouge penchée, et « 21 tweaks ». Puce « on your pc » (point vert) si un jeu trouvé a ce preset (`presetForGame`). Les presets sans cover (tout faits, les miens) ont un fond rayé et une grande icône imprimée (apply, latency, battery, eyeoff, ban, star).
- **Sélection** : un clic entoure la carte de rouge avec une coche ; double-clic ou Entrée choisit tout de suite.
- **Pied** : miniature et nom du preset sélectionné (« Valorant preset »), « 21 tweaks: » et la description du catalogue ; « Cancel » et « Use this preset » (rouge, appelle `onPick`). Échap ou un clic sur le fond ferme sans rien changer.
- La fenêtre fait 1184 px de large (moins dans une fenêtre plus petite) et garde le même haut quand on change d'onglet.

## Liens avec le reste
- [[catalog.ts]] (presets, `presetForGame`, `tweaks`), [[store.tsx]] (`myPresets`), `s5/art.ts` et `s5/ui.tsx` ([[Maquettes v5 dans l'app (s5)]]).
- Textes : clés `s5.pick.*` de [[i18n.ts]].
