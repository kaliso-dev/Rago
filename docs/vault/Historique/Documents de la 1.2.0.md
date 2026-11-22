---
type: historique
tags: [historique, version, 1.2]
source: /mnt/project-files/refonte-glass/
maj: 2026-11-10
---
# Documents de la 1.2.0

Résumé des 6 documents que Claude a écrits pour Sofiene pendant la fabrication de la [[Version 1.2.0]] (du 16 au 28/10). Ils sont dans le dossier partagé `refonte-glass/` ([[Sources]]).

**Statut : documents d'époque.** Ils décrivent la PR #58 avant sa fusion dans `staging` (28/10). Ce qui est vrai aujourd'hui est dans les notes des fonctionnalités (liens plus bas) et dans [[État actuel]]. Les chiffres de ces documents (7 réglages gratuits, 211 puis 230 réglages) sont ceux de l'époque : le plan gratuit actuel est dans [[Offres et prix]].

## Les 6 documents
| Fichier | Date | Ce qu'il contient |
|---|---|---|
| `BACKLOG_LINEAR.md` | 16/10 | les 8 idées de la colonne Backlog de [[Linear]], avant la refonte |
| `VERSION-1.2.0.md` | 18/10 | où trouver le premier exe 1.2.0, ce qui reste à faire, les tests |
| `OPTIMISATIONS-1.2.0.md` | 22/10 | le tri des fichiers d'optimisation envoyés par Sofiene le 21/10 |
| `NOUVEAUTES-1.2.0.md` | 27/10 | les 32 nouveautés, avec les retours de Sofiene du 22, du 25 et du 27/10 |
| `TESTS-1.2.0.md` | 28/10 | la liste de tests à faire sur Windows |
| `MISE-A-JOUR-AUTO-TEST.md` | 28/10 | le pas-à-pas pour tester la [[Mise à jour automatique]] |

À côté : des captures (`captures-1.2.0/`, `captures-audit/`, `captures-v3/`, 8 images de la [[Refonte glass]] et une maquette du tableau de bord), un dossier `installateur-test/` et les fichiers d'origine des optimisations (`optimisations-sources/`).

## Le backlog du 16/10
Huit idées, aucune développée à cette date :
- RAG-82 : une mini-barre en jeu, devenue la [[Barre en jeu]] ;
- RAG-24 : la mise à jour automatique ;
- RAG-48 : un bouton « Clean » pour la RAM, devenu « Clean RAM » de la [[Page Outils]] ;
- RAG-57 : lancer son jeu depuis l'app, devenu la [[Bibliothèque de jeux]] ;
- RAG-50 : le proxy, devenu Rago Route ([[Proxy]]) ;
- RAG-70 : un rapport pour le support et le partage de config ([[Partage et support]]) ;
- RAG-44 : l'export des presets ;
- RAG-33 : les étoiles des avis dans Google.

Le document notait que RAG-48 contredisait le texte du tableau de bord de l'époque (« Rago doesn't force-empty your RAM »).

## Les nouveautés (NOUVEAUTES-1.2.0)
- **Tableau de bord** : bouton « Appliquer les optimisations gratuites », presets par jeu (15 jeux), animation du logo au lancement, lien « Rejoindre le Discord ».
- **[[Presets]] enrichis** : par exemple, Minecraft PvP passe de 12 à 22 réglages et Latence minimale de 11 à 23.
- **Partage** : codes `RAGO2_`, nom du preset partagé, crayon pour modifier un preset.
- **[[Page Outils]]** : nettoyage gratuit (8 zones, sans toucher au Prefetch ni aux dossiers de Minecraft), applis préinstallées en Premium, pilotes en lecture seule.
- **[[Barre en jeu]]** : raccourci Alt+X (au lieu de Ctrl+Maj+R, qui pouvait ouvrir le Gestionnaire des tâches) ; souris libérée ; pastille FPS et ping qui attend 10 s ; ping mesuré sur le vrai serveur de la partie (« ≈ » quand il est estimé).
- **Bibliothèque** : 16 launchers reconnus ; une seule tuile pour Minecraft Java, avec « Lancer avec ».
- **Réseau en un seul onglet** : Optimisations, [[Packet Optimizer]] (d'abord appelé « Network Optimizer ») et [[Test réseau]] ; « Analyser mon PC » choisit un profil d'après 40 pings ; « Réglages experts » en Auto ou Manuel.
- **Le 27/10, nouveaux noms dans le Packet Optimizer** : les noms qui ressemblaient à un autre logiciel sont remplacés par des noms qui disent ce que fait le réglage (par exemple « Smart Packets » devient « Priorité au trafic du jeu (QoS) »).
- **Autres** : état des services sous [[RBW Mod]], [[Mode jeu]] renforcé, démarrage avec Windows activé d'office.

## Les optimisations (OPTIMISATIONS-1.2.0)
- **Fichiers relus** : un relevé de Hone.gg, `OptiCore-Tweaks.ps1`, `Hone-Optimizations.ps1`, `network_optimizer.bat` et `[RAGO APP] GAME V1.bat`. Claude a comparé ce que chaque réglage écrit vraiment dans Windows, pas son nom.
- **Résultat** : 19 réglages ajoutés, dont la section « Interface et confort » (12 réglages), et une dizaine de réglages existants corrigés. Exemples : `HwSchedMode` écrit à la place de `HwSchMode`, le seul nom que Windows lit ; un délai TCP de 2 000 ms au lieu de 1 000.
- **Catalogue** : il passe de 211 à 230 réglages (218 distincts, voir [[Catalogue des tweaks]]).
- **Écartés** :
  - tout ce qui touche à la sécurité (Defender, SmartScreen, contrôle de compte, TPM…) ;
  - ce qui casse un usage (Xbox, VPN, Wi-Fi) ;
  - la coupure de SysMain ;
  - ce que lit le vérificateur RBW ;
  - les placebos.
- **GAME V1 devient [[Pendant la partie]]** : carte graphique performante, mode Performances élevées le temps de jouer, vérifications (batterie, téléchargements, OBS). Le tout est gratuit et activé d'office.
- **Pas fait** : les préréglages graphiques écrits dans les fichiers des jeux.

## Les tests (TESTS-1.2.0 et VERSION-1.2.0)
- Le 28/10, beaucoup de points étaient marqués « jamais testé sur Windows » : barre en jeu, bibliothèque, Outils, RBW Mod, Packet Optimizer, démarrage avec Windows.
- Il fallait installer la 1.2.0 par-dessus la 1.1.14, comme le ferait un joueur.
- La suite : Sofiene a dit « tout fonctionne » le 29/10 ([[Version 1.2.0]]).

## La mise à jour automatique (MISE-A-JOUR-AUTO-TEST)
Le pas-à-pas en cinq étapes :
1. créer la clé de signature des mises à jour ;
2. la donner à GitHub : `TAURI_SIGNING_PRIVATE_KEY` et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` en secrets, `RAGO_UPDATER_PUBKEY` en variable ;
3. préparer le serveur de test ;
4. fabriquer une 1.2.0 et une 1.2.1 de test ;
5. vérifier « Redémarrer », la mise à jour à la fermeture et le frein `UPDATE_PAUSED`.

La règle qui compte reste : **une clé perdue, ou recréée, empêche toutes les apps installées de se mettre à jour seules** ([[Clés et secrets]]).
