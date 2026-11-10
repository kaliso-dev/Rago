---
type: marketing
tags: [marketing, étude, concurrence, overlay]
source: /mnt/project-files/etude-marche-2026-11/3-constructeurs.md
maj: 2026-11-10
---
# Étude - Apps de constructeurs et overlays

Étude n° 3 de l'[[Étude de marché de novembre 2026]] : apps de constructeurs (cartes graphiques, cartes mères, périphériques), de surveillance et overlays en jeu. Fichier `etude-marche-2026-11/3-constructeurs.md` (71 Ko, 03/11/2026). **Statut : OBSERVÉ** (aucune app installée ; quota de lecture épuisé, certains points reposent sur un titre). Cible rappelée : un joueur qui veut le meilleur PC mais ne connaît rien aux optimisations. Voir [[Barre en jeu]], [[Analyse du PC]], [[Presets]], [[Tableau de bord]].

Grille en 12 points : disposition, matériel sur l'accueil, premier lancement, un clic ou expert, compréhension, surveillance et overlay, avant/après, retour aux défauts, gratuit et contreparties, ce qui marche, plaintes, idée pour Rago.

## Les apps, une par une
### NVIDIA App
- Barre latérale (Accueil, Bibliothèque, Pilotes, Système, Performance, My Rig, Récompenses, Paramètres). **Pas de compte obligatoire** (seulement pour les Récompenses) ; partage de données actif par défaut.
- Par jeu : bouton **Optimize** et curseur Performance ↔ Quality, avec un **aperçu « valeur actuelle → valeur recommandée »** de chaque réglage. GPU : **Automatic Tuning** en un clic. Assistant IA G-Assist.
- Overlay **Alt+R** (menu Alt+Z) : FPS, 1 % low, GPU/CPU, latence, température, horloge, tension ; v11.0.9 ajoute température, horloge et consommation du CPU ; pas de RAM ni VRAM.
- Contreparties : pubs (GeForce Now) et télémétrie par défaut ; 5 processus ≈ 150 Mo + `nvcontainer.exe` ≈ 60 Mo après fermeture.
- Plaintes : filtres de jeu qui faisaient perdre **2 à 12 % de FPS** (Tom's Hardware, jusqu'à 15 %) ; « correction » 11.0.1 = filtres désactivés par défaut ; overlay qui fige des jeux.
- **Idée** : liste « actuel → après » avant un preset, curseur « Plus de FPS ↔ Plus de confort » ; **mesurer et publier le coût de Rago lui-même** (barre en jeu comprise).

### AMD Software : Adrenalin (HYPR-RX)
- Refonte 23.12.1 (déc. 2023) : onglet Accueil avec HYPR-RX et jeux ; barre de recherche.
- **HYPR-RX** : « Enable a suite of features in one-click » = Anti-Lag + AFMF 2.1 + RSR + Radeon Boost + FSR ; **HYPR-RX Eco** = AFMF + Radeon Chill ; RX 7000 et plus. Test Pokde 8,3/10, « surtout pour les débutants » : +10 % (Forza Horizon 5), +31 % (Shadow of the Tomb Raider), −33 % de latence (Starfield). Marketing : Baldur's Gate 3 en 4K 88 → 225 FPS (« 2,6x »).
- Overlay **Ctrl+Maj+O** : FPS, temps d'image, 99e centile, **taux de saccades**, GPU, puissance, températures, VRAM, CPU, RAM ; jauge et/ou graphique par mesure ; 4 coins ou X/Y ; transparence ; échantillonnage 0,25 à 5 s. Le plus complet du panel.
- Plaintes : **désactiver HYPR-RX ne remet pas la résolution d'avant** ; message « Default Radeon WattMan settings have been restored » ; affaire **Anti-Lag+** : Valve avertit d'un risque de bannissement VAC dans CS2, AMD retire le pilote, Valve annule les bans.
- **Idée** : gros interrupteur « Optimiser pour ce jeu » avec profils « Performance » et « Silence/Économie » ; mémoriser l'état exact d'avant ; dire quels réglages sont sans risque pour l'anti-triche.

### Intel Graphics Software (ex-Arc Control)
- Renommé fin 2024 ; overlay arrivé tard (pilote 101.8801 bêta, mai 2026, Alt+Maj+O). Intel édite **PresentMon**, que Rago utilise déjà.
- Plaintes : la refonte a **retiré** enregistrement, replay, compteur de FPS en jeu. **Idée** : une refonte ne doit jamais retirer une fonction visible.

