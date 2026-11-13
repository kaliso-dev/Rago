---
type: code
tags: [code, serveur, javascript, html]
fichier: licensing/src/views.js
lignes: 904
maj: 2026-11-14
---
# views.js

Les pages HTML du site de compte (`/signup`, `/login`, `/account`, `/account/profile`, `/account/review`, `/affiliate`…), rendues côté serveur sans framework. Textes en anglais ([[Voix et ton]]), apparence de la charte v1.1 ([[Styles du serveur (CSS)]]). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Seul [[app.js]] l'appelle (`V.<page>(cfg, {...})`). Les pages chargent `/assets/tokens.css`, `/assets/account.css` et `/assets/account.js` ([[account.js]]) : aucun style ni script en ligne, à cause de la CSP stricte de [[app.js]]. L'admin a ses propres vues ([[admin-views.js]]).

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `html` (gabarit) / `raw(s)` | Gabarit qui **échappe tout** (`& < > " '`) ; `raw` marque un HTML de confiance. Les tableaux sont joints. |
| `ICON` | Icônes SVG (check, carte, flèche, utilisateurs…). |
| `avatar(user, size)` | Photo de profil ou initiale. |
| `supportLink(cfg, label)` | Lien « Contact support on Discord » (`SUPPORT_URL`, sinon la FAQ du site). |
| `page({title, body, user, cfg, bodyClass, nav, cta, buy, lang})` | Gabarit commun : `noindex`, favicons, police Geist préchargée, bandeau « Test server » sur staging (carte de test 4242), en-tête (Pricing / Get Premium pour les visiteurs et comptes gratuits, onglets Account / Profile / Affiliate et bouton Sign out pour un connecté), pied « © Rago Optimizer, by KALISO and RAGO » avec Terms et Privacy du [[Site]]. |
| `field`, `alertBox` | Champ de formulaire, encadré d'erreur ou d'information. |
| `signInProviders(cfg)` | Google si ses 2 clés sont réglées ; Discord si `DISCORD_LOGIN` et ses clés ([[Connexion Google et Discord]]). |
| `signupPage`, `verifyPage`, `loginPage`, `forgotPage`, `resetPage`, `passwordPage` | Pages d'accès, avec boutons « Continue with Google/Discord » et le champ code de parrainage. |
| `appLinkPage` | « Sign in to the app? » avec le code à 4 caractères à comparer avec l'app, et « Use another account ». |
| `messagePage` | Page de message (erreurs, liens expirés, 404), avec Back / Ask on Discord. |
| `dashboardPage` | Page `/account` (avec le bloc « Rago Route » : option en cours, son prix au mois ou à l'année et « Manage or cancel » ; sinon « Add Rago Route · $17.99/year » et « $3/month », ou le mensuel seul sans prix annuel, 14/11). |
| `profilePage`, `reviewPage` | Profil public et avis. |
| `affiliatePage` | Programme d'affiliation. |

## Fonctionnement détaillé

**Étapes d'achat** (`STEPS`) : Pay → Your account → Download → Activate, affichées tant que la licence est une licence Stripe active (étape 2 sans PC, 4 avec).

**`dashboardPage`** : état de la licence (active, en résiliation, terminée `subscription_ended`, révoquée), offre (`PLAN` : Monthly, Yearly, Lifetime, Affiliate reward), clé masquée, PC lié et bouton de libération (avec la prochaine date possible), téléchargement avec la version `INSTALLER_VERSION` et le mode d'emploi SmartScreen, bouton du portail Stripe, offre Lifetime, essai en cours, avis, résumé d'affiliation (anneau), et :
- **bloc Discord** : sans bot → « open a ticket » avec l'e-mail du compte ; sans liaison → bouton de liaison ; lié → badge « Role given », « Not on the server » ou « Pending » avec « Sync it » / « Try again » / « Unlink » ([[discord.js]]) ;
- **récompenses Discord** (VIP, MVP, boosts) montrées à tous les comptes, Premium ou pas ;
- texte « Premium unlocks all `PREMIUM_TWEAKS` tweaks… The free version opens `FREE_TWEAKS`. » (voir À savoir).

**`profilePage`** : nom public, photo (dépôt, aperçu), avis ; mode bienvenue après l'inscription (`welcome`, `to`). **`reviewPage`** : étoiles en boutons radio, mots `RATING_WORDS` (Not for me → Excellent), compteur de caractères (`COMMENT_MAX` de [[reviews.js]]).

**`affiliatePage`** : règles (`RULES`) construites avec la config (délai `AFFILIATE_HOLD_DAYS`, réduction, nombre de places, objectif, mois offerts) ; liste des filleuls avec un badge (`VOID` : Subscription ended, Refunded, Chargeback, Same PC as yours, Same payer as you, License revoked, Test purchase ; sinon Counted, Not activated yet, Counts on <date>, Checking). Voir [[Promotions et affiliation]].

Dates affichées en anglais américain, fuseau UTC.

## Données touchées

Aucune : reçoit des objets déjà lus par [[app.js]].

## Liens avec le reste

Appelé par [[app.js]] ; styles dans `account.css` ; comportements dans [[account.js]] ; textes suivant `brand/voice-en.md` ([[Voix et ton]]).

## Tests

Pas de test propre : les pages sont contrôlées à travers `flow.test.js` (textes et liens attendus dans le HTML) ([[Tests du serveur]]).

## À savoir avant de modifier

- Tout passe par `html` : n'utiliser `raw` que pour du HTML construit par le serveur, jamais pour une saisie.
- Pas d'attribut `style=` ni de `<script>` en ligne : la CSP les bloque.
- `FREE_TWEAKS` vaut 11 par défaut dans [[config.js]] alors que la version gratuite compte 73 réglages depuis le 04/11 : À VÉRIFIER (valeur réglée sur Railway).
- Le bloc Discord sans bot demande d'ouvrir un ticket ; l'e-mail d'achat ([[mailer.js]]) le dit aussi même avec le bot : À VÉRIFIER.
