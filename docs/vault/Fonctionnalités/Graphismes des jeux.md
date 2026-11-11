---
type: fonctionnalité
tags: [fonctionnalité, app, jeux, graphismes]
version_app: 1.3.0
maj: 2026-11-11
---
# Graphismes des jeux

Carte **« Graphismes du jeu »** de la page « Jeux », sous la carte du jeu choisi : comme le préréglage OptiFine de Minecraft, **trois niveaux en un clic**, écrits dans les réglages du jeu lui-même. Demandée par Sofiene le 11/11/2026 (feature 3 de son message : « Tu vois l'optimization Optifine dans Minecraft […] Il faut la meme pour tout les jeux valorant fortnite csgo etc etc, avec un choix qualité max, un choix le plus utiliser et optimiser entre performance et agreabilité et enfin le settings avec tout au plus bas »). Code : [[gamecfg.rs]] (moteur), [[GameGraphics.tsx]] (carte), [[graphics.ts]] (textes). Page : [[Bibliothèque de jeux]].

**Statut (11/11)** : codée sur la branche `claude/project-thread-5ln7f8` (partie de `staging`), **PR #94 vers `staging`** ouverte le 11/11 sur la demande de Sofiene (« Push toutes les modification vers stagging pour que je puisse test la version test »), à fusionner avec les autres nouveautés du 11/11 par le fil « Passer les 6 features sur staging », pas encore fusionnée ; à sortir après la grosse sortie en cours ([[Version 1.3.0]]). **Jamais testée sur Windows** ([[Règles de travail]]) : les clés de Valorant, Fortnite et Apex viennent de fichiers publiés par des joueurs, pas d'une documentation des éditeurs. **Gratuit ou Premium : À DÉCIDER** par Sofiene (q94 sur la page « Questions du vault Rago », 11/11 ; pour l'instant le code la laisse gratuite, sans verrou). Ticket [[Linear]] : RAG-92 (« In Review »).

## Les trois niveaux
| Niveau (app en anglais) | Sous-titre | Idée |
|---|---|---|
| **Performance** | « Everything at its lowest, max FPS » | tout au plus bas |
| **Équilibré** (Balanced) | « What most competitive players use » | le réglage des joueurs compétitifs : image lisible, FPS hauts |
| **Qualité** (Quality) | « Everything at its highest, best looks » | tout au plus haut |

Chaque niveau affiche aussi ce qu'il change pour ce jeu (une phrase par jeu et par niveau, [[graphics.ts]]). Le niveau actuel est reconnu en relisant les fichiers (puce « Actuel : … ») ; si les réglages ne correspondent à aucun niveau : « Tes propres réglages ».

## Les jeux (6)
Reconnus par le preset du jeu dans la bibliothèque ([[Presets]]) : `game_valorant`, `game_fortnite`, `game_cs2`, `game_apex`, `game_rivals`, `game_finals`. Les autres jeux n'ont pas la carte. Minecraft Java garde son préréglage OptiFine (Performance / Qualité) dans la page Minecraft ([[minecraft.rs]]).

| Jeu | Fichier (dans chaque compte Windows) | Ce que Rago écrit | Sûreté des clés |
|---|---|---|---|
| Valorant | `%LOCALAPPDATA%\VALORANT\Saved\Config\<compte>\Windows\GameUserSettings.ini` (un dossier par compte Riot) et `Config\Windows\` | 8 groupes de qualité `sg.*` (0 bas → 3), `bUseVSync` | dossier et clés vus dans des fichiers publiés et dans l'outil ValorantForceLowSettings ; correspondance exacte avec les menus du jeu À VÉRIFIER |
| Fortnite | `%LOCALAPPDATA%\FortniteGame\Saved\Config\WindowsClient\GameUserSettings.ini` | mode de rendu `[D3DRHIPreference]` (`dx11` + `es31` = mode Performance, `dx12` + `sm6` = DirectX 12), `MeshQuality`, 10 groupes `sg.*`, herbe, flou, Nanite, ray tracing, V-Sync | sections et clés vues dans un fichier de joueur et dans FortniteSettingsManager ; `dx12`/`sm6` déduits, À VÉRIFIER |
| Counter-Strike 2 | `Steam\userdata\<compte>\730\local\cfg\cs2_video.txt` (un par compte Steam) | `Autoconfig` 2 (préréglage perso), shaders, filtrage, MSAA, ombres, textures, particules, occlusion, HDR, FSR, V-Sync | clés et valeurs vues dans des fichiers réels et le script d'AveYo ; MSAA 8x non vu, À VÉRIFIER |
| Apex Legends | `%USERPROFILE%\Saved Games\Respawn\Apex\local\videoconfig.txt` | anti-crénelage, budget de textures, filtrage, occlusion, ombres du soleil, lumière volumétrique, ombres des lampes, détail des modèles, effets, impacts, corps, V-Sync, résolution adaptative | clés d'un fichier réel ; correspondance avec les menus tirée d'un guide, la moins sûre des six, À VÉRIFIER |
| Marvel Rivals | `%LOCALAPPDATA%\Marvel\Saved\Config\*\GameUserSettings.ini` | 10 groupes `sg.*` standard d'Unreal Engine, V-Sync | dossier de mémoire (très cité pour les réglages Engine.ini), À VÉRIFIER |
| The Finals | `%LOCALAPPDATA%\Discovery\Saved\Config\*\GameUserSettings.ini` | idem | idem, À VÉRIFIER |

Valeurs exactes de chaque niveau : [[gamecfg.rs]]. Pas touché : les options du compte Riot de Valorant (vignette, bloom, distorsion dans `RiotUserSettings.ini`, synchronisé avec le compte), le NVIDIA Reflex, la résolution et le mode d'affichage.

## Règles de sûreté (code)
- **Seulement les clés que le jeu a déjà écrites** : Rago n'ajoute jamais une clé inconnue, sauf le mode de rendu de Fortnite (section standard d'Unreal Engine que le jeu n'écrit pas toujours). Un fichier sans aucune clé connue n'est pas touché (« doesn't look as expected »).
- **Jeu fermé seulement** : il réécrit ses réglages en quittant. Exes surveillés par jeu ([[gamecfg.rs]]) ; la carte est grisée pendant la partie.
- **Copie d'origine** `<fichier>.rago-original` gardée à côté avant la première écriture, jamais remplacée par un deuxième niveau ; **« Restore my settings »** la remet et la supprime.
- **Lecture seule respectée** : un fichier verrouillé par le joueur (souvent pour une résolution étirée) n'est pas touché ; l'app le dit.
- **Aucune clé de résolution ni d'affichage** : elles sont au fil « saturation et résolution des pros » (module `display.rs`, en cours sur la branche `claude/project-thread-7n0ikn`) ; un test du code le garantit.
- Tous les comptes Windows du PC sont regardés (Rago tourne en administrateur, parfois avec un autre compte), et tous les comptes du jeu (Riot, Steam).
- Jeu jamais lancé : « Couldn't find …'s settings. Start the game once, then come back. »
- La [[Remise à zéro]] (fin de licence, « Tout annuler », désinstallation) ne touche pas ces fichiers : seul « Restore my settings » les remet. Les copies `.rago-original` restent dans les dossiers des jeux après une désinstallation de Rago.

## Recherche du 11/11 (sources)
- Valorant : fichiers `GameUserSettings.ini` et `RiotUserSettings.ini` publiés (dépôt GitHub JoShMiQueL/VALORANT-CONFIG, gist tioxy), outil SteffenCarlsen/ValorantForceLowSettings (tous les `sg.*` à 0 dans `Config\<compte>\Windows`), guide de Riot (réglages à baisser pour les FPS), Dignitas (réglages compétitifs).
- Fortnite : fichier d'un joueur sur gamingcfg (sections `[ScalabilityGroups]`, `[D3DRHIPreference]` `PreferredRHI=dx11` `PreferredFeatureLevel=es31`, `[PerformanceMode]` `MeshQuality`), script N0madical/FortniteSettingsManager (ne réécrit que les clés existantes : même règle que Rago).
- CS2 : script `cs2_persistent_settings.bat` d'AveYo (valeurs commentées : ombres 0/1/2, textures 0/1/2, filtrage, HDR 3 ou -1, Reflex), fichier réel gucu112, guide csdb.gg (réglages des pros : ombres hautes, Boost Player Contrast, le reste bas).
- Apex : fichier réel (V3nilla), guide note.com de 2026 (correspondance clé → menu), esportstales.
- Le fil n'a pas pu lire de vrai fichier sur un PC de Sofiene (Mac hors ligne ; le seul Windows relié est celui d'Abel).

## À faire
- **Test sur Windows par Sofiene** : pour chaque jeu, choisir un niveau, lancer le jeu, regarder le menu Vidéo ; puis « Restore my settings ».
- PR #94 : fusion dans `staging` pour la version test (11/11).
- Gratuit ou Premium (q94). Si Premium : verrou à ajouter côté Rust et dans la carte.
- Plus tard : PUBG, Overwatch 2, Rainbow Six Siege, Rocket League, Roblox (formats différents, pas encore faits) ; Minecraft Java dans la même carte (OptiFine, un troisième niveau « Équilibré »).
