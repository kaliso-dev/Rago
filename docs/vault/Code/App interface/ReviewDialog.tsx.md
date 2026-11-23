---
type: code
tags: [code, app, react, composant, compte, avis]
fichier: app/src/components/ReviewDialog.tsx
lignes: 249
maj: 2026-11-23
---
# ReviewDialog.tsx

La fenêtre **« Ton avis »**. Elle connecte d'abord au compte Rago si besoin, puis demande une note de 1 à 5 étoiles, un commentaire et un nom public. Elle finit par un écran « Merci ». L'avis s'affiche ensuite sur le site. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Paramètres de l'app]], [[Site]].

Tout ce qui suit est CONFIRMÉ (PR #N vers `staging`, 24/11 : les trois écrans refaits sur les maquettes v5 `app-review-signin`, `app-review-write` et `app-review-thanks`).

## Rôle et place dans l'ensemble
- Montée une seule fois par [[App.tsx]], à côté de [[ReviewPrompt.tsx]].
- Elle s'ouvre quand `dialog` de [[account.tsx]] n'est pas nul :
  - depuis l'invitation ([[ReviewPrompt.tsx]], `openReview(true)`) ;
  - depuis la carte Profil ([[ProfileCard.tsx]] : « Laisser un avis », « Modifier l'avis », `openReview(false)`, ou « Se connecter », `openSignIn()`).
- Tout passe par `useAccount()` ([[account.tsx]]), qui appelle [[accountApi.ts]], puis les commandes Rust `account_*` ([[account.rs]]). Textes : [[accountText.ts]] (clés `review.*`).

## Ce que le fichier expose
- `ReviewDialog()`, sans paramètre.
- Composants internes :
  - `ErrorBox` : erreur traduite (`.err2`, icône d'alerte) ;
  - `Av` : la photo du compte, ou la première lettre du nom (`.av`, carré rouge) ;
  - `SignIn` : connexion ;
  - `Stars` : choix de la note ;
  - `ReviewForm` : formulaire ;
  - `Thanks` : remerciement.

## Fonctionnement détaillé

### Choix de l'écran
- `thanks` : l'avis vient d'être enregistré → **Merci**.
- Pas connecté (`via` nul) → **Connexion**.
- Connecté et `dialog.kind === "review"` → **Formulaire**.
- Connecté après « Se connecter » de la carte Profil (`kind === "signin"`) → rien d'autre à faire : la fenêtre se ferme toute seule.
- La fenêtre est une `Modal` v5 ([[Petits composants de l'interface]]) : `.mdl.gate2` (500 px) pour la connexion et le merci, `.mdl.rv2` (580 px) pour le formulaire. La fermer appelle `closeDialog(saved)` : cela compte comme un refus de l'invitation si elle venait de [[ReviewPrompt.tsx]] et que rien n'a été envoyé (règles dans [[account.tsx]]).

### Connexion (`SignIn`)
- Titre « Connecte-toi pour laisser un avis » (titre rouge `.h2.tape`) et rappel que l'e-mail n'est jamais affiché.
- Champs **e-mail** et **mot de passe** du compte Rago (`label.fl2` + `input.in3`, bordure rouge quand ils ont le focus), puis le grand bouton rouge « Se connecter » avec une flèche (roue qui tourne pendant la connexion). Un champ vide prend le focus au lieu d'envoyer : le bouton reste rouge, comme la maquette. Pas de bouton Google ou Discord ici : ces connexions sont dans la fenêtre de licence ([[LicenseGate.tsx]]).
- Liens du bas (`.uln`) « Créer un compte » (`{ACCOUNT_URL}/signup`) et « Mot de passe oublié ? » (`{ACCOUNT_URL}/forgot`), ouverts par `api.openUrl`. `ACCOUNT_URL` vient de [[LicenseGate.tsx]] (`VITE_ACCOUNT_URL`).
- `signIn(email, motDePasse)`. En cas d'erreur, le texte traduit s'affiche. En cas de réussite, le mot de passe est vidé et l'écran passe au formulaire.

### Formulaire (`ReviewForm`)
- Titre « Ton avis » ou « Modifier ton avis » (si un avis existe ; ses valeurs sont alors pré-remplies).
- Libellé « Note » (`.grp`), puis les **étoiles** (`Stars`, `.st4.big` : cinq boutons de 34 px, rouges jusqu'à la note) :
  - survol pour prévisualiser, clic pour choisir ;
  - flèches du clavier pour changer la note ;
  - une seule étoile dans l'ordre de tabulation.
- **Commentaire** : un `textarea` dans `.in3.ta` (bordure rouge quand il a le focus), qui grandit avec le texte jusqu'à 8 lignes ; 600 caractères au plus (`COMMENT_MAX`), compteur « n / 600 » en bas à droite.
- **Nom public** (`.pnm`) : photo ou initiale (`Av`) et champ de 32 caractères au plus (`NAME_MAX`), puis le rappel (`.hint2`) « Affiché avec ton avis sur le site. Ton email n'est jamais affiché. ».
- **Obligatoire** : une note, un commentaire non vide, un nom d'au moins 2 caractères. Le bouton reste cliquable ; s'il manque quelque chose, l'erreur dit quoi (`invalid_rating`, `empty_comment`, `name_required`).
- **Envoi** : `saveReview(note, commentaire, nom)`. Le nom n'est envoyé que s'il a changé (sinon `null`). Pied `.mf` : « Annuler » (`btn gh2`) et « Publier l'avis » / « Mettre à jour » (`btn red`).

### Merci (`Thanks`)
- En-tête `.okh` : la coche dans sa case inclinée (`.ok4`, seule la coche grandit en apparaissant : l'animation remplacerait l'inclinaison de la case) et « Merci pour ton avis. », puis « Il s'affiche sur le site dans la minute, avec ton nom et ta photo. ».
- **Aperçu de l'avis** (`.rvq`) : photo ou initiale, nom public, étoiles de la note, commentaire entre guillemets (« » en français).
- Si l'avis est caché par l'équipe : « Masqué du site par l'équipe Rago. ».
- « Fermer » (`btn`, qui a le focus) appelle `closeDialog(true)`. L'écran revient au formulaire 250 ms après la fermeture, pour ne pas sauter pendant l'animation.

## Données touchées
- Compte Rago et avis, sur le serveur de licences ([[API du serveur]]), via les commandes Rust. Rien n'est gardé dans la fenêtre.

## Liens avec le reste
- Logique : [[account.tsx]], [[accountApi.ts]], [[accountText.ts]]. Ouvertures : [[ReviewPrompt.tsx]], [[ProfileCard.tsx]].
- Styles : `.gate2`, `.rv2`, `.fl2`, `.in3`, `.st4`, `.pnm`, `.rvq` de `s5/pages/win.css` (maquette) ; boutons étoiles, `textarea`, photo dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]).

## À savoir avant de modifier
- `COMMENT_MAX` (600) et `NAME_MAX` (32) doivent rester égaux aux limites du serveur ([[API du serveur]]).
- Ne jamais afficher l'e-mail avec l'avis : seul le nom public part sur le site.
