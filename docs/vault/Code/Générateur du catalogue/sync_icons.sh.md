---
type: code
tags: [code, app, outil, shell, marque]
fichier: app/tools/sync_icons.sh
lignes: 21
maj: 2026-11-10
---
# sync_icons.sh

Copie les icônes et les images d'installeur de la charte graphique (`brand/logo`) dans l'app. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Charte graphique]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `6c2bcad`), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Commande : `sh tools/sync_icons.sh [dossier brand/logo]` depuis `app/`. Pas de script `npm` ; aucune CI ne le lance. À relancer à la main quand le logo change.
- Source, dans l'ordre : l'argument s'il est donné ; sinon `brand/logo` à la racine du dépôt (`app/tools/../../brand/logo`, présent au 10/11) ; sinon `/mnt/project-files/brand/logo` (dossier partagé du projet, hors dépôt). Le script s'arrête (code 1) si `rago.ico` n'y est pas : `brand/logo introuvable (…) : sh tools/sync_icons.sh <dossier brand/logo>`.

## Fonctionnement détaillé
`set -e`, puis 8 copies :
| Source (`brand/logo/…`) | Destination (`app/…`) |
|---|---|
| `png/rago-icon-32.png` | `src-tauri/icons/32x32.png` |
| `png/rago-icon-128.png` | `src-tauri/icons/128x128.png` |
| `png/rago-icon-256.png` | `src-tauri/icons/128x128@2x.png` |
| `png/rago-icon-512.png` | `src-tauri/icons/icon.png` |
| `rago.ico` | `src-tauri/icons/icon.ico` |
| `installer/sidebar.bmp` | `src-tauri/installer/sidebar.bmp` (image latérale de l'installeur NSIS) |
| `installer/header.bmp` | `src-tauri/installer/header.bmp` (bandeau de l'installeur) |
| `rago-favicon.svg` | `public/favicon.svg`, sans son bloc `<metadata>…</metadata>` (retiré par `sed`) |
Affiche `icônes copiées depuis <dossier>`.

## Données touchées
Écrit les 8 fichiers ci-dessus dans `app/`. Rien d'autre.

## Liens avec le reste
- Fichiers de marque : [[Charte graphique]] (dossier `brand/`).
- Les icônes servent à l'exe et à l'installeur fabriqués par la CI ([[CI GitHub Actions]], [[Publier une version]]).
- Rangé dans `app/tools/` avec le générateur, voir [[Code du générateur de catalogue]].

## À savoir avant de modifier
- Les noms de destination sont ceux que cite `app/src-tauri/tauri.conf.json` : `bundle.icon` (`icons/32x32.png`, `icons/128x128.png`, `icons/128x128@2x.png`, `icons/icon.ico`) et `bundle.windows.nsis` (`installerIcon` = `icons/icon.ico`, `headerImage` = `installer/header.bmp`, `sidebarImage` = `installer/sidebar.bmp`). Ne pas les changer sans changer la configuration. `icons/icon.png` est copié mais n'est cité ni dans `tauri.conf.json` ni dans le code Rust (OBSERVÉ par recherche, le 10/11).
- L'installeur lit aussi `src-tauri/installer/eula.txt` (`licenseFile`) et `hooks.nsh` (`installerHooks`), que ce script ne touche pas.
