---
type: code
tags: [code, app, typescript, compte]
fichier: app/src/lib/accountApi.ts
lignes: 262
maj: 2026-11-10
---
# accountApi.ts

Le pont vers le **compte Rago** dans l'app : nom public, photo de profil, avis, abonnement et prix des offres. Même modèle que [[api.ts]] : de vraies commandes Tauri dans l'app, un simulateur dans le navigateur. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Abonnement dans l'app]], [[Partage et support]]. Côté Rust : [[account.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Séparé de [[api.ts]] parce que le compte (profil, avis, abonnement) parle au serveur de comptes, pas au moteur des tweaks. Le front n'appelle jamais le serveur lui-même : [[account.rs]] fait les requêtes HTTP vers l'API du [[Serveur de licences]] (voir [[API du serveur]]).
- Utilisé par [[account.tsx]] (profil, avis, invitation), [[SubscriptionCard.tsx]] (abonnement) et [[Upsell.tsx]] (prix des offres).

## Ce que le fichier expose

### Types
- `Profile { email, name, photo }` : `photo` est une `data:` URL prête à afficher, `null` sans photo.
- `MyReview { rating, comment, updatedAt, hidden }` : `hidden` = masqué du site par l'équipe.
- `AccountState { via, profile, review }` : `via` vaut `"license"` (connecté par le jeton de licence du PC, Premium), `"account"` (connecté au compte seul, gratuit) ou `null`.
- `AccountError { code, message }` et `asAccountError(err)` (code par défaut `server_error`).
- `Price { amount, currency }` : montant en centimes, comme Stripe.
- `Subscription { interval: "month" | "year", trial, canceled, renewsAt, endsAt, price }`.
- `Plans { month, year, lifetime, trialDays }` : prix des trois offres (`null` = pas en vente ou serveur injoignable).

### Constantes et fonctions
- `COMMENT_MAX = 600` caractères d'avis ; `NAME_MAX = 32` caractères de nom public.
- `formatPrice(price, lang)` : `Intl.NumberFormat` en `fr-FR` ou `en-US`, style monnaie ; repli `"5.99 USD"` si la monnaie est inconnue.
- `accountApi: AccountApi` = `tauriAccount` dans l'app, `mockAccount` ailleurs (test `isTauri` de [[api.ts]]).

### Fonctions de `accountApi` → commande Tauri
| Fonction | Commande | Remarque |
|---|---|---|
| `me()` | `account_me` | état du compte |
| `login(email, password)` | `account_login` | connexion au compte seul (joueur gratuit) |
| `signOut()` | `account_sign_out` | |
| `saveReview(rating, comment, name)` | `account_save_review` | crée ou remplace l'avis ; `name` peut fixer le nom public en même temps |
| `deleteReview()` | `account_delete_review` | l'avis disparaît du site ; nom et photo restent |
| `setName(name)` | `account_set_name` | |
| `setPhoto(base64)` | `account_set_photo { data }` | image déjà réduite par [[account.tsx]] ; le serveur la recadre en 256 × 256 WebP |
| `removePhoto()` | `account_remove_photo` | |
| `subscription()` | `account_subscription { action: null }` | `null` : pas d'abonnement (gratuit, Lifetime, offert) |
| `cancelSubscription()` | `account_subscription { action: "cancel" }` | plus de renouvellement ; Premium reste jusqu'à la fin de la période ou de l'essai |
| `resumeSubscription()` | `account_subscription { action: "resume" }` | |
| `plans()` | `plans_info` | prix des offres pour la fenêtre Premium |

Les réponses d'abonnement et d'offres arrivent du serveur en `snake_case` (`renews_at`, `ends_at`, `trial_days`) ; `toSub` et `toPlans` les convertissent (`interval` autre que `year` devient `month`).

## Fonctionnement détaillé : le simulateur
- État gardé dans `localStorage` `rago.demoAccount` : `{ email, name, photo, review }`.
- Si la démo est Premium (`rago.demoLicense` posé par [[api.ts]]), le compte est connecté `via: "license"` avec cette adresse ; sinon `via: "account"` si une connexion au compte a eu lieu.
- **Mêmes règles que le serveur** (`licensing/src/profile.js`, voir [[Serveur de licences]]) pour que la démo réagisse pareil :
  - nom public : normalisé (`NFC`, espaces réduits), 2 à 32 caractères, commence par une lettre ou un chiffre, seulement lettres, chiffres, espaces et `_ . ' -`, ni `http`, ni `www.`, ni domaine `.com/.net/.org/.gg/.io/.fr` → sinon `invalid_name` ;
  - note entière de 1 à 5 → sinon `invalid_rating` ; commentaire nettoyé (retours à la ligne normalisés, 3 sauts ou plus ramenés à 2), vide → `empty_comment`, plus de 600 caractères → `comment_too_long` ; pas de nom public → `name_required` ;
  - photo de plus de 5 Mo (en base64, ≈ 6,7 millions de caractères) → `image_too_large` ;
  - toute action sans être connecté → `invalid_token`.
- Connexion : sans `@` ou mot de passe de moins de 4 caractères → `invalid_credentials`.
- Abonnement de démo : annuel, en essai, fin dans 3 jours, 29,99 USD ; `cancel` et `resume` basculent un drapeau en mémoire.
- Prix de démo : mensuel 5,99 USD, annuel 29,99 USD, Lifetime 59,99 USD, essai de 3 jours. Ce sont des valeurs de démonstration : les vrais prix viennent de Stripe par `plans_info` (voir [[Offres et prix]], [[Paiements Stripe]]).

## Erreurs et cas limites
- Les erreurs du serveur sont `{ code, message }` ; [[accountText.ts]] choisit le texte (message anglais du serveur en anglais, texte traduit en français).
- `plans()` peut renvoyer des offres `null` : [[Upsell.tsx]] affiche alors l'offre sans prix.

## À savoir avant de modifier
- Une règle de validation changée sur le serveur doit l'être aussi dans `demoName` et `saveReview` du simulateur, sinon la démo ment.
- Ajouter une commande : même procédure que dans [[api.ts]] (Rust, interface `AccountApi`, `tauriAccount`, `mockAccount`).
