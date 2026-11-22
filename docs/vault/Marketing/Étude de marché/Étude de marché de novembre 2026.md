---
type: carte
tags: [marketing, étude, concurrence, carte]
source: /mnt/project-files/etude-marche-2026-11/
maj: 2026-11-10
---
# Étude de marché de novembre 2026

Carte de l'étude du marché faite le **03/11/2026** par des sous-agents de recherche Claude pour Sofiene : 7 études, une adresse par fait. **Statut : OBSERVÉ** (recherche web, aucune app installée ni testée, rien revérifié depuis). Retour à [[Marketing]]. Voir aussi [[Offres et prix]], [[Analyse du PC]], [[Version 1.3.0]], [[Décisions]].

## D'où elle vient
- Dossier partagé `etude-marche-2026-11/` ([[Sources]]) : `LISEZMOI.txt` + 7 fichiers Markdown (423 Ko en tout, tous datés du 04/11 à 20:32).
- Elle a été faite pour la **refonte de l'interface** prévue avec la nouvelle charte (« Affiche ») et les maquettes de la nouvelle app. Ce projet a été **abandonné le 04/11** (« on abandonne ce projet », [[Décisions]]) ; l'étude a été **gardée** ce jour-là, avec les fonctions de la dernière maquette (analyse du PC, avant/après, fenêtre Premium avec les prix, résiliation dans l'app), construites dans la [[Version 1.3.0]].
- Elle est citée dans le rapport « Rago : le marché et la nouvelle app » (artefact Claude `https://claude.ai/artifact/KZxPCg5FGccdNi3emDhFQv`). Fonctions de la dernière maquette : `https://claude.ai/artifact/FctyEs8W16brio5HpebUxc` (LISEZMOI).

## But
Comprendre comment les apps que les joueurs connaissent présentent leurs réglages, leurs mesures et leur offre payante, pour que Rago soit compris par **un joueur qui ne connaît rien aux optimisations** et **convertisse honnêtement** les gratuits en Premium, sans tomber dans ce que les autorités et les antivirus sanctionnent.

## Méthode (commune aux 7 études)
- Lecture de pages publiques (sites des éditeurs, presse, Trustpilot, Overwolf, forums, FTC, EUR-Lex, Microsoft), avec un code de fiabilité : lu dans la source, titre seul, ou de mémoire (« non vérifié »).
- Une grille fixe par app (disposition, premier lancement, un clic ou expert, compréhension, jauges, preuve du gain, sécurité et retour arrière, argent, ce qui marche, plaintes, idée pour Rago).
- **Limites écrites dans chaque étude** : quotas partagés entre agents (100 lectures de pages par heure, 200 recherches par tour) épuisés en cours de route ; les études 6 et 7 n'ont pu faire **aucune recherche** et ont lu des adresses connues ; aucune app installée (pas de Windows) ; avis Trustpilot non représentatifs. Les faits « non vérifié » ne doivent pas être cités en public sans relecture.
- Écart relevé à l'époque par les études : le brief disait 15 tweaks gratuits, le vault 11 ; réglé depuis (73 réglages gratuits dont 30 actifs dans la 1.3.0, [[Offres et prix]]).

## Les 7 études
| N° | Fichier | Note | Sujet en une ligne |
|---|---|---|---|
| 1 | `1-optimiseurs.md` (51 Ko) | [[Étude - Optimiseurs concurrents]] | 24 optimiseurs : Hone, Razer Cortex, IObit, CCleaner, Restoro, outils gratuits, packs de créateurs ; tableau comparatif et 10 idées |
| 2 | `2-reseau.md` (46 Ko) | [[Étude - Outils réseau et ping]] | 15 outils réseau (ExitLag, WTFast, GearUP, cFosSpeed, TCP Optimizer, Waveform, Cloudflare…) + stats des jeux ; boosters de route contre réglages locaux |
| 3 | `3-constructeurs.md` (71 Ko) | [[Étude - Apps de constructeurs et overlays]] | NVIDIA App, AMD HYPR-RX, MSI, Armoury Crate, Steam, Game Bar, CapFrameX, HWiNFO… : accueil, overlays, avant/après |
| 4 | `4-compagnons.md` (53 Ko) | [[Étude - Apps compagnons]] | Blitz, Mobalytics, Porofessor, Outplayed, Medal, Tracker.gg, **Lunar Client**, Badlion, Discord Nitro… : freemium, statut, ton |
| 5 | `5-conversion.md` (64 Ko) | [[Étude - Convertir honnêtement]] | taux de conversion, essais, essai inversé, ancrage des prix ; FTC, Microsoft Defender, règles UE et France |
| 6 | `6-verrous-pc-gaming.md` (66 Ko) | [[Étude - Verrous du gratuit]] | comment 19 outils PC et gaming verrouillent le gratuit (CCleaner, IObit, Avast, Norton, Malwarebytes, Process Lasso…) |
| 7 | `7-closing-marques.md` (72 Ko) | [[Étude - Closing des marques]] | comment les grandes marques ferment la vente (Grammarly, Discord, NordVPN, Game Pass, Adobe, Epic) ; Rago écran par écran |

## Conclusions principales (communes aux 7 études)
1. **L'avant/après mesuré sur le PC du joueur est un espace libre** : aucun concurrent lu ne mesure lui-même le gain sur la machine de l'utilisateur (Avast et AVG reprennent un test de labo de 2019, CCleaner un test de 2021). C'est l'argument le plus fort et le plus honnête de Rago.
2. **La ligne rouge est nette et sanctionnée** : FTC contre Restoro et Reimage (26 M$, 14/03/2024) pour des analyses qui trouvent toujours des problèmes ; Microsoft Defender supprime depuis le 01/03/2018 les « cleaner or optimizer applications » aux affirmations exagérées ; CCleaner classé PUA en 2020 pour ses offres groupées ; Avast 16,5 M$ (données revendues) ; Adobe et Epic pour leurs abonnements et boutons d'achat. Une détection Defender tuerait la distribution de l'app.
3. **Le modèle qui convient à Rago** : le manuel et la mesure gratuits, l'automatique et le « pendant la partie » payants (Advanced SystemCare, CCleaner, Process Lasso, Malwarebytes). Le gratuit doit produire un effet visible, sinon avis « too paid to win » (Hone).
4. **Prix** : Rago est bas (5,99 $/mois contre « about $5–15 a month » chez les optimiseurs joueurs ; 22 % sous la médiane annuelle et 54 % sous la médiane mensuelle des apps d'abonnement selon Adapty). Pas de culture de la remise ; le **même prix au renouvellement** est un argument face à Avast, Norton, CCleaner, NordVPN.
5. **Essai** : tout se joue le jour de l'installation (82 à 89 % des essais démarrent le jour 0) ; les études recommandaient un essai de **7 jours sans carte** (ou un essai inversé) pour un public jeune, avec rappel avant la fin.
6. **Confiance** : pas de pub, pas de logiciel groupé, légèreté prouvée, « Restore » toujours visible, chaque tweak expliqué et réversible, chiffres seulement mesurés, jamais « problèmes », « erreurs », « danger » pour des réglages normaux, jamais d'achat dans le flux du jeu, jamais « Ask your parents ».
7. **Réseau** : le [[Packet Optimizer]] agit sur la stabilité (gigue, pertes, latence sous charge), pas sur la route ; la route, c'est le rôle du [[Proxy]] (Rago Route).

## Ce qui était recommandé pour Rago, et ce qui a été décidé
| Recommandation des études | Décision ou état au 10/11 |
|---|---|
| Un seul bouton « Analyser mon PC », analyse complète et gratuite, sans note de « santé », qui sait dire « rien à régler » | Fait : [[Analyse du PC]] dans la [[Version 1.3.0]] (sans note globale, chaque point Free, Premium ou Do it yourself ; normes par joueur depuis le 10/11) |
| Avant/après mesuré, offre juste après | Avant/après dans l'Analyse du PC (1.3.0) ; place de l'offre : voir [[Abonnement dans l'app]] |
| Essai de 7 jours **sans carte**, ou essai inversé | **Autre choix de Sofiene** : essai de **3 jours avec carte**, débité sur le mensuel (04/11, 10/11), un par e-mail et par carte ([[Offres et prix]]) |
| Garantie de remboursement (14 ou 30 jours) | **Contraire à la décision du 10/11** : plus de remboursement, l'essai le remplace |
| Même prix au renouvellement, total facturé visible, résiliation simple | Même prix décidé (q40, 10/11) ; fenêtre Premium avec les prix et résiliation dans l'app (1.3.0) |
| Gratuit qui produit un effet visible (compenser « too paid to win ») | Plan gratuit élargi à 73 réglages dont 30 actifs (04/11, confirmé le 10/11) |
| Consentement clair dans l'app avant d'envoyer les résultats du [[Test réseau]] | Sofiene (10/11) : envoyé sans demander, mais « garder ce point avant de soumettre l'app à la signature » |
| Presets par jeu avec curseur, feu tricolore par tweak, page « Mes changements », bascule auto du preset, récap partageable, statut visible, codes cadeaux, pass 1 an, prix régionaux | Aucune décision connue (À VÉRIFIER si l'une est prévue) |

## Les rapports et artefacts liés
- Rapport « Rago : le marché et la nouvelle app » : `https://claude.ai/artifact/KZxPCg5FGccdNi3emDhFQv`.
- Fonctions de la dernière maquette : `https://claude.ai/artifact/FctyEs8W16brio5HpebUxc`.
- Ces deux artefacts n'ont pas été relus pour cette note (À VÉRIFIER s'ils sont toujours en ligne).
