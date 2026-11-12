---
type: code
tags: [code, app, rust, compte]
fichier: app/src-tauri/src/account.rs
lignes: 326
maj: 2026-11-10
---
# account.rs

Compte Rago dans l'app : nom public, photo de profil, **avis affiché sur le site**, abonnement (lire, résilier, reprendre) et prix des offres. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Abonnement dans l'app]], [[Paramètres de l'app]] (carte du compte), [[Licence dans l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 09/10. Contrat : `licensing/docs/API.md`, partie « Avis et photo de profil » ([[API du serveur]]).

## Rôle et place dans l'ensemble
- Appelé par les commandes `account_*` et `plans_info` de [[lib.rs]] (par `with_account`, dans `spawn_blocking`).
- Utilise de [[license.rs]] : `API_BASE`, `ApiError`, `vault` (DPAPI) et `License::bearer()`.
- **Deux façons d'être connecté** : avec Premium, le jeton de licence du PC suffit (`via = "license"`) ; un compte gratuit se connecte une fois par e-mail et mot de passe et garde un **jeton de compte** (`via = "account"`), chiffré par DPAPI dans `account.bin`.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct Profile {email, name, photo}` | `photo` = `data:image/webp;base64,…` prête à afficher (l'interface n'a pas de réseau) |
| `struct Review {rating, comment, updated_at, hidden}` | `rating` borné à 5 ; `hidden` : masqué du site par l'équipe ([[Tableau de bord admin]]) |
| `struct AccountState {via, profile, review}` | `via` ∈ `license`, `account`, absent (pas connecté) |
| `plans() -> Value` | GET `/plans` sans jeton : `{month, year, lifetime, trial_days}` tels que Stripe les a ([[Paiements Stripe]], [[Offres et prix]]) |
| `pub(crate) agent()` | client `ureq` : délai global **20 s**, statut HTTP lu sans erreur, TLS de Windows |
| `Account::new()` | fichier `%LOCALAPPDATA%\Rago\account.bin` |
| `me(lic)` | GET `/account/me` ; jeton refusé (`invalid_token`) → déconnecté (et `account.bin` effacé si `via = account`) |
| `login(email, mot de passe)` | POST `/account/login` → garde `account_token` |
| `sign_out()` | POST `/account/logout` avec le jeton de compte, puis l'efface ; **le jeton de licence reste** (il se retire depuis la licence) |
| `subscription(lic, action)` | `None` : GET `/account/subscription` ; `cancel` / `resume` : POST `/account/subscription/cancel|resume` ; autre → `invalid_request`. Renvoie l'objet `subscription` du serveur ou `null` |
| `save_review(lic, rating, comment, name)` | PUT `/account/review` avec `{rating, comment, name, app_version}` (un seul avis par compte, le serveur vérifie tout) |
| `delete_review(lic)` | DELETE `/account/review` (le nom et la photo restent) |
| `set_name(lic, name)` | PUT `/account/name` |
| `set_photo(lic, data)` | base64 → octets (sinon `invalid_image`), plus de **5 Mo** → `image_too_large` ; PUT `/account/avatar` en `application/octet-stream` (JPG, PNG, WebP ou GIF ; le serveur recadre en 256 × 256) |
| `remove_photo(lic)` | DELETE `/account/avatar` |

## Fonctionnement détaillé
- `bearer(lic)` : le jeton de licence d'abord (`License::bearer`, seulement si la licence est active), sinon le jeton de compte. Sans aucun des deux, les actions rendent `invalid_token`.
- `call(méthode, chemin, jeton, corps)` : URL = `API_BASE` + chemin ; sans `API_BASE` → `unconfigured`. Réseau en panne → `network` ; erreur HTTP → `error.code` du serveur, sinon `rate_limited` (429) ou `server_error`. `buy_url` toujours vide ici.
- `state(via, réponse)` lit `account.{email, name, avatar_url}` et `review`. La photo est téléchargée par `photo(url)` :
  - `photo_file` n'accepte qu'une URL `…/avatars/<20 à 40 caractères [A-Za-z0-9_-]>.webp` (pas de `..`, pas d'autre extension) ;
  - elle est **toujours** prise sur l'origine de `API_BASE` (`origin()` : `https://hôte[:port]`), quelle que soit l'adresse dans la réponse : l'app ne télécharge jamais une image d'un autre site ;
  - taille lue limitée à `MAX_PHOTO` = 1 Mo ; mise en cache en mémoire tant que le nom du fichier ne change pas.
- Un `invalid_token` sur une action faite avec le jeton de compte efface `account.bin` (session expirée).

## Données touchées
- `%LOCALAPPDATA%\Rago\account.bin` (jeton de compte, DPAPI).
- Réseau : `<API_BASE>/plans`, `/account/me`, `/account/login`, `/account/logout`, `/account/subscription[/cancel|/resume]`, `/account/review`, `/account/name`, `/account/avatar`, et `<origine>/avatars/<fichier>.webp`.

## Tests
`origin_of_api_base`, `only_server_photos` (refuse nom trop court, autre extension, `..`, espace, autre dossier), `reads_the_server_reply`.

## À savoir avant de modifier
- L'e-mail du compte est affiché dans l'app mais ne doit jamais partir ailleurs (rapport).
- Le serveur garde la logique (validation de l'avis, recadrage de la photo, Stripe) : l'app ne fait que transmettre. Voir [[Architecture du serveur]].
