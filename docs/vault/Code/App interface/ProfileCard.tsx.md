---
type: code
tags: [code, app, react, composant, compte, avis]
fichier: app/src/components/ProfileCard.tsx
lignes: 166
maj: 2026-11-10
---
# ProfileCard.tsx

La carte **« Profil »** des Paramètres : photo et nom public du compte Rago (affichés avec l'avis sur le site), l'avis lui-même (laisser, modifier, supprimer) et la déconnexion du compte. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Paramètres de l'app]] (et les avis du site, voir [[Site]]).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affichée dans [[Settings.tsx]].
- Tout passe par `useAccount()` de [[account.tsx]], qui appelle [[accountApi.ts]] (commandes Rust `account_*`, voir [[account.rs]]). Le front ne parle jamais lui-même au serveur.
- Textes : `useAccountText()` de [[accountText.ts]] (clés `profile.*`), pas [[i18n.ts]].

## Ce que le fichier expose
- `ProfileCard()`, sans paramètre.

## Fonctionnement détaillé

### Pas connecté
Si `via` ou `profile` manque, la carte montre :
- « Connecte-toi à ton compte Rago pour ajouter une photo de profil et laisser un avis. » ;
- ou, si le serveur est injoignable (`status === "offline"`), le texte d'erreur réseau.
- Un bouton « Se connecter » appelle `openSignIn()`, qui ouvre la fenêtre de connexion de [[ReviewDialog.tsx]].

### Connecté
- **En-tête** : avatar de 56 px (`Avatar`, voir [[Petits composants de l'interface]]), nom public (ou « Pas encore de nom public ») et e-mail du compte.
- **Photo** :
  - « Ajouter une photo » / « Changer la photo » ouvre un sélecteur de fichier (JPEG, PNG, WebP, GIF) ;
  - `shrinkPhoto` ([[account.tsx]]) recadre l'image au carré, la réduit à 512 px au plus et l'encode en WebP ; un fichier de plus de 25 Mo est refusé ;
  - puis `setPhoto` l'envoie ;
  - une poubelle « Retirer la photo » appelle `removePhoto`.
- **Nom public** :
  - champ de 32 caractères au plus (`NAME_MAX` de [[accountApi.ts]], qui vérifie aussi le format et refuse les liens) ;
  - bouton « Enregistrer », actif seulement si le nom a changé, puis « Enregistré. ».
- **Avis** :
  - les étoiles (1 à 5) et le commentaire, ou « Pas encore d'avis. » ;
  - si l'équipe l'a caché : « Masqué du site par l'équipe Rago. » ;
  - « Laisser un avis » / « Modifier l'avis » appelle `openReview(false)` ([[ReviewDialog.tsx]]) ;
  - « Supprimer l'avis » demande une confirmation sur place (« Supprimer ton avis ? Il est retiré du site. » ; « Le garder » / « Supprimer »), puis appelle `deleteReview`.
- **Déconnexion du compte** : bouton « Se déconnecter de ce compte » (`signOut`). Il n'est montré que si la connexion passe par le **compte** (`via === "account"`). Quand c'est le jeton de la licence Premium du PC qui sert (`via === "license"`), il n'y a pas de bouton ici : la licence se gère ailleurs dans les Paramètres ([[SubscriptionCard.tsx]], [[LicenseGate.tsx]]).

### Erreurs
- Chaque action renvoie `null` ou une `AccountError`. La carte affiche le texte d'erreur sous le nom (`errorText`, [[accountText.ts]]).
- Une exception imprévue est convertie par `asAccountError`.
- Une seule action à la fois (`busy` : photo, nom ou avis).

## Données touchées
- Compte Rago sur le serveur de licences (photo, nom public, avis), via les commandes Rust. Aucune donnée gardée dans la page.

## Liens avec le reste
- Logique : [[account.tsx]], [[accountApi.ts]], [[accountText.ts]]. Fenêtres : [[ReviewDialog.tsx]]. Invitation : [[ReviewPrompt.tsx]].
- Moteur : [[account.rs]]. Serveur : [[API du serveur]].
- Styles : section « carte Profil » de `account.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- La limite de 32 caractères et la règle du nom doivent rester les mêmes que celles du serveur ([[API du serveur]]), sinon le serveur refuse ce que l'app laisse passer.
- Ne jamais afficher l'e-mail d'un autre joueur : seule la carte du joueur connecté montre son propre e-mail.
