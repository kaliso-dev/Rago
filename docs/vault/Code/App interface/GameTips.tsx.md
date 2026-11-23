---
type: code
tags: [code, app, typescript, react, jeux, conseils]
fichier: app/src/components/GameTips.tsx
lignes: 96
maj: 2026-11-24
---
# GameTips.tsx

Le bloc **« Réglages conseillés pour <jeu> »** des [[Conseils au lancement du jeu]] : la liste des réglages à changer dans le jeu, chacun avec sa valeur, sa catégorie, la raison et une case « Marquer comme fait ». Utilisé seulement dans la barre en jeu ([[Overlay.tsx]]). Fiche parente : [[Code de l'app (interface)]].

**Fichier ajouté le 11/11 par la PR #91 (fusionnée dans `staging` le 11/11 par la PR #92), refait sur la maquette v5 `app-ingame` (bloc `.igtp`) par la PR #PRX du 24/11.** Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #PRX, 24/11).

## Ce que le fichier expose
- `GameTips({ game, t, lang, open = true })` :
  - `game` : clé du jeu (`valorant`, `fortnite`…) ; rien n'est affiché si le jeu n'a pas de réglages ([[tips.ts]] `tipsFor`) ;
  - `t` et `lang` passés en paramètre, comme `SessionChecks` ([[SessionCard.tsx]]) : la barre en jeu n'a pas de store ;
  - `open` : bloc ouvert au départ ou replié ;
  - seulement les **3** premiers réglages (`FIRST`), le reste au clic.
- Styles : ceux de la maquette (`s5/pages/ingame.css`, chargés par la barre en jeu).

## Fonctionnement détaillé
- **En-tête** (bouton qui ouvre ou replie, `aria-expanded`) : ampoule, « Réglages conseillés pour {game} » (nom du jeu de [[tips.json]]), compteur « {n} à faire » en rouge ou « Tout est fait » en vert, chevron (tourné quand le bloc est replié).
- **Ouvert** :
  - la liste des réglages **pas encore faits** (tous avec « Voir les faits ») : case à cocher (`role="checkbox"`, titre « Marquer comme fait » ou « Marquer comme pas fait »), nom du réglage → valeur dans la langue de l'app, puce de catégorie (`tips.tag.*` : Visibilité, Latence, FPS, Construction, Visée), phrase « pourquoi ». Un réglage fait a sa case rouge cochée et son texte à moitié effacé ;
  - pied : « voir 1 autre réglage » / « voir les {n} autres réglages », « D'après » et les sources (chacune ouvre son adresse par `api.openUrl`), puis « voir les faits ({n}) » / « masquer les faits » s'il y en a (liens soulignés de rouge ; première lettre en minuscule, comme la maquette).
- Cocher appelle `mark(id, fait)` de `useTipsDone` ([[tips.ts]]) : la case change tout de suite, le moteur enregistre ([[tips.rs]]), et l'autre fenêtre suit par l'événement `tips:done`.
- Les noms des réglages et leurs valeurs viennent du jeu en anglais (comme dans ses menus) ; la valeur et la raison sont traduites (`value.fr`, `why.fr`).

## Liens avec le reste
- Monté par [[Overlay.tsx]] (ouvert s'il reste des réglages, dans la colonne « This game » qui défile). Plus monté par [[Games.tsx]] depuis le 23/11 (page refaite sur la maquette v5, qui n'a pas ce bloc).
- Textes : clés `tips.*` de [[i18n.ts]]. Styles : `s5/pages/ingame.css` et `s5/overlay.css` ([[Maquettes v5 dans l'app (s5)]]). Données : [[tips.json]] par [[tips.ts]].

## À savoir avant de modifier
- Garder `t` et `lang` en paramètres : le composant doit marcher sans store (barre en jeu).
- Ne rien appliquer dans le jeu depuis ce bloc : Rago ne lit ni n'écrit les réglages des jeux ; la case dit seulement « fait » au moteur.
