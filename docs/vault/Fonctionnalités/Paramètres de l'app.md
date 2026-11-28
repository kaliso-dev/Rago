---
type: fonctionnalité
tags: [fonctionnalité, app]
version_app: 1.3.0
maj: 2026-11-28
---
# Paramètres de l'app

Page Paramètres, en bas de la barre latérale. Voir [[App Windows]]. En 1.3.0 (PR #70), la section du compte montre aussi l'abonnement et permet de le résilier : [[Abonnement dans l'app]]. Ordre des blocs dans le code de `staging` : à gauche Compte, Profil, App (langue, animations, partage et support), À propos ; à droite Barre en jeu et arrière-plan, Pendant la partie, Mémoire, Dossiers.

**Écran v5 (23/11, dans `staging` par la PR #126, fusionnée le 23/11, jamais testé sur Windows)** : la page est refaite à l'identique des maquettes `app-settings.html` et `app-settings-states.html` (demande de Sofiene du 23/11 : l'app doit être « strictement conforme au design »), détail dans [[Settings.tsx]]. Le fond ne change pas ; ce qui se voit : un en-tête avec le titre géant et, à droite, l'offre (« monthly » et « next payment $5.99 on 14 december » ; « canceled » et « active until … » une fois résilié ; « free », « 15 / 98 tweaks » et « premium unlocks the rest » en gratuit) ; deux colonnes de blocs en lignes ; « Sign out » dans le titre du bloc Compte ; la date d'activation sous l'e-mail ; en gratuit, une barre des réglages gratuits et le bouton rouge « Upgrade » ; résilié, la ligne d'abonnement passe en rouge avec « Resume subscription ». Dans le Profil, supprimer l'avis se fait avec une petite corbeille (hors maquette). La fenêtre « Before you cancel » et la confirmation de déconnexion gardent l'ancien style en attendant la reprise des fenêtres.

- **Langue** : anglais (défaut) ou français (tutoiement).
- **Animations** : complètes ou réduites.
- **Barre en jeu et arrière-plan** : activer la [[Barre en jeu]] ; **raccourci** (Alt+X par défaut, modifiable : Ctrl, Alt ou Maj + lettre, chiffre ou touche F ; refusé s'il est déjà pris) ; « FPS et ping à l'écran pendant la partie » ; « Rester près de l'horloge à la fermeture » ; « Lancer avec Windows » ([[Arrière-plan et démarrage]]).
- **Pendant la partie** : carte graphique performante, mode Performances élevées, jeu en priorité haute (11/11), vérifications ([[Pendant la partie]]).
- **Mémoire** : « Nettoyer » réduit aussi les applis en arrière-plan (coupé par défaut, voir [[Tableau de bord]]).
- **Partage et support** : ouvre [[Partage et support]].
- **Dossiers** : ouvrir Journaux, Ressources, Données.
- **À propos** : logo, version et nombre de réglages, signature « Par KALISO et RAGO » (1.3.0), licences des logiciels tiers avec un lien chacun (NVIDIA Profile Inspector dans sa version « DeadManWalking mod » livrée avec l'app, avis complet dans `resources\THIRD_PARTY_NOTICES.txt` depuis le 28/11 ; PresentMon, Barlow, Tauri, React, Motion, Lucide). La ligne de recherche de [[Mise à jour automatique]] (« Mise à jour : … ») n'existe **que dans l'exe de test** (`VITE_RAGO_SERVER=staging`).
- **Compte** (licence) : e-mail, appareil, clé masquée, offre et date de vérification, **lignes d'abonnement** (prochain paiement, « Résilier l'abonnement », « Reprendre l'abonnement », voir [[Abonnement dans l'app]]), « Gérer mon compte », « Aide sur Discord », « Se déconnecter » avec une confirmation qui dit combien de réglages seront remis comme avant ([[Licence dans l'app]], [[Remise à zéro]]). En plan gratuit : « {73} réglages sur {218} sont ouverts », « Passer Premium », « Se connecter ».
- **Profil** (compte Rago) : nom public, photo de profil, avis (après environ 5 min d'utilisation réelle, l'app invite à laisser un avis), déconnexion du compte.
- Depuis le 11/11 (PR #91, dans `staging`) : dans « Pendant la partie », l'option « Vérifications au lancement d'un jeu » s'appelle « **Conseils au lancement d'un jeu** » ([[Conseils au lancement du jeu]]).

## Code
- Page : [[Settings.tsx]]. Cartes : [[SubscriptionCard.tsx]] (abonnement), [[ProfileCard.tsx]] (profil et avis), [[BackgroundCard.tsx]] (barre en jeu et arrière-plan), [[SessionCard.tsx]] (pendant la partie). Fenêtre d'avis et invitation : [[ReviewDialog.tsx]], [[ReviewPrompt.tsx]].
- État (langue, animations, option de « Nettoyer ») : [[store.tsx]] ; compte et avis : [[account.tsx]]. Moteur : [[license.rs]], [[account.rs]], [[background.rs]], [[update.rs]].
- Carte d'ensemble : [[Code de l'app (interface)]].
