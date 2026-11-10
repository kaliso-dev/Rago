---
type: code
tags: [code, serveur, javascript, stripe]
fichier: licensing/src/promo.js
lignes: 174
maj: 2026-11-10
---
# promo.js

Le pop-up de réduction du site : ses textes sont un réglage en base, la réduction elle-même est un code promo Stripe dont le pourcentage et le nombre d'utilisations viennent de Stripe. Le pop-up se cache tout seul quand le code est épuisé. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Promotions et affiliation]], [[Site]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Le site lit le pop-up à chaque visite par `GET /api/v1/promo` ([[app.js]], cache serveur 30 s, cache HTTP 30 s, CORS ouvert). On le règle sur `/admin/site` ([[admin.js (serveur)]], [[admin-views.js]]) ou avec `npm run admin -- popup` ([[admin.js (script serveur)]]). Les messages d'erreur sont en français : seul Sofiene les lit.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `POPUP_DEFAULTS` | `{enabled: true, code: 'RAGO15', eyebrow: 'Welcome offer', title: 'Get {percent}% off now!', text: 'Use this code on your first Premium payment, monthly or yearly.'}`. |
| `PopupError` | Erreur de saisie (message en français affiché tel quel). |
| `stripeMode` | Réexporté depuis [[billing.js]]. |
| `getPopup(db)` | Réglages enregistrés, complétés par les valeurs par défaut. |
| `findStripeCode(stripe, code)` | Le code promo dans Stripe (l'actif s'il y en a plusieurs) : `{id, code, active, percent, duration, total, used, left, full, expired, firstTime}`. |
| `popupState(db, stripe, cfg)` | `{settings, promo, error, mode, shown, reason}` ; ne lève jamais pour une erreur Stripe. |
| `publicPopup(state)` | Ce que reçoit le site : `{code, percent, eyebrow, title, text, total, left}` ou `null` (caché). |
| `fillPopupText(text, {percent, code, total, left})` | Remplace `{percent}`, `{code}`, `{total}`, `{left}` (aperçu de l'admin ; le site fait pareil). |
| `savePopup(db, stripe, input)` | Enregistre ; crée le code dans Stripe s'il n'existe pas. Renvoie `{settings, promo, created}`. |

## Fonctionnement détaillé

**Pourquoi le pop-up est caché** (`hiddenReason`, dans l'ordre) : désactivé (« Tu l'as désactivée. ») ; pas de clé Stripe ; Stripe n'a pas répondu ; code inexistant dans ce mode ; toutes les utilisations prises ; code expiré ; code désactivé ; coupon qui n'est pas un pourcentage.

**`savePopup`** (seules les clés présentes dans `input` changent) :
1. textes : caractères de contrôle remplacés par des espaces, espaces doubles réduits ; vide → erreur ; limites **40** (petit titre), **80** (titre), **280** (texte) ;
2. code : majuscules, `^[A-Z0-9-]{2,40}$` ;
3. `percent` (accepte « 50 », « 50 % », « 50,0 ») de 1 à 99 ; `limit` (nombre de clients) entier de 1 à **100 000**, vide = sans limite ;
4. si le pop-up est activé : Stripe obligatoire ; code absent → il faut un pourcentage **entier** ; création du coupon `rago-promo-<pct>-once` (réduction sur le **premier** paiement) et du code promo avec `max_redemptions` = limite, `restrictions.first_time_transaction: true`, `metadata.rago: 'popup'` ;
5. code existant : Stripe ne permet pas de changer son pourcentage ni sa limite → erreur qui demande un **nouveau** code ; code désactivé (et pas épuisé) → erreur ;
6. désactiver le pop-up marche même sans Stripe ;
7. enregistrement JSON dans `site_settings` (`name = 'popup'`).

## Données touchées

[[Table site_settings]] (ligne `popup`) ; Stripe (coupons, codes promo).

## Liens avec le reste

Appelé par [[app.js]] (`GET /api/v1/promo`, vidage du cache via `onPopupChange`), [[admin.js (serveur)]] (`POST /admin/popup`), [[admin.js (script serveur)]] (`popup`). Coupons : [[billing.js]]. Fiche : [[Promotions et affiliation]], [[Ventes Stripe]].

## Tests

« site pop-up: set from /admin with ADMIN_KEY, code created in Stripe for the first 15 customers, hidden once used up » et « site discount code: /buy?promo=RAGO15… » dans `flow.test.js` ([[Tests du serveur]]).

## À savoir avant de modifier

- Le site doit remplacer les mêmes jetons `{percent}`, `{code}`, `{total}`, `{left}` (code du site, domaine [[Site]]).
- Ne pas mettre de logique de réduction ici : Stripe reste la seule source du pourcentage et des utilisations.
