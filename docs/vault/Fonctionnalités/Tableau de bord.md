---
type: fonctionnalité
tags: [fonctionnalité, app]
version_app: 1.2.1
maj: 2026-10-31
---
# Tableau de bord

Première page de l'app (`Dashboard.tsx`). Titre : « Chaque milliseconde compte. » Voir [[App Windows]] pour la navigation.

## Ce qu'il contient, de haut en bas
- **Optimisations gratuites** : un bouton applique en un clic les 11 tweaks du plan gratuit (mode jeu, Game DVR, plein écran, effets visuels, notifications, suggestions, Copilot et Recall + outils de Restaurer), après une confirmation ; affiche ensuite « Déjà appliquées ». Chaque tweak s'annule depuis sa page. Voir [[Offres et prix]].
- **Ta machine** : système, processeur, carte graphique, mémoire, réseau (bouton Actualiser).
- **Utilisation en direct** : RAM, GPU (moteur le plus chargé), CPU (tous les cœurs), mesurés par Windows chaque seconde, seulement quand la page est visible ; « Indisponible » si Windows ne fournit pas la mesure (jamais un faux 0 %). Bouton Gestionnaire des tâches.
- **Nettoyer (Clean RAM, RAG-48)** : vide la liste « standby » de Windows (cache des fichiers lus récemment). Aucune appli fermée. L'app annonce le **cache vidé**, jamais de la « RAM libérée » ; seulement au clic (jamais en boucle). Option dans les [[Paramètres de l'app]] : réduire aussi les applis en arrière-plan (jamais la fenêtre au premier plan, les jeux, les anti-cheat ni Windows). Gratuit.
- **Presets** (5 généraux) puis **Presets par jeu** (15) : « Sélectionner » les ajoute à la sélection. Premium. Voir [[Presets]].
- **Mes presets** : enregistrer la sélection allumée sous un nom, copier son code, modifier (nom, tweaks, variantes), supprimer. Voir [[Partage et support]].
- **État** : droits administrateur, WMIC disponible, NVIDIA Profile Inspector, point de restauration (bouton Créer), nombre de tweaks appliqués.
- **Réglages retirés encore appliqués** : si le PC garde un tweak retiré du catalogue, bouton « Remettre comme avant ». Voir [[Tweaks retirés]].
- **Tout annuler** (RAG-43) : remet tous les tweaks appliqués comme avant. Voir [[Remise à zéro]].

## Barre d'application
En bas de chaque page : « N changements · a à appliquer · u à annuler », bouton « Appliquer », « Vider ». Les tweaks qui demandent un redémarrage sont comptés. Pendant l'exécution, une fenêtre montre le journal ligne par ligne ([[Moteur des tweaks]]).

## Recherche
« Rechercher un réglage » (palette) cherche parmi tous les tweaks et ouvre leur module ; une recherche réseau ouvre l'onglet Optimisations de la page Réseau.
