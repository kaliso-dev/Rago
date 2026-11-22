---
type: code
tags: [code, serveur, javascript, navigateur]
fichier: licensing/public/account.js
lignes: 211
maj: 2026-11-10
---
# account.js

Le script du navigateur des pages du site de compte (`/signup`, `/login`, `/account`, `/account/profile`, `/account/review`, `/affiliate`), servi sous `/assets/account.js`. Améliorations seulement : chaque page marche sans lui. Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Chargé en `defer` par le gabarit `page()` de [[views.js]]. Fichier séparé à cause de la CSP stricte d'[[app.js]]. Textes en anglais ([[Voix et ton]]).

## Ce que le fichier fait

| Partie | Comportement |
|---|---|
| Copier | `data-copy` (clé de licence, code d'affiliation…) ; repli si le presse-papiers est bloqué ; « Copied » annoncé aux lecteurs d'écran sans déplacer le focus. |
| Mot de passe | `data-reveal` : Show / Hide. |
| Clé de licence | `data-reveal-key` : affiche ou masque la clé complète (petite animation `flip`). |
| Téléchargement | `data-download` : sur téléphone ou Mac, un premier clic explique que l'installateur ne marche que sous Windows ; un second clic télécharge quand même. |
| Formulaires | Bouton occupé à l'envoi (`data-busy`) ; confirmation pour les formulaires `data-confirm` (délier Discord, supprimer l'avis…). |
| Compteurs | Les chiffres de l'affiliation montent à l'ouverture (rien ne bouge avec « réduire les animations »). |
| Code de parrainage | Mis en majuscules pendant la saisie. |
| Messages | `?n=…` retiré de l'adresse : recharger ne réaffiche pas le message. |
| Photo de profil | Nom du fichier choisi, aperçu recadré avant l'envoi (le serveur recadre de la même façon, [[profile.js]]), dépôt par glisser-déposer. |
| Avis | Sens de la note (Not for me → Excellent), caractères restants, aperçu en direct de la carte vue sur le [[Site]], initiale du nom quand il n'y a pas de photo, message à côté des étoiles si aucune n'est choisie. Le serveur revérifie tout ([[reviews.js]]). |

## Données touchées

Aucune : agit seulement sur la page.

## Liens avec le reste

Pages de [[views.js]] ; styles dans `account.css` ([[Styles du serveur (CSS)]]). Équivalent de l'admin : [[admin.js (page admin)]].

## Tests

Pas de test automatique ([[Tests du serveur]]).

## À savoir avant de modifier

- Rien d'indispensable ici : la CSP et l'accessibilité supposent que tout marche sans JavaScript.
- Les pages chargent `/assets/account.js` sans numéro de version : un navigateur peut garder l'ancienne version un moment.
