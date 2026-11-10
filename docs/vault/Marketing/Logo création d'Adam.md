---
type: marketing
tags: [marketing, logo, vidéo]
source: /mnt/project-files/marketing/logo-creation-adam/
maj: 2026-11-10
---
# Logo création d'Adam

Une courte vidéo du logo de Rago, faite le **02/11/2026**. Elle reprend la fresque de Michel-Ange, « La Création d'Adam ». Le dossier est `marketing/logo-creation-adam/` ([[Sources]]). Retour à [[Marketing]].

**Statut** : les fichiers sont **CONFIRMÉS** (vus dans le dossier partagé et mesurés avec `ffprobe` le 10/11). **À VÉRIFIER** : ce que la vidéo devait servir (logo animé, intro de vidéo, publication), et si elle a été utilisée. Elle n'apparaît ni dans [[Décisions]] ni dans le [[Journal]], donc rien ne dit qu'elle est abandonnée.

## Ce qu'on voit
Le R de Rago, en 3D, rouge et lumineux, tourne entre la main d'Adam et celle de Dieu. Un halo rouge l'entoure (image `apercu.png`).

## Les fichiers
- **`rago-creation-adam-4k.mp4`** : la vidéo.
  - image : 3840×2160, 30 images par seconde, 10 s ;
  - son : une piste audio (AAC) ;
  - taille : 4 Mo.
- **`apercu.png`** : une image fixe de la vidéo.
- **`source/`** : de quoi la refaire.
  - `index.html` : dessine le R en 3D avec Three.js. Le R a de l'épaisseur (profondeur 24, bords chanfreinés), sa face est rouge `#FF3B30` et ses côtés `#C9221A`, les couleurs de la [[Charte graphique]]. La fonction `renderAt(deg)` dessine le R tourné d'un angle donné, en image de 1400 px.
  - `rec.mjs` : ouvre cette page dans un navigateur (Playwright, rendu SwiftShader, petit serveur local sur le port 8765) et enregistre une image par angle.
  - `cut.py` : détoure les deux mains de la fresque avec `rembg` (modèle `birefnet-general`). Les résultats sont `adam_birefnet-general.png` et `god_birefnet-general.png`.
  - `comp.py` : assemble les 300 images de la vidéo en 3840×2160 (numpy, PIL, scipy) :
    - le R fait sa rotation en 150 images, deux fois de suite ;
    - les mains s'éclaircissent en fondu et le R reçoit un halo rouge.

## Liens
Même façon de faire (Three.js et Playwright) que les [[Vidéos YouTube]].
