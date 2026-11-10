---
type: marketing
tags: [marketing, vidéo, youtube]
source: /mnt/project-files/marketing/videos-youtube/
maj: 2026-11-10
---
# Vidéos YouTube

Les vidéos de Rago, et ce que le dossier partagé `marketing/videos-youtube/` en garde ([[Sources]]). Retour à [[Marketing]].

**Qui s'en occupe** : les vidéos sont faites par **Abel**, l'associé de Sofiene (Sofiene, 01/11 ; [[Personnes et services]]). Sofiene ne suit pas leur publication et ne veut plus de questions à ce sujet (10/11 : « il faut supprimer tout ça », [[Décisions]]). Cette note décrit donc les fichiers, pas ce qui a été publié.

**Statut** : les fichiers sont **CONFIRMÉS** (vus dans le dossier partagé, durées et tailles mesurées avec `ffprobe` le 10/11). Ce qui a été mis en ligne n'est pas suivi.

## Étude de style (18/10)
Fichier `ETUDE-STYLE.md`. C'est la pub CleanMyMac de MacPaw, décortiquée plan par plan pour en tirer une façon de faire les vidéos Rago.
- **La pub** : 69,9 s, 12 « mondes » qui se suivent (un nouveau monde toutes les 6 s environ), son très compressé (−16,9 LUFS), musique à 136 BPM, voix féminine.
- **Ce qui est repris pour Rago** :
  - la [[Charte graphique]] actuelle (rouge `#FF3B30`, police Geist) ;
  - des mondes qui se distinguent par la lumière ;
  - un cadre de fenêtre Windows et le bouton « Apply » de l'app ;
  - des images en 3D (Three.js), une voix de synthèse (Kokoro) et une musique générée.

## Épisode 001 « Rago tour » (19/10)
Dossier `episodes/`.
- **Texte** (`001-rago-tour.txt`) : titre « Rago Optimizer: every millisecond counts ». La description annonce « nearly 200 Windows tweaks » et finit par « Free to start: https://rago-optimizer.com ».
- **Contenu** (`source/episodes/001-rago-tour.json`) : 13 scènes (bureau, tunnel, logo, hub, réseau, latence, carte graphique, Windows, Minecraft, Restore, interface, fin).
- **Trois versions**, toutes en 1920×1080, 30 images par seconde, 65,5 s :

| Fichier | Taille | Heure (19/10) | Ce qui change |
|---|---|---|---|
| `001-rago-tour-v1.mp4` | 148 Mo | 00:42 | première version |
| `001-rago-tour-v2.mp4` | 243 Mo | 14:24 | image plus lumineuse |
| `001-rago-tour.mp4` | 81 Mo | 16:45 | version 3 : image nette partout, sans halo (profondeur de champ coupée, bloom 0,28, seuil 0,93) |

- **À côté** : deux planches contact et deux miniatures. La miniature montre un R rouge en 3D dans des anneaux, le titre « Rago Optimizer » et le sous-titre « Nearly two hundred Windows tweaks ».
- **Écart à connaître** : « nearly 200 Windows tweaks » était vrai le 19/10. Le nombre actuel de réglages est dans [[Catalogue des tweaks]] et [[Offres et prix]] ; il faut le vérifier avant de réutiliser ce texte.

## Comment l'épisode est fabriqué
Dossier `source/` (mode d'emploi dans `source/README.md`). Tout est produit par des scripts, sans montage à la main :
1. `tts.py` : la voix, avec Kokoro (voix `af_heart`). Une table `PRONOUNCE` fait dire « Rahgo » pour que le nom soit bien prononcé.
2. `timeline.mjs` : place les scènes sur une grille à 120 BPM.
3. `music.py` : génère la musique.
4. `mix.py` : mélange voix et musique à −14 LUFS.
5. `render.mjs` : dessine chaque image dans un navigateur (Playwright, rendu SwiftShader), 2 à 5 s par image.
6. `ffmpeg` : assemble la vidéo.
- **Vérification** : `check.sh`, puis une transcription par Whisper (sherpa-onnx) pour contrôler ce que dit la voix.
- **Code des scènes** dans `src/` : `film.js`, `lib.js`, `s_desk`, `s_intro`, `s_hub`, `s_worlds`, `s_ui`.
- Le README fixe aussi les règles de la série.

## Film de lancement en 4K (19/10)
Dossier `launch-4k/`.
- **Le projet** (`source/README.md`) : un film de 52 s en 4K à 60 images par seconde, soit 3 120 images, entièrement généré par le code. Six parties :
  - intro (0 à 10 s) ;
  - nettoyage (10 à 18 s) ;
  - cœur (18 à 26,5 s) ;
  - interface (26,5 à 35 s) ;
  - jeu (35 à 48 s) ;
  - fin (48 à 52 s).
- **Rendu** : flou de mouvement, bokeh, bloom et étalonnage ACES, avec les couleurs `#0A0A0B`, `#111113`, `#1F1F23`, `#FF3B30`, `#3DDC97`, `#FFD60A` et `#5AB8FF`.
- **Ce qui existe vraiment** :
  - une **preuve** `rago-launch-preuve-720p30.mp4` : 1280×720, 30 images par seconde, 52 s, **sans son**, 71,5 Mo ;
  - une planche contact ;
  - 7 images 4K dans `images-4k/`.
  - Le film complet en 4K et 60 images par seconde n'est **pas** dans le dossier.
- Ce film est fait par le code, sans plans Kling. Ce n'est donc pas le trailer de la 1.2 (v1 à v4, plans Kling), qui n'est jamais sorti ([[Décisions]], 10/11).

## Script « What's new » de la 1.2 (29/10)
Écrit dans un doc Claude, il n'est pas dans le dossier partagé.
- **Durée** : environ 9 min.
- **Début** : une intro de 30 s, sans présentation de la marque.
- **Suite** : seulement les nouveautés de la [[Version 1.2.0]], avec des tests en jeu des 6 profils du [[Packet Optimizer]] et des Config 1 à 4, et de la place pour le ressenti de Sofiene.

## Ce que les essais sur Instagram ont appris
Fait utile tiré de la série « Milli », arrêtée le 01/11 ([[Décisions]]). Chiffres des statistiques Instagram, relevés par Claude du 17/10 au 21/10 :
- **Vues** : 196 pour la première vidéo, 546 en 44 h pour la meilleure, 272 en 25 h pour une autre.
- **Public** : 99,5 % des spectateurs n'étaient pas abonnés au compte, et 49 % avaient de 18 à 24 ans.
- **Ce qui a été observé** :
  - l'accroche marchait : 39 % partaient avant 3 s, ce qu'Instagram jugeait « plus bas que d'habitude » ;
  - les pertes venaient de l'explication, entre 3 et 11 s ;
  - l'**écran de fin avec la marque** faisait partir 3 spectateurs sur 4 parmi ceux qui restaient ;
  - aucune vidéo n'a été envoyée à un ami.
- **Ce qu'en dit Instagram (Adam Mosseri, 2025-2026)** : le temps de visionnage compte le plus ; pour toucher des non-abonnés, les envois à des amis comptent plus que les « j'aime ».

Voir aussi [[Discord]] (annonces), [[Voix et ton]].