### MSI Center, MSI Afterburner et RivaTuner (RTSS)
- MSI Center : modules au choix ; **User Scenario** = « Extreme Performance », « Balance » (recommandé), « Silent », « Customize » ; pop-up Norton ; installation imposée de logiciels tiers ; remettre l'overclock à zéro avant de désinstaller, sinon BIOS. **Idée** : marquer un preset « Recommandé pour ton PC ».
- Afterburner + RTSS : référence des joueurs pour l'overlay (texte, graphe ou les deux, couleurs par groupe, éditeur hors jeu, F9 pour mesurer moyenne et 1 % low) ; OC Scanner de 15 min ; développeur russe non payé en 2022 puis projet repris. **Idée** : « texte + petite courbe » dans la barre en jeu, couleurs par famille, aperçu hors jeu.

### Overlay de performances de Steam (2025)
- Interrupteur dans Steam > Paramètres > En jeu ; coin au choix ; « Performance detail level » croissant ; **FPS générés (DLSS/FSR) affichés à côté des vrais FPS** (ex. 236 affichés pour 117 calculés sur Marvel Rivals). **Idée** : ne jamais gonfler un chiffre (« FPS réels ») ; niveaux d'affichage croissants.

### Samsung Magician
- Santé, température, usure ; **avertissement quand le disque est bridé par son port** ; code couleur bon/moyen/critique ; chatbot ; **benchmark avec historique** ; « the best OEM SSD management utility ». **Idée** : verdict par composant en mots simples et alerte « réglage qui bride le matériel » (RAM pas à sa vitesse, écran pas à sa fréquence max, mode Économie) ; historique des tests.

### ASUS Armoury Crate
- Onglets Device, Aura Sync, User center. **Installé par le BIOS via Windows** (ASUS publie comment le désactiver) ; désinstallation par un outil dédié ; faille **CVE-2025-3464** ; paquet de **4 Go** contre **G-Helper, « a single 5 MB file »** sans pub ni pistage. Lenovo Vantage cité pour ses pubs. **Idée** : prouver que Rago est léger, ne rien lancer ni réinstaller sans accord ; être « l'anti-Armoury Crate ».

### Razer Synapse 4 et Razer Cortex
- Synapse 4 (09/2024) : fils « Synapse 4 is hot garbage », « somehow worse than synapse 2 » ; **Synapse Web** sans logiciel résident. Cortex : Game Booster, System Booster, Booster Prime, **compte Razer ID obligatoire**, aucun chiffre de gain, module Game Deals. **Idée** : se distinguer par la preuve mesurée et l'absence d'inscription pour l'essai gratuit ; une refonte garde les repères et publie « ce qui a changé ».

### Logitech G HUB, SteelSeries GG, Corsair iCUE
- G HUB : **profil actif** affiché en haut ; profils par jeu ; bibliothèque de jeux (09/2025) ; plainte n° 1 : chargement infini au démarrage. **Idée** : afficher en permanence « Preset actif : Valorant » ; accueil immédiat.
- SteelSeries Sonar : **« 200+ Pro Presets »**, presets par jeu (CS2, Valorant, Rocket League), plus d'un million de presets partagés ; bénéfice en mots de joueur (« entendre les pas ») ; gratuit pour « ANY HEADSET - ANY MIC ». **Idée** : présenter les [[Presets]] par leur bénéfice, signés par un créateur partenaire quand c'est vrai, et à terme partagés par la communauté [[Discord]].
- Corsair iCUE (source ancienne, 3.31) : détection automatique, « Instant Lighting » sans profil ; installeur 382 Mo, plaintes « high CPU and RAM usage ». **Idée** : « Optimiser maintenant » sans choisir de jeu ni créer de profil.

### Microsoft PC Manager
- Accueil « PC Boost » + Health check, Process, Deep Cleaning, Startup ; affiche **mémoire utilisée et fichiers temporaires**, que Boost fait baisser ; Boost auto quand la mémoire est haute ou les fichiers temporaires dépassent 1 Go ; les « réparations » remettent Edge par défaut. **Idée** : « deux chiffres → un bouton → les mêmes chiffres après » pour Clean RAM et le nettoyage de la [[Page Outils]] ; déclenchement automatique par seuil en Premium.

### Windows 11 (Mode Jeu, page « À propos »), Xbox Game Bar
- Microsoft teste des **« spec cards »** (stockage, carte graphique, RAM, processeur) et une **FAQ en langage simple selon le matériel** (« 4 à 8 Go de RAM, est-ce que les applis modernes tourneront bien ? ») ; builds 26120.3576 / 22635.5090. Le Mode Jeu ne dit pas ce qu'il change ; presse contradictoire (« Xbox full screen experience frees 2 GB of RAM but doesn't boost FPS »).
- Game Bar (Win+G) : widget Performance, **épingle** au-dessus du jeu, clic sur une mesure = sa courbe ; demande un accès puis **un redémarrage** pour les FPS. **Idée** : la barre Alt+X et la pastille épinglée de Rago suivent ce modèle ; ajouter « clic = courbe des 60 dernières secondes » ; annoncer avant toute permission ou redémarrage.

