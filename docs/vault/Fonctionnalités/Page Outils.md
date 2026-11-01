---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-11-01
---
# Page Outils

Page « Outils » du groupe « Optimiser » (« Entretien »). Code natif, hors catalogue : `tools.rs`, page `Tools.tsx`.

## Nettoyage (gratuit)
- Analyse puis affiche la place de 8 zones : fichiers temporaires (Temp), temporaires de Windows, téléchargements de Windows Update, rapports de plantage, cache des navigateurs (Chrome, Edge, Brave, Opera, Firefox : **cache seulement**, jamais historique, mots de passe ni cookies), cache de Discord, cache des shaders (décoché d'office), corbeille de tous les disques (décochée d'office ; à éviter juste avant un screenshare).
- Bouton « Nettoyer X Go » ; les fichiers ouverts restent ; liens jamais suivis ; **suppression définitive**. Jamais le Prefetch, les journaux Windows, les jeux, les documents ni Minecraft.

## Applis préinstallées (Premium)
Une quarantaine d'applis que Windows installe tout seul (Candy Crush, TikTok, Clipchamp, Météo, Teams…), désinstallées pour le compte Windows du joueur. **Jamais le Store, Xbox ni la Game Bar.** Chacune se réinstalle depuis le Microsoft Store.

## Pilotes (gratuit)
Carte graphique, réseau, audio : version, date, âge (point orange si plus de 6 mois pour le GPU, 2 ans pour le reste). Boutons : site officiel, site du fabricant (carte mère / portable), mises à jour facultatives de Windows. **Rago n'installe jamais de pilote.**

**Décision (Sofiene, 01/11)** : les outils restent gratuits, « c'est des outils indispensables » qui font de Rago une app qu'on ouvre souvent. Dans la 1.2.1, le nettoyage et les pilotes sont gratuits ; seule la désinstallation des applis préinstallées est Premium (`Tools.tsx`) : à trancher ([[Questions ouvertes]]).

Liens : [[Offres et prix]], [[Tableau de bord]].
