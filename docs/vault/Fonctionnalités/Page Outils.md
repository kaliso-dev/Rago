---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.3.0
maj: 2026-11-10
---
# Page Outils

Page « Outils » du groupe « Optimiser » (« Entretien »). Code natif, hors catalogue (voir la section « Code »). **Toute la page est gratuite dans le code de `staging`** (1.3.0).

## Nettoyage (gratuit)
- Analyse puis affiche la place de 8 zones : fichiers temporaires (Temp), temporaires de Windows, téléchargements de Windows Update, rapports de plantage, cache des navigateurs (Chrome, Edge, Brave, Opera, Firefox : **cache seulement**, jamais historique, mots de passe ni cookies), cache de Discord, cache des shaders (décoché d'office), corbeille de tous les disques (décochée d'office ; à éviter juste avant un screenshare).
- Bouton « Nettoyer X Go » ; les fichiers ouverts restent ; liens jamais suivis ; **suppression définitive**. Jamais le Prefetch, les journaux Windows, les jeux, les documents ni Minecraft.

## Applis préinstallées (Premium en 1.2.1, gratuit dans la 1.3.0)
Une quarantaine d'applis que Windows installe tout seul (Candy Crush, TikTok, Clipchamp, Météo, Teams…), désinstallées pour le compte Windows du joueur. Toutes sont cochées d'office, sauf celles qu'on peut vraiment utiliser (Teams, Outlook, Courrier et calendrier, Office, Mobile connecté, Spotify, To Do). Désinstallation en deux clics (confirmation). **Jamais le Store, Xbox ni la Game Bar.** Chacune se réinstalle depuis le Microsoft Store.

## Pilotes (gratuit)
Carte graphique, réseau, audio : version, date, âge (point orange si plus de 6 mois pour le GPU, 2 ans pour le reste). Boutons : site officiel, site du fabricant (carte mère / portable), mises à jour facultatives de Windows. **Rago n'installe jamais de pilote.**

**Décision (Sofiene, 01/11)** : les outils restent gratuits, « c'est des outils indispensables » qui font de Rago une app qu'on ouvre souvent. Dans la 1.2.1, le nettoyage et les pilotes sont gratuits ; la désinstallation des applis préinstallées est encore Premium (`Tools.tsx`). Elle **passe en gratuit** (Sofiene, 01/11 : « Oui, tout gratuit » ; Linear RAG-88). Prévu d'abord pour une 1.2.2, mais la 1.2.2 ne sort pas seule : tout sort avec la 1.3.0 (Sofiene, 10/11, q47). Dans le code de `staging`, ni la page ni le moteur ne demandent de licence pour les outils (le commentaire de `lib.rs` dit encore « gratuite depuis la 1.2.2 » et celui de `api.ts` dit encore « Premium » : en retard).

Liens : [[Offres et prix]], [[Tableau de bord]].

## Code
- Page : [[Tools.tsx]] (trois cartes, applis décochées d'office, seuils des pilotes, liens des fabricants).
- Moteur : [[tools.rs]] (zones de nettoyage, liste des applis, lecture des pilotes) et les commandes `tools_*` de [[lib.rs]].
- Carte d'ensemble : [[Code de l'app (interface)]]. Les réglages de nettoyage du catalogue (`cln_*`, module Windows) sont autre chose : voir [[Catalogue des tweaks]].
