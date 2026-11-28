---
type: code
tags: [code, app, typescript, react]
fichier: app/src/pages/Settings.tsx
lignes: 371
maj: 2026-11-28
---
# Settings.tsx

La page **Paramètres** : compte et abonnement, profil, langue et animations, lien vers Partage et support, barre en jeu et arrière-plan, pendant la partie, mémoire, dossiers, à propos (version, signature, licences des logiciels tiers), et la confirmation de déconnexion. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Paramètres de l'app]].

**Écran v5 (23/11, dans `staging` par la PR #126, fusionnée le 23/11, jamais testé sur Windows)** : la page est refaite à l'identique des maquettes `app-settings.html` (Premium), `app-settings-free.html` (gratuit) et `app-settings-canceled.html` (abonnement résilié) ; demande de Sofiene du 23/11 : l'app doit être « strictement conforme au design ». Styles : `s5/pages/module.css` et `s5/pages/pages.css`, retouches dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]). Ce qui se voit :
- l'offre dans l'étiquette rouge de l'en-tête (« premium », « monthly », « next payment $5.99 on 14 dec » ; résilié : « canceled », « active until 14 dec, no more charges » ; gratuit : « free », « 68 / 218 tweaks », « premium unlocks the rest ») ;
- deux colonnes de blocs en lignes : compte, profil, app (langue, animations, lien Partage et support), mémoire, à propos ; barre en jeu, pendant la partie, dossiers. Depuis le 25/11 (PR #137), « mémoire » est à gauche, avant « à propos », pour que les deux colonnes finissent à la même hauteur ; le dernier bloc de chaque colonne s'étire jusqu'en bas (`s5/grids.css`, demande de Sofiene : pas de vide entre les cartes) ;
- « Se déconnecter » est en haut à droite du bloc compte ; le gratuit montre ses réglages ouverts en barre rouge, « Passer Premium » en rouge ;
- les licences sont des pastilles cliquables.
Le fonctionnement ne change pas. Écarts voulus avec la maquette : la ligne « Mode démo » (démo seulement) et les textes des réglages « Jeu en priorité haute » et « Conseils au lancement d'un jeu », plus longs que dans la maquette.

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `Settings()` : la page (`page === "settings"`, entrée en bas de la [[Sidebar.tsx]]).
- `Seg2` (interne) : choix à deux cases `.seg2` de la maquette (`role="radiogroup"`, flèches gauche et droite).
- `UpdateCheck` (interne) : ligne de recherche de mise à jour de l'exe de test.
- Constantes : `STAGING` (= `VITE_RAGO_SERVER === "staging"`) et `LICENCES` (voir plus bas).

## Fonctionnement détaillé (cartes, dans l'ordre de la grille)

### 1. Compte
- **Licence active ou expirée** :
  - e-mail ; dessous « Cette licence est active sur 1 appareil. Activée le {date}. » (ou « Vérification en attente : connecte-toi à internet. » si expirée) ; bouton « Se déconnecter » ;
  - « Offre » : « Rago Optimizer Premium » et « Vérifiée jusqu'au {date} » (`expiresAt` du jeton) ;
  - ligne d'abonnement [[SubscriptionCard.tsx]] (`SubscriptionRow`, rien si pas d'abonnement ; l'abonnement est lu par `useSubscription()` dans la page, qui le montre aussi dans l'en-tête) ;
  - « Clé de licence » (indice masqué), « Appareil » (nom du PC lié) ;
  - « Gérer mon compte » (`ACCOUNT_URL/account`) et « Aide sur Discord » (`SUPPORT_URL`).
- **Plan gratuit** : « Tu es sur le plan gratuit : {68} réglages sur {218} sont ouverts. » (`FREE_COUNT` de [[store.tsx]], q75) ; « Passer Premium » (`SITE_URL/#pricing`), « Se connecter » (offre `signin`), « Aide sur Discord ».

### 2. Profil
[[ProfileCard.tsx]] (`ProfileSection`) : photo, nom public, avis (compte Rago).

### 3. Langue et animations
- « Langue » : Français / English → `setLang` (gardé dans `rago.lang` et envoyé au moteur pour le menu de l'icône, [[store.tsx]]).
- « Animations » : Complètes / Réduites → `setMotion` (`MotionConfig` de [[App.tsx]]).

### 4. Partage et support
Ligne-lien « Partage et support — Code de preset à partager, et rapport pour un ticket Discord. » → `goTo("share")` ([[Share.tsx]]).

### 5. Barre en jeu et arrière-plan, 6. Pendant la partie
[[BackgroundCard.tsx]] (`BackgroundSection`) et [[SessionCard.tsx]] (`SessionSection`).

### 7. Mémoire
Interrupteur « « Nettoyer » réduit aussi les applis en arrière-plan » (`cleanTrim`, défaut non) avec « Jamais la fenêtre au premier plan, tes jeux ni les anti-cheat. Une appli réduite peut mettre un instant à se réveiller. » Utilisé par [[LiveStatsCard.tsx]] et [[Overlay.tsx]].

### 8. Dossiers
« Journaux », « Ressources », « Données » → `api.openFolder("logs" | "resources" | "data")`.

### 9. À propos
- Logo (R rouge, « ago », « optimizer »), « Version {__APP_VERSION__} // 218 réglages » (version lue dans `package.json` au build, voir [[Configuration du front (Vite, npm)]]).
- « Par KALISO et RAGO » (signature ajoutée en 1.3.0).
- En démo : « Mode démo : aucune modification n'est faite sur ce PC. »
- **Exe de test seulement** (`STAGING`) : « Mise à jour : {date de la dernière recherche} » (ou « recherche en cours »), relu toutes les 3 s (`api.updateStatus()`).
- **Licences** des logiciels tiers, chacun avec un lien : NVIDIA Profile Inspector (DeadManWalking mod) (MIT, lien vers `DeadManWalkingTO/NVidiaProfileInspectorDmW`, la version livrée, depuis le 28/11 ; son avis complet est dans `resources\THIRD_PARTY_NOTICES.txt`, voir [[Configuration Tauri]]), PresentMon d'Intel (MIT), Barlow et Barlow Condensed (SIL OFL 1.1, lien https://github.com/jpt/barlow, depuis la PR #108 du 22/11), Tauri (MIT / Apache 2.0), React (MIT), Motion (MIT), Lucide (ISC).

### Déconnexion
« Se déconnecter » ouvre une confirmation :
- titre « Se déconnecter ? » ;
- si le moteur a des réglages à remettre (`api.signOutPlan()`) : « Tes {n} réglages appliqués vont être annulés : Rago Optimizer remet ces réglages de Windows comme avant, en arrière-plan… » ;
- « Se déconnecter ne libère pas ce PC : ta licence reste liée à {PC}. Pour la passer sur un autre PC, va sur la page de ton compte. » ;
- boutons « Gérer mon compte », « Annuler », et « Annuler et me déconnecter » (ou « Se déconnecter » s'il n'y a rien à remettre) → `signOut()` du store ; le moteur remet tout en arrière-plan puis [[ResetToast.tsx]] le dit.
Fenêtre v5 (maquette `app-signout`, dans `staging` par la PR #130, fusionnée le 23/11) : `Modal` avec `v5="cxm"`, titre en ruban, le texte des réglages à remettre en clair (`p.ml.hi`), l'autre en gris (`p.ml`), puis « manage account » à gauche (`btn gh2 pl`, icône `user`), « cancel » (`btn gh2`) et le bouton rouge (icône `logout`, focus à l'ouverture).

## Liens avec le reste
- Store : `lang`, `setLang`, `motion`, `setMotion`, `license`, `signOut`, `setUpsell`, `activatedAt`, `sys`, `cleanTrim`, `setCleanTrim`, `goTo`.
- Adresses : [[LicenseGate.tsx]] ; `Sw` ([[Maquettes v5 dans l'app (s5)]], `s5/ui.tsx`), `I` et `LogoR` (`s5/I.tsx`), `dayMonth` (`s5/text.ts`) ; `Modal` avec l'option `v5` ([[Petits composants de l'interface]]) pour la confirmation de déconnexion.
- Fonctionnalités : [[Licence dans l'app]], [[Abonnement dans l'app]], [[Arrière-plan et démarrage]], [[Pendant la partie]], [[Mise à jour automatique]].

## À savoir avant de modifier
- Toute nouvelle dépendance livrée avec l'app (outil, police, bibliothèque) doit être ajoutée à `LICENCES` (obligation de licence ; voir [[Conformité juridique]]).
