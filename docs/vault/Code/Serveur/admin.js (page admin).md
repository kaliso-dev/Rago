---
type: code
tags: [code, serveur, javascript, admin, navigateur]
fichier: licensing/public/admin.js
lignes: 160
maj: 2026-11-10
---
# admin.js (page admin)

Le petit script du navigateur chargé par toutes les pages de `/admin` (servi sous `/assets/admin.js?v=<ASSETS>`). Il ne fait qu'**améliorer** les pages : chaque page et chaque formulaire marchent sans lui. Ne pas confondre avec [[admin.js (serveur)]] (les routes) et [[admin.js (script serveur)]] (`npm run admin`). Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Tableau de bord admin]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 10/11/2026 avec la refonte de l'admin (PR #82). Chargé en `defer` par le gabarit de [[admin-views.js]]. Fichier séparé parce que la CSP stricte d'[[app.js]] interdit tout script en ligne. Textes en français.

## Ce que le fichier fait

| Partie | Comportement |
|---|---|
| Confirmation | Un formulaire `data-confirm="…"` ouvre une fenêtre `<dialog>` (« Confirmer », ou « Action irréversible ou sensible » en rouge si le formulaire a `data-danger` ou si le bouton est `btn-danger`) ; le bouton reprend le texte du bouton cliqué. Sans `<dialog>` : `window.confirm`. |
| Bouton occupé | À l'envoi d'un POST, le bouton prend `aria-busy` et le texte `data-busy` (par exemple « Vérification… ») pendant 15 s au plus : pas de double envoi. |
| Copier | Boutons `data-copy` (e-mail, clé, liens), avec repli si le presse-papiers est bloqué ; message court. |
| Mot de passe | `data-reveal` affiche / masque la clé admin sur la page de connexion. |
| Lignes cliquables | Toute la ligne d'un tableau ouvre le joueur (le vrai lien reste dans la première cellule). |
| Filtres | `data-autosubmit` envoie le formulaire dès qu'un filtre change. |
| Clavier | `/` ou Ctrl+K (Cmd+K) met le curseur dans la recherche `#q-global` (et ouvre le menu sur téléphone) ; Échap ferme le menu ; Entrée ou Espace sur le bouton du menu. |
| Adresse propre | `history.replaceState` vers `data-path` de `<main>` après un formulaire réaffiché (lien montré une fois, action refusée) : recharger ne renvoie pas le formulaire. Retire aussi `n`, `count`, `code` et `frais` de l'adresse (`frais` depuis la PR #83 : recharger ne relit pas Stripe). |
| Messages | Les messages de succès (`.toast`) disparaissent après 7 s (2,6 s après une copie) ; les erreurs restent. |

## Données touchées

Aucune : agit seulement sur la page.

## Liens avec le reste

Pages de [[admin-views.js]] ; styles `.dlg`, `.toast`, `aria-busy` dans `admin.css` ([[Styles du serveur (CSS)]]). Équivalent pour le site de compte : [[account.js]].

## Tests

Pas de test automatique (les tests du serveur ne lancent pas de navigateur) ; vérifié à la main dans Chromium d'après [[Tableau de bord admin]] ([[Tests du serveur]]).

## À savoir avant de modifier

- Changer `ASSETS` dans [[admin-views.js]] après une modification, sinon les navigateurs gardent l'ancienne version.
- Ne rien rendre indispensable ici : tout doit marcher sans JavaScript.
