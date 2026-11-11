---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/SessionCard.tsx
lignes: 101
maj: 2026-11-11
---
# SessionCard.tsx

Ce que l'app fait **pendant une partie** : la carte des paramètres (carte graphique performante, mode Performances élevées, vérifications), le crochet qui suit la partie en cours, et le bloc « À vérifier » réutilisé par la barre en jeu et la bibliothèque. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Pendant la partie]]. Côté Rust : [[session.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `SessionChecks({ session, t })` | bloc « ce que Rago a fait et conseille » ; rien si pas de partie, ou ni mode Performances ni vérification. Ligne verte « Performances élevées pendant la partie » si `power` ; puis « À vérifier » et une ligne orange par vérification : batterie (« Ton PC est sur batterie : branche-le… »), téléchargement (« Téléchargement en fond ({applis})… »), synchronisation (« Synchronisation en fond ({applis})… »), enregistrement (« Logiciel d'enregistrement ouvert ({applis})… »). `t` est passé en paramètre pour servir aussi dans la barre en jeu, qui n'a pas de store. |
| `useSession()` | `api.sessionState()` puis abonnement à l'événement `games:session` ; renvoie l'état ou `null` |
| `SessionCard()` | carte « Pendant la partie » des paramètres |

## Fonctionnement détaillé de la carte
- Lit les préférences par `api.backgroundGet()` ; rien n'est affiché avant.
- Texte : « Rago le fait au lancement d'un jeu et le défait à la fin, tant qu'il est ouvert ou près de l'horloge. »
- Trois interrupteurs, enregistrés par `api.sessionSetPrefs(gpu, power, checks)` (mise à jour optimiste, relecture en cas d'erreur) :
  1. **« Carte graphique performante pour les jeux »** (`gameGpu`) : sur un PC à deux cartes, chaque jeu reçoit la carte la plus puissante dans les réglages de Windows, à partir de son lancement suivant ; « Jeux réglés jusqu'ici : {n}. ». PC à une seule carte (`multiGpu === false`) : interrupteur grisé et « Ton PC n'a qu'une carte graphique : rien à faire ici. »
  2. **« Mode Performances élevées le temps de jouer »** (`gamePower`) : depuis Équilibré ou Économie d'énergie, sur secteur seulement ; le mode revient à la fin. Ryzen X3D à deux CCD (`x3d`) : interrupteur grisé et « Ton Ryzen X3D garde le mode Équilibré : AMD le demande pour que le jeu reste sur les cœurs à cache 3D. »
  3. **« Vérifications au lancement d'un jeu »** (`gameChecks`) : batterie, téléchargements, synchronisation et enregistrement en fond, signalés dans la barre en jeu et la bibliothèque. « Rien n'est fermé. »

## Liens avec le reste
- Monté par [[Settings.tsx]] ; `SessionChecks` et `useSession` utilisés par [[Overlay.tsx]] et [[Games.tsx]].
- [[api.ts]] (`sessionState`, `sessionSetPrefs`, `onSession`, `backgroundGet`) ; [[session.rs]], [[background.rs]].
- Fonctionnalités : [[Barre en jeu]], [[Bibliothèque de jeux]].

## Conseils au lancement du jeu (PR #91, 11/11, pas encore dans `staging`)
- L'interrupteur `gameChecks` s'appelle « **Conseils au lancement d'un jeu** » : « Réglages du jeu conseillés par les pros, applis gourmandes, fréquence de l'écran, batterie, téléchargements et synchronisation en fond : un rappel en haut à gauche au lancement, puis le détail dans la barre en jeu et la bibliothèque. Rien n'est changé ni fermé. » ([[Conseils au lancement du jeu]]).
- Nouvelles lignes de « À vérifier » : fond d'écran animé (« Fond d'écran animé ouvert ({applis}) : dans ses réglages de performance, mets « Other application fullscreen » sur « Stop (free memory) »… »), écran (« Ton écran tourne à {cur} Hz alors qu'il peut monter à {max} Hz… »), Game DVR (renvoie au réglage gratuit « Couper Game DVR »), processeur (« Gros consommateur de processeur en fond ({applis})… ») et mémoire (« Ta mémoire est presque pleine. Ce qui en prend le plus : {applis}… »).
- `line()` passe `cur` et `max` (les deux valeurs de `refresh`) et, pour `ram` sans appli à nommer, utilise la phrase sans liste (`session.check.ramBare`).