### CapFrameX, HWiNFO, Speccy, CPU-Z
- CapFrameX : Capture → Analysis → Comparison → Report ; **saccade = temps d'image > 2,5 × la moyenne** ; PresentMon 2.6.0 dans la 1.9.1 ; **projet sponsorisé par Hone**. **Idée** : test avant/après guidé (60 s, application, remesure, 2-3 passages, médiane), barres FPS moyen, 1 % low, saccades.
- HWiNFO : freemium à limite de temps depuis la 7.0 (mars 2021) : mémoire partagée coupée après **12 heures** en gratuit ; « We don't live in communism and have to pay our bills ». **Idée** : freemium honnête, limite annoncée clairement.
- Speccy : page Summary ; Pro 19,95 $ à vie ; fiche brute mal comprise. **Idée** : une ligne par composant + un verdict + une action. CPU-Z : rien de lu.

## Synthèse de l'étude
**Ce qui marche** : un gros bouton qui regroupe des réglages obscurs (HYPR-RX, PC Boost, User Scenario) ; aperçu « actuel → recommandé » ; peu de profils nommés par l'effet, un seul « recommandé » ; chiffres avant/après lisibles ; specs traduites en conséquences ; overlay discret, dans un coin, à la carte ; honnêteté des chiffres (Steam) ; légèreté comme argument ; presets par jeu « signés ».

**Problèmes d'un débutant** : jargon ; boutons qui ne disent pas ce qu'ils font ; retour en arrière cassé ; poids, pubs, comptes, installations forcées ; outil qui dégrade (NVIDIA −2 à −12 %) ou met en danger (Anti-Lag+) ; friction au premier usage ; refontes qui retirent des fonctions ; fiabilité perçue.

**Les 8 idées classées** :
| # | Idée | Compréhension | Conversion |
|---|---|---|---|
| 1 | Accueil « Ton PC pour jouer » : une carte par composant, verdict + couleur (Bon / À surveiller / Bridé), phrase « ce que ça change pour tes jeux », alertes cliquables | très fort | fort |
| 2 | Gros bouton « Optimiser pour [jeu] » avec aperçu avant/après, 3 profils dont un « Recommandé », Premium visible avec cadenas | très fort | très fort |
| 3 | Test avant/après guidé (PresentMon, médiane) et historique | fort | très fort |
| 4 | Barre en jeu à niveaux (FPS seul → complet), unités, seuils colorés, courbe au clic, « FPS réels », aperçu hors jeu | fort | moyen |
| 5 | « Tout remettre comme avant » toujours visible, instantané daté | fort | fort |
| 6 | Transparence et légèreté affichées (conso de Rago, pas de démarrage auto sans accord, pas de pub, mention anti-triche par tweak) | moyen | fort |
| 7 | Bascule automatique du preset au lancement du jeu, bandeau « Preset actif » | moyen | moyen |
| 8 | Optimisation automatique par seuil (Clean RAM à 85 %) | faible | moyen |

## Ce que Rago en a fait (au 10/11)
- Idées 1 et 3 : l'[[Analyse du PC]] de la [[Version 1.3.0]] mesure en 5 étapes et montre valeur, norme et qui règle chaque point, avec un avant/après ; la saccade y est définie comme une image de plus de 2,5 fois la médiane et de plus de 20 ms (`fps.rs`), proche de la définition de CapFrameX. CONFIRMÉ par le vault.
- La [[Barre en jeu]] (Alt+X et pastille) existait déjà avant l'étude.
- Les autres idées : pas reprises à notre connaissance (À VÉRIFIER si l'une est prévue).

## Les 8 sources les plus utiles (selon l'étude)
Doc AMD de l'overlay (DH3-038) ; Neowin sur la page « À propos » de Windows 11 ; PCWorld sur la NVIDIA App ; Pokde sur HYPR-RX ; Windows Central sur PC Manager ; Tom's Hardware sur la perte de FPS de l'app NVIDIA ; README de CapFrameX ; Notebookcheck sur les alternatives à Armoury Crate. Adresses dans le fichier source.

Limites écrites : Armoury Crate (seules les plaintes), CPU-Z, iCUE (source ancienne), SteelSeries GG (Sonar seul), G HUB, Synapse 4 et l'accueil d'Intel peu documentés ; aucun test sur machine ; un titre de fil prouve une plainte, pas sa fréquence.
