---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/profile.js
lignes: 199
maj: 2026-11-10
---
# profile.js

Profil public d'un compte : le nom affiché avec l'avis et la photo de profil (vérifiée, recadrée en 256 × 256 WebP sans métadonnées, stockée dans un bucket privé Supabase et servie par `/avatars/<fichier>`). Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Partage et support]], [[Paramètres de l'app]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 09/10/2026 avec les avis (app 1.1.8). La photo se change depuis l'app (`PUT /api/v1/account/avatar`, octets bruts) ou depuis l'onglet Profile du site (formulaire `POST /account/profile/photo`), voir [[app.js]]. La base ne garde que le **nom du fichier** (`users.avatar_key`). [[reviews.js]] réutilise `ProfileError` et `avatarUrl`.

## Ce que le fichier expose

| Nom | Valeur ou rôle |
|---|---|
| `AVATAR_MAX_UPLOAD` | 5 Mo (avant réencodage). |
| `AVATAR_SIZE` | 256 px. |
| `AVATAR_FILE` | `^[A-Za-z0-9_-]{20,40}\.webp$` : seuls ces noms sont servis par `/avatars/:file`. |
| `ProfileError(code, message)` | Codes `invalid_name`, `invalid_image`, `image_too_large` (et `invalid_rating`, `empty_comment`, `comment_too_long` via [[reviews.js]]). |
| `NAME_MIN` / `NAME_MAX` | 2 / 32. |
| `cleanName(raw)` | Nom nettoyé ou `ProfileError('invalid_name')`. |
| `setName(db, userId, name)` | Écrit `users.display_name`. |
| `processAvatar(input)` | Vérifie et réencode l'image ; renvoie le WebP. |
| `newAvatarFile()` | 18 octets aléatoires en base64url + `.webp` (24 caractères + extension). |
| `avatarUrl(cfg, key)` | `<PUBLIC_URL>/avatars/<key>` ou `null`. |
| `createAvatarStore(cfg, {fetchImpl, log})` | Stockage `supabase` ou `memory` avec `put`, `get`, `remove`. |
| `replaceAvatar(db, store, userId, upload)` | Enregistre la nouvelle photo puis supprime l'ancienne. |
| `removeAvatar(db, store, userId)` | Retire la photo. |
| `profileOf(cfg, user)` | `{email, name, avatar_url}` pour l'app et les pages. |

## Fonctionnement détaillé

**Nom public** : NFC, espaces multiples réduits ; 2 à 32 caractères ; doit commencer par une lettre ou un chiffre puis lettres, chiffres, accents combinés, espace, `_ . ' -` ; refusé s'il contient `http`, `www.` ou une fin en `.com`, `.net`, `.org`, `.gg`, `.io`, `.fr` (pas d'e-mail ni de lien). Messages : « Use 2 to 32 characters for your public name. » / « Use letters, numbers, spaces and _ . ' - for your public name. No email or link. »

**Photo (`processAvatar`)** :
1. vide → « Choose a picture first. » ; plus de 5 Mo → `image_too_large` ;
2. format reconnu **par les premiers octets** (JPEG `FF D8 FF`, PNG, `RIFF…WEBP`, `GIF87a`/`GIF89a`), jamais par le nom ou le type déclaré ;
3. `sharp` est chargé au **premier** envoi seulement : si la bibliothèque ne charge pas sur le serveur, seuls les envois de photo échouent ;
4. `limitInputPixels` = 40 000 000 (une petite image qui se décompresse en image géante est refusée : « under 40 megapixels ») ; le format lu par sharp doit correspondre au format reconnu ;
5. `rotate()` (orientation EXIF appliquée), recadrage centré 256 × 256 (`cover`), WebP qualité 80, effort 4 ; aucune métadonnée gardée (pas d'EXIF ni de position GPS). Résultat en général sous 20 Ko.

**Stockage Supabase** :
- bucket `AVATAR_BUCKET` (défaut `avatars`), **privé**, créé au premier envoi s'il manque (« bucket not found ») avec `file_size_limit` 1 Mo et seulement `image/webp` ;
- envoi `POST /storage/v1/object/<bucket>/<fichier>` avec `x-upsert: true` et `Cache-Control: max-age=31536000` ;
- lecture `GET /storage/v1/object/authenticated/<bucket>/<fichier>` ; 404/400 → `null` ;
- cache mémoire des **400** photos les plus récentes (le plus ancien sort) ;
- suppression : un échec est seulement journalisé (`[avatars] old photo … not deleted`).
Sans Supabase : stockage en mémoire (perdu au redémarrage, avertissement en prod dans [[config.js]]).

**Remplacement** : la base pointe vers la nouvelle photo (transaction avec `FOR UPDATE`, `avatar_updated_at`) **avant** la suppression de l'ancienne : un profil n'affiche jamais une image manquante. Une nouvelle photo a un nouveau nom, donc une nouvelle adresse : le cache d'un an côté navigateur ne pose pas de problème.

## Données touchées

[[Table users]] (`display_name`, `avatar_key`, `avatar_updated_at`) ; Supabase Storage (bucket `avatars`).

## Liens avec le reste

Appelé par [[app.js]] (API du compte, pages Profile, `GET /avatars/:file`), [[reviews.js]], [[support.js]] (suppression RGPD), [[admin.js (serveur)]] (actions `photo`, `nom`), [[admin.js (script serveur)]] (`remove-photo`, `set-name`). Stockage : [[Supabase]].

## Tests

`flow.test.js` : « profile photo from the app: checked, cropped to 256 x 256 WebP without metadata, old one deleted, served to the site », « profile photo on the site… », « profile photos in Supabase Storage: private bucket created on the first upload, old photo deleted » ([[Tests du serveur]]).

## À savoir avant de modifier

- `sharp` est une dépendance native (binaire) : vérifier qu'elle s'installe dans l'image Docker `node:22-alpine` ([[Documentation et configuration du serveur]]).
- Supprimer un compte efface la photo seulement si Supabase est configuré ([[support.js]]).
