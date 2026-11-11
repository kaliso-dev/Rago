---
type: fonctionnalité
tags: [fonctionnalité, app]
version_app: 1.3.0
maj: 2026-11-11
---
# Tableau de bord

Première page de l'app (`Dashboard.tsx`). Titre : « Chaque milliseconde compte. » Voir [[App Windows]] pour la navigation.

## Ce qu'il contient, de haut en bas
- **Optimisations gratuites** : un bouton applique en un clic, après une confirmation, les réglages gratuits du **module Windows** encore à appliquer (50 interrupteurs en 1.3.0 : mode jeu, Game DVR, effets visuels, notifications, suggestions, Copilot et Recall…). Sans licence, le lot est limité aux **places libres du plan gratuit** (30 réglages allumés à la fois, voir [[free.json]]) ; en Premium, pas de limite. Les outils ponctuels de Restaurer et les réglages gratuits des autres modules (stockage, pilotes) n'y sont pas. Affiche ensuite « Déjà appliquées ». Chaque réglage s'annule depuis sa page. Ouvert en gratuit comme en Premium. Voir [[Offres et prix]].
- **Analyse du PC** (1.3.0) : carte « Une vingtaine de secondes pour mesurer ce qui ralentit ton PC en jeu. Rien n'est changé. » avec le bouton « Analyser mon PC », qui ouvre la page [[Analyse du PC]].
- **Ta machine** : système, processeur, carte graphique, mémoire, réseau (bouton Actualiser).
- **Utilisation en direct** : RAM, GPU (moteur le plus chargé), CPU (tous les cœurs), mesurés par Windows chaque seconde, seulement quand la page est visible ; « Indisponible » si Windows ne fournit pas la mesure (jamais un faux 0 %). Bouton Gestionnaire des tâches.
- **Nettoyer (Clean RAM, RAG-48)** : vide la liste « standby » de Windows (cache des fichiers lus récemment). Aucune appli fermée. L'app annonce le **cache vidé**, jamais de la « RAM libérée » ; seulement au clic (jamais en boucle). Option dans les [[Paramètres de l'app]] : réduire aussi les applis en arrière-plan (jamais la fenêtre au premier plan, les jeux, les anti-cheat ni Windows). Gratuit. Le même nettoyage est aussi une tuile « Vider le cache de la RAM » de la [[Page Outils]] (PR #90 du 11/11, dans `staging` par la PR #92).
- **Presets** (5 généraux : `mc_pvp`, `fps`, `latency`, `laptop`, `privacy`) puis **Presets par jeu** (les 15 presets par jeu, plus `mc_pvp` affiché « Minecraft », avec le logo du jeu) : un clic les ajoute à la sélection, sans rien appliquer. **Premium** : sans licence, cadenas et offre Premium. Voir [[Presets]].
- **Mes presets** : enregistrer la sélection allumée sous un nom, copier son code, modifier (nom, tweaks, variantes), supprimer. **Ouvert en gratuit** : seuls les réglages du plan du joueur sont cochés. Voir [[Partage et support]].
- **État** : droits administrateur, NVIDIA Profile Inspector, point de restauration (bouton Créer), nombre de tweaks appliqués (« X / 203 »). La ligne WMIC n'est affichée que si un réglage en a encore besoin : aucun en 1.3.0, elle est donc cachée.
- **Réglages retirés encore appliqués** : si le PC garde un tweak retiré du catalogue, bouton « Remettre comme avant ». Voir [[Tweaks retirés]].
- **Tout annuler** (RAG-43) : remet tous les tweaks appliqués comme avant. Voir [[Remise à zéro]].

## Barre d'application
En bas de chaque page : « N changements · a à appliquer · u à annuler », bouton « Appliquer », « Vider ». Les tweaks qui demandent un redémarrage sont comptés. Pendant l'exécution, une fenêtre montre le journal ligne par ligne ([[Moteur des tweaks]]).

## Recherche
« Rechercher un réglage » (palette, Ctrl+K) cherche parmi tous les tweaks et ouvre leur module ; une recherche réseau ouvre l'onglet « Optimisations » de la page Réseau.

## Code
- Page : [[Dashboard.tsx]] (blocs, règles gratuit / Premium, limite des places). Carte d'usage en direct et « Nettoyer » : [[LiveStatsCard.tsx]]. Modifier un preset : [[PresetEditor.tsx]].
- Barre d'application : [[ApplyBar.tsx]], confirmation : [[ConfirmDialog.tsx]], exécution : [[RunOverlay.tsx]]. Recherche : [[SearchPalette.tsx]].
- État et actions : [[store.tsx]] ; liste gratuite : [[free.json]] ; carte d'ensemble : [[Code de l'app (interface)]]. Côté moteur : [[memory.rs]] (Nettoyer), [[stats.rs]] (usage en direct).
