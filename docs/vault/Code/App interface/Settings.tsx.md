---
type: code
tags: [code, app, typescript, react]
fichier: app/src/pages/Settings.tsx
lignes: 225
maj: 2026-11-10
---
# Settings.tsx

La page **Paramètres** : compte et abonnement, profil, langue et animations, lien vers Partage et support, barre en jeu et arrière-plan, pendant la partie, mémoire, dossiers, à propos (version, signature, licences des logiciels tiers), et la confirmation de déconnexion. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Paramètres de l'app]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `Settings()` : la page (`page === "settings"`, entrée en bas de la [[Sidebar.tsx]]).
- `UpdateCheck` (interne) : ligne de recherche de mise à jour de l'exe de test.
- Constantes : `STAGING` (= `VITE_RAGO_SERVER === "staging"`) et `LICENCES` (voir plus bas).

## Fonctionnement détaillé (cartes, dans l'ordre de la grille)

### 1. Compte
- **Licence active ou expirée** :
  - e-mail ; dessous « Cette licence est active sur 1 appareil. Activée le {date}. » (ou « Vérification en attente : connecte-toi à internet. » si expirée) ; bouton « Se déconnecter » ;
  - « Offre » : « Rago Optimizer Premium » et « Vérifiée jusqu'au {date} » (`expiresAt` du jeton) ;
  - lignes d'abonnement [[SubscriptionCard.tsx]] (`SubscriptionRows`, rien si pas d'abonnement) ;
  - « Clé de licence » (indice masqué), « Appareil » (nom du PC lié) ;
  - « Gérer mon compte » (`ACCOUNT_URL/account`) et « Aide sur Discord » (`SUPPORT_URL`).
- **Plan gratuit** : « Tu es sur le plan gratuit : {73} réglages sur {218} sont ouverts. » ; « Passer Premium » (`SITE_URL/#pricing`), « Se connecter » (offre `signin`), « Aide sur Discord ».

### 2. Profil
[[ProfileCard.tsx]] : photo, nom public, avis (compte Rago).

### 3. Langue et animations
- « Langue » : Français / English → `setLang` (gardé dans `rago.lang` et envoyé au moteur pour le menu de l'icône, [[store.tsx]]).
- « Animations » : Complètes / Réduites → `setMotion` (`MotionConfig` de [[App.tsx]]).

### 4. Partage et support
Ligne-lien « Partage et support — Code de preset à partager, et rapport pour un ticket Discord. » → `goTo("share")` ([[Share.tsx]]).

### 5. Barre en jeu et arrière-plan, 6. Pendant la partie
[[BackgroundCard.tsx]] et [[SessionCard.tsx]].

### 7. Mémoire
Interrupteur « « Nettoyer » réduit aussi les applis en arrière-plan » (`cleanTrim`, défaut non) avec « Jamais la fenêtre au premier plan, tes jeux ni les anti-cheat. Une appli réduite peut mettre un instant à se réveiller. » Utilisé par [[LiveStatsCard.tsx]] et [[Overlay.tsx]].

### 8. Dossiers
« Journaux », « Ressources », « Données » → `api.openFolder("logs" | "resources" | "data")`.

### 9. À propos
- Logo, « Version {__APP_VERSION__} · 218 réglages » (version lue dans `package.json` au build, voir [[Configuration du front (Vite, npm)]]).
- « Par KALISO et RAGO » (signature ajoutée en 1.3.0).
- En démo : « Mode démo : aucune modification n'est faite sur ce PC. »
- **Exe de test seulement** (`STAGING`) : « Mise à jour : {date de la dernière recherche} » (ou « recherche en cours »), relu toutes les 3 s (`api.updateStatus()`).
- **Licences** des logiciels tiers, chacun avec un lien : NVIDIA Profile Inspector (MIT), PresentMon d'Intel (MIT), Geist et Geist Mono (SIL OFL 1.1), Tauri (MIT / Apache 2.0), React (MIT), Motion (MIT), Lucide (ISC).

### Déconnexion
« Se déconnecter » ouvre une confirmation :
- titre « Se déconnecter ? » ;
- si le moteur a des réglages à remettre (`api.signOutPlan()`) : « Tes {n} réglages appliqués vont être annulés : Rago Optimizer remet ces réglages de Windows comme avant, en arrière-plan… » ;
- « Se déconnecter ne libère pas ce PC : ta licence reste liée à {PC}. Pour la passer sur un autre PC, va sur la page de ton compte. » ;
- boutons « Gérer mon compte », « Annuler », et « Annuler et me déconnecter » (ou « Se déconnecter » s'il n'y a rien à remettre) → `signOut()` du store ; le moteur remet tout en arrière-plan puis [[ResetToast.tsx]] le dit.

## Liens avec le reste
- Store : `lang`, `setLang`, `motion`, `setMotion`, `license`, `signOut`, `setUpsell`, `activatedAt`, `sys`, `cleanTrim`, `setCleanTrim`, `goTo`.
- Adresses : [[LicenseGate.tsx]] ; primitives `Card`, `Segmented`, `Switch`, `Button`, `Modal`, `Wordmark` ([[Petits composants de l'interface]]).
- Fonctionnalités : [[Licence dans l'app]], [[Abonnement dans l'app]], [[Arrière-plan et démarrage]], [[Pendant la partie]], [[Mise à jour automatique]].

## À savoir avant de modifier
- Toute nouvelle dépendance livrée avec l'app (outil, police, bibliothèque) doit être ajoutée à `LICENCES` (obligation de licence ; voir [[Conformité juridique]]).
