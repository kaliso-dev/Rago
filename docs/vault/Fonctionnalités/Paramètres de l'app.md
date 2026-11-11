---
type: fonctionnalité
tags: [fonctionnalité, app]
version_app: 1.3.0
maj: 2026-11-11
---
# Paramètres de l'app

Page Paramètres, en bas de la barre latérale. Voir [[App Windows]]. En 1.3.0 (PR #70), la section du compte montre aussi l'abonnement et permet de le résilier : [[Abonnement dans l'app]]. Ordre des cartes dans le code de `staging` : Compte, Profil, Langue et animations, Partage et support, Barre en jeu et arrière-plan, Pendant la partie, Mémoire, Dossiers, À propos.

- **Langue** : anglais (défaut) ou français (tutoiement).
- **Animations** : complètes ou réduites.
- **Barre en jeu et arrière-plan** : activer la [[Barre en jeu]] ; **raccourci** (Alt+X par défaut, modifiable : Ctrl, Alt ou Maj + lettre, chiffre ou touche F ; refusé s'il est déjà pris) ; « FPS et ping à l'écran pendant la partie » ; « Rester près de l'horloge à la fermeture » ; « Lancer avec Windows » ([[Arrière-plan et démarrage]]).
- **Pendant la partie** : carte graphique performante, mode Performances élevées, jeu en priorité haute (11/11, pas encore dans `staging`), vérifications ([[Pendant la partie]]).
- **Mémoire** : « Nettoyer » réduit aussi les applis en arrière-plan (coupé par défaut, voir [[Tableau de bord]]).
- **Partage et support** : ouvre [[Partage et support]].
- **Dossiers** : ouvrir Journaux, Ressources, Données.
- **À propos** : logo, version et nombre de réglages, signature « Par KALISO et RAGO » (1.3.0), licences des logiciels tiers avec un lien chacun (NVIDIA Profile Inspector, PresentMon, Geist, Tauri, React, Motion, Lucide). La ligne de recherche de [[Mise à jour automatique]] (« Mise à jour : … ») n'existe **que dans l'exe de test** (`VITE_RAGO_SERVER=staging`).
- **Compte** (licence) : e-mail, appareil, clé masquée, offre et date de vérification, **lignes d'abonnement** (prochain paiement, « Résilier l'abonnement », « Reprendre l'abonnement », voir [[Abonnement dans l'app]]), « Gérer mon compte », « Aide sur Discord », « Se déconnecter » avec une confirmation qui dit combien de réglages seront remis comme avant ([[Licence dans l'app]], [[Remise à zéro]]). En plan gratuit : « {73} réglages sur {218} sont ouverts », « Passer Premium », « Se connecter ».
- **Profil** (compte Rago) : nom public, photo de profil, avis (après environ 5 min d'utilisation réelle, l'app invite à laisser un avis), déconnexion du compte.
- PR #91 (11/11, pas encore dans `staging`) : dans « Pendant la partie », l'option « Vérifications au lancement d'un jeu » s'appelle « **Conseils au lancement d'un jeu** » ([[Conseils au lancement du jeu]]).

## Code
- Page : [[Settings.tsx]]. Cartes : [[SubscriptionCard.tsx]] (abonnement), [[ProfileCard.tsx]] (profil et avis), [[BackgroundCard.tsx]] (barre en jeu et arrière-plan), [[SessionCard.tsx]] (pendant la partie). Fenêtre d'avis et invitation : [[ReviewDialog.tsx]], [[ReviewPrompt.tsx]].
- État (langue, animations, option de « Nettoyer ») : [[store.tsx]] ; compte et avis : [[account.tsx]]. Moteur : [[license.rs]], [[account.rs]], [[background.rs]], [[update.rs]].
- Carte d'ensemble : [[Code de l'app (interface)]].
