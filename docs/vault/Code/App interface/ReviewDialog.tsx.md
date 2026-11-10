---
type: code
tags: [code, app, react, composant, compte, avis]
fichier: app/src/components/ReviewDialog.tsx
lignes: 216
maj: 2026-11-10
---
# ReviewDialog.tsx

La fenêtre **« Ton avis »**. Elle connecte d'abord au compte Rago si besoin, puis demande une note de 1 à 5 étoiles, un commentaire et un nom public. Elle finit par un écran « Merci ». L'avis s'affiche ensuite sur le site. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Paramètres de l'app]], [[Site]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Montée une seule fois par [[App.tsx]], à côté de [[ReviewPrompt.tsx]].
- Elle s'ouvre quand `dialog` de [[account.tsx]] n'est pas nul :
  - depuis l'invitation ([[ReviewPrompt.tsx]], `openReview(true)`) ;
  - depuis la carte Profil ([[ProfileCard.tsx]] : « Laisser un avis », « Modifier l'avis », `openReview(false)`, ou « Se connecter », `openSignIn()`).
- Tout passe par `useAccount()` ([[account.tsx]]), qui appelle [[accountApi.ts]], puis les commandes Rust `account_*` ([[account.rs]]). Textes : [[accountText.ts]] (clés `review.*`).

## Ce que le fichier expose
- `ReviewDialog()`, sans paramètre.
- Composants internes :
  - `ErrorBox` : erreur traduite ;
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
- La fenêtre est une `Modal` ([[Petits composants de l'interface]]). La fermer appelle `closeDialog(saved)` : cela compte comme un refus de l'invitation si elle venait de [[ReviewPrompt.tsx]] et que rien n'a été envoyé (règles dans [[account.tsx]]).

### Connexion (`SignIn`)
- Titre « Connecte-toi pour laisser un avis » et rappel que l'e-mail n'est jamais affiché.
- Champs **e-mail** et **mot de passe** du compte Rago. Pas de bouton Google ou Discord ici : ces connexions sont dans la fenêtre de licence ([[LicenseGate.tsx]]).
- Liens « Créer un compte » (`{ACCOUNT_URL}/signup`) et « Mot de passe oublié ? » (`{ACCOUNT_URL}/forgot`), ouverts par `api.openUrl`. `ACCOUNT_URL` vient de [[LicenseGate.tsx]] (`VITE_ACCOUNT_URL`).
- `signIn(email, motDePasse)`. En cas d'erreur, le texte traduit s'affiche. En cas de réussite, le mot de passe est vidé et l'écran passe au formulaire.

### Formulaire (`ReviewForm`)
- Titre « Ton avis » ou « Modifier ton avis » (si un avis existe ; ses valeurs sont alors pré-remplies).
- **Étoiles** (`Stars`) :
  - survol pour prévisualiser, clic pour choisir ;
  - flèches du clavier pour changer la note ;
  - une seule étoile dans l'ordre de tabulation.
- **Commentaire** : 600 caractères au plus (`COMMENT_MAX`), avec un compteur « n/600 ».
- **Nom public** : avatar et champ de 32 caractères au plus (`NAME_MAX`). « Affiché avec ton avis sur le site. Ton email n'est jamais affiché. ».
- **Obligatoire** : une note, un commentaire non vide, un nom d'au moins 2 caractères. Le bouton reste cliquable ; s'il manque quelque chose, l'erreur dit quoi (`invalid_rating`, `empty_comment`, `name_required`).
- **Envoi** : `saveReview(note, commentaire, nom)`. Le nom n'est envoyé que s'il a changé (sinon `null`). Boutons « Annuler » et « Publier l'avis » / « Mettre à jour ».

### Merci (`Thanks`)
- « Merci pour ton avis. » puis « Il s'affiche sur le site dans la minute, avec ton nom et ta photo. ».
- Si l'avis est caché par l'équipe : « Masqué du site par l'équipe Rago. ».
- « Fermer » appelle `closeDialog(true)`. L'écran revient au formulaire 250 ms après la fermeture, pour ne pas sauter pendant l'animation.

## Données touchées
- Compte Rago et avis, sur le serveur de licences ([[API du serveur]]), via les commandes Rust. Rien n'est gardé dans la fenêtre.

## Liens avec le reste
- Logique : [[account.tsx]], [[accountApi.ts]], [[accountText.ts]]. Ouvertures : [[ReviewPrompt.tsx]], [[ProfileCard.tsx]].
- Styles : sections « formulaire d'avis » de `account.css` et fenêtres de `app.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- `COMMENT_MAX` (600) et `NAME_MAX` (32) doivent rester égaux aux limites du serveur ([[API du serveur]]).
- Ne jamais afficher l'e-mail avec l'avis : seul le nom public part sur le site.
