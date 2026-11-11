---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/SessionCard.tsx
lignes: 113
maj: 2026-11-11
---
# SessionCard.tsx

Ce que l'app fait **pendant une partie** : la carte des paramètres (carte graphique performante, mode Performances élevées, jeu en priorité haute, vérifications), le crochet qui suit la partie en cours, et le bloc « À vérifier » réutilisé par la barre en jeu et la bibliothèque. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Pendant la partie]]. Côté Rust : [[session.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `SessionChecks({ session, t })` | bloc « ce que Rago a fait et conseille » ; rien si pas de partie, ou ni mode Performances ni vérification. Ligne verte « Performances élevées pendant la partie » si `power`, ligne verte « Jeu en priorité haute » si `priority > 0` (11/11) ; puis « À vérifier » et une ligne orange par vérification : batterie (« Ton PC est sur batterie : branche-le… »), téléchargement (« Téléchargement en fond ({applis})… »), synchronisation (« Synchronisation en fond ({applis})… »), enregistrement (« Logiciel d'enregistrement ouvert ({applis})… »). `t` est passé en paramètre pour servir aussi dans la barre en jeu, qui n'a pas de store. |
| `useSession()` | `api.sessionState()` puis abonnement à l'événement `games:session` ; renvoie l'état ou `null` |
| `SessionCard()` | carte « Pendant la partie » des paramètres |

## Fonctionnement détaillé de la carte
- Lit les préférences par `api.backgroundGet()` ; rien n'est affiché avant.
- Texte : « Rago le fait au lancement d'un jeu et le défait à la fin, tant qu'il est ouvert ou près de l'horloge. »
- Quatre interrupteurs, enregistrés par `api.sessionSetPrefs(gpu, power, checks, priority)` (mise à jour optimiste, relecture en cas d'erreur) :
  1. **« Carte graphique performante pour les jeux »** (`gameGpu`) : sur un PC à deux cartes, chaque jeu reçoit la carte la plus puissante dans les réglages de Windows, à partir de son lancement suivant ; « Jeux réglés jusqu'ici : {n}. ». PC à une seule carte (`multiGpu === false`) : interrupteur grisé et « Ton PC n'a qu'une carte graphique : rien à faire ici. »
  2. **« Mode Performances élevées le temps de jouer »** (`gamePower`) : depuis Équilibré ou Économie d'énergie, sur secteur seulement ; le mode revient à la fin. Ryzen X3D à deux CCD (`x3d`) : interrupteur grisé et « Ton Ryzen X3D garde le mode Équilibré : AMD le demande pour que le jeu reste sur les cœurs à cache 3D. »
  3. **« Jeu en priorité haute »** (`gamePriority`, 11/11) : « Le jeu passe en priorité haute et Windows ne le bride plus quand tu changes de fenêtre. Seulement le temps de la partie : rien n'est gardé après. Les jeux protégés par leur anti-triche peuvent refuser. »
  4. **« Vérifications au lancement d'un jeu »** (`gameChecks`) : batterie, téléchargements, synchronisation et enregistrement en fond, signalés dans la barre en jeu et la bibliothèque. « Rien n'est fermé. »

## Liens avec le reste
- Monté par [[Settings.tsx]] ; `SessionChecks` et `useSession` utilisés par [[Overlay.tsx]] et [[Games.tsx]].
- [[api.ts]] (`sessionState`, `sessionSetPrefs`, `onSession`, `backgroundGet`) ; [[session.rs]], [[background.rs]].
- Fonctionnalités : [[Barre en jeu]], [[Bibliothèque de jeux]].
