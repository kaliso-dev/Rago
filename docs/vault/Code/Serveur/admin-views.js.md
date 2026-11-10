---
type: code
tags: [code, serveur, javascript, admin, html]
fichier: licensing/src/admin-views.js
lignes: 914
maj: 2026-11-10
---
# admin-views.js

Les pages HTML du tableau de bord `/admin`, en français : menu latéral, cartes, chiffres clés, tableaux, graphiques en HTML/SVG. Les données viennent de [[admin.js (serveur)]]. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Tableau de bord admin]].

(code de `staging` @ `9f65eac`, PR #83 comprise, 10/11 ; l'entrée « Cerveau » du menu : PR #85 du Cerveau, pas encore fusionnée)

## Rôle et place dans l'ensemble

Refait le 10/11/2026 (PR #82) « comme un produit ». Réutilise le gabarit `html`/`raw` de [[views.js]] (échappement automatique) et `parisDay` de [[sales.js]]. Charge `tokens.css`, `admin.css?v=<ASSETS>` et `admin.js?v=<ASSETS>` ([[Styles du serveur (CSS)]], [[admin.js (page admin)]]). Aucun style ni script en ligne (CSP stricte d'[[app.js]]) : la hauteur des barres passe par des classes `h-0` à `h-100`.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `DAY`, `day(ms)`, `when(ms)` | Dates au format français, fuseau `Europe/Paris`. |
| `money(cents, cur)`, `moneyMap(map, main)` | Montants (« 12,34 $US + 5,00 € », devise principale d'abord). |
| `PLAN` | `month` Mensuel, `year` Annuel, `lifetime` À vie, `reward` Offert. |
| `REASON` | Raisons de révocation : remboursée, litige bancaire, à la main, abonnement terminé, remplacée par un autre achat, compte banni, compte supprimé, fraude à l'affiliation, achat de test. |
| `SORT_LABEL`, `SALE_FILTERS` | Tris de la liste des joueurs ; filtres des ventes (`tous`, `payes`, `rembourses`, `echoues`, `litiges`). |
| `loginPage`, `notFoundPage` | Connexion par clé, page introuvable. |
| `overviewPage`, `usersPage`, `userPage`, `purchasesPage`, `salesPage`, `servicesPage`, `journalPage`, `sitePage`, `networkPage` | Les pages. |
| `popupLeftLine(total, left)` | « Limited to the first N players · M left » (aperçu du pop-up). |
| `raw` | Réexporté de [[views.js]]. |

`ASSETS = '20261110c'` (depuis la PR #83) : à changer quand `admin.css` ou `public/admin.js` changent (les navigateurs gardent sinon l'ancienne version).

## Fonctionnement détaillé

**Cadre** (`doc`, `shell`) : `noindex, nofollow`, titre « … · Rago Admin », polices Geist et Geist Mono préchargées. Menu `NAV` en 4 groupes : **Pilotage** (Vue d'ensemble, Ventes), **Joueurs** (Joueurs, Offrir et achats), **Produit** (Site et promos, Tests réseau), **Système** (Services, Journal), et avec la PR #85 du Cerveau **Projet** (Cerveau, icône `I.brain`, vers `/admin/cerveau`, page à part dessinée par [[brain-views.js]]). Sur téléphone, le menu est un tiroir ouvert par une case à cocher (sans JavaScript). Hors prod, bandeau « Serveur de test … : Stripe en mode test ». Message de succès en bas (`toast`).

**Pages** :
- **Vue d'ensemble** (« Activité récente » : 30 événements dans une liste qui défile) : chiffres « Encaissé aujourd'hui » (comparé à hier à la même heure), « Ce mois-ci » (comparé au mois dernier à la même date), « Revenu mensuel récurrent », « Joueurs Premium » ; « Ventes des 30 derniers jours » ; « À traiter » (services en panne, achats non rattachés, paiements échoués, abonnements Stripe illisibles, licences de test, variables à vérifier) ; Joueurs et communauté ; Derniers paiements ; répartition Premium (abonnés, en essai, résiliés, offerts) ; Activité récente ; Services ; Derniers inscrits.
- **Joueurs** : filtres avec leur nombre, tri, pagination, pastille Premium (`premiumPill` : Banni, Gratuit · raison, « Mensuel · résilié », À vie, Offert), avatar de couleur calculée depuis l'e-mail.
- **Fiche joueur** : cartes Premium (licences, PC, liens Stripe), Gérer l'accès, Essais et PC, Discord, Affiliation, Avis et profil, Historique (liste qui défile, `scrollFill`, pour finir à la hauteur de sa voisine), Supprimer le compte (bande sur toute la largeur). Depuis la PR #83, les cartes sont rangées en grilles `g2` dont les colonnes finissent ensemble (`side-col`) : plus de trou dans la page. Messages après action (`USER_NOTICE`, par exemple « Licence révoquée : l'app repasse en gratuit à sa prochaine vérification (au plus quelques heures). »).
- **Offrir et achats** : formulaire Offrir Premium, résultats par e-mail (avec lien de réclamation), achats « Pas encore sur un compte ».
- **Ventes** : périodes (Aujourd'hui, 7 derniers jours, Ce mois-ci, Depuis le début), graphiques 30 jours et 12 mois côte à côte, Par type (avec panier moyen, remboursé, paiements ratés sur 7 jours), Reçu sur le compte Stripe, abonnements, liste filtrée.
- **Services** : En marche, À vérifier, En panne, Éteints ; carte **Paiements Stripe** sur toute la largeur (`id="stripe"`, contrôles sur deux colonnes, arrêt des licences de test), puis Discord et bot communauté ; avertissements du démarrage ; message `SERVICES_NOTICE` après l'arrêt des licences de test. Depuis la PR #83, c'est le seul endroit des contrôles Stripe.
- **Journal** : événements groupés par jour, libellés `EVENT`, détails traduits (`DETAIL_KEY`, `DETAIL_VALUE`), pagination « plus anciens ».
- **Site et promos** : pop-up (formulaire à gauche, état et aperçu à droite, avec `{percent}`, `{code}`…), création de code promo (durée « sur le premier paiement » / « sur chaque paiement »), avis. Plus de contrôles Stripe ici (PR #83).
- **Tests réseau** : « Où jouent les joueurs », Par ville, Par fournisseur d'accès ; colonnes Hypixel, Minemen, Paris, Francfort, Londres, Stockholm, Madrid, Virginie, Internet ; ping médian coloré `p-1` (≤ 30 ms) à `p-4` (> 100 ms), pertes au-delà de 2 % soulignées ([[Test réseau]]).

## Données touchées

Aucune : reçoit les données lues par [[admin.js (serveur)]].

## Liens avec le reste

Appelé par [[admin.js (serveur)]] ; comportements du navigateur dans [[admin.js (page admin)]] ; styles dans `admin.css` ([[Styles du serveur (CSS)]]).

## Tests

Vérifiées à travers « /admin dashboard: players, Premium time, revoke, ban, gifts, sales, journal (2026-11-10) » de `flow.test.js` ([[Tests du serveur]]).

## À savoir avant de modifier

- Types d'audit **sans libellé** dans `EVENT` (affichés bruts) : `affiliate.joined`, `affiliate.rewarded`, `affiliate.reward_failed`, `affiliate.reward_at_risk`, `referral.created`, tous les `discord.*`, `trial.started`, `trial.refused`, `review.saved`, `review.deleted`, `profile.photo`, `update_download`, `license.duplicate`, `license.subscription_stopped`, `user.email_verified`.
- `eventKind` classe tout ce qui n'est pas `admin.`, `license.`, `user.`, `subscription.` ou `affiliate.` comme un événement de PC (`e-device`).
- Pas de style en ligne : ajouter une classe dans `admin.css`.
