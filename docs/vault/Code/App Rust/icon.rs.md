---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/icon.rs
lignes: 189
maj: 2026-11-10
---
# icon.rs

Icône d'un programme Windows en **PNG**, encodée sans bibliothèque d'image : sert aux logos des launchers et des jeux de la bibliothèque. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Bibliothèque de jeux]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 21/10.

## Rôle et place dans l'ensemble
Appelé seulement par [[games.rs]] (`exe_png(&exe, 128)`, deux fois) pour les commandes `launcher_icon` et `preset_icons` de [[lib.rs]] ; le résultat part à l'interface en `data:` URL et est gardé dans `art\`. L'interface n'a pas de réseau ni d'accès disque : c'est la seule façon de lui montrer l'icône d'un exe.

## Ce que le fichier expose
| Fonction | Description |
|---|---|
| `png(width, height, rgba) -> Vec<u8>` | PNG RGBA 8 bits (type de couleur 6), **non compressé** : chaque ligne précédée du filtre 0, flux zlib `78 01` en blocs deflate « stored » de 65 535 octets au plus, Adler-32 ; blocs `IHDR`, `IDAT`, `IEND` avec CRC-32 (polynôme `0xEDB88320`). Quelques dizaines de Ko pour une icône de 128 px |
| `exe_png(path, size) -> Option<Vec<u8>>` | icône de l'exe en PNG carré de `size` pixels ; `None` si l'exe n'en a pas. Hors Windows : toujours `None` |

## Fonctionnement détaillé (`exe_png`)
1. `PrivateExtractIconsW(chemin, 0, size, size, …, 1)` : la première icône, à la taille demandée.
2. `GetIconInfo` → bitmap couleur et masque ; `GetObjectW` → dimensions, refusées hors de 1 à 512 px.
3. `GetDIBits` en 32 bits, de haut en bas (`biHeight` négatif).
4. Icône ancienne **sans canal alpha** (tous les alpha à 0) : la transparence vient du masque (noir = opaque).
5. BGRA → RGBA, puis `png`.
6. Libère toujours `hbmColor`, `hbmMask` et l'icône (`DeleteObject`, `DestroyIcon`).

## Tests
`checksums_match_the_references` (CRC-32 et Adler-32), `writes_a_valid_png`.

## À savoir avant de modifier
- Pas de dépendance d'image volontairement (taille de l'exe, voir le profil release de [[Cargo.toml]]) : la compression n'est pas utile pour des icônes de 128 px envoyées en local.
- Les images officielles des jeux (jaquettes) ne passent pas par ici : elles sont téléchargées par [[games.rs]].
