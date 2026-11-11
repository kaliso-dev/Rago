---
type: code
tags: [code, app, typescript, react, jeux, conseils]
fichier: app/src/components/GameTips.tsx
lignes: 116
maj: 2026-11-11
---
# GameTips.tsx

Le bloc **« Réglages conseillés pour <jeu> »** des [[Conseils au lancement du jeu]] : la liste des réglages à changer dans le jeu, chacun avec sa valeur, sa catégorie, la raison et une case « Marquer comme fait ». Utilisé dans la barre en jeu ([[Overlay.tsx]]) et la bibliothèque ([[Games.tsx]]). Fiche parente : [[Code de l'app (interface)]].

**Fichier ajouté le 11/11 par la PR #91 (fusionnée dans `staging` le 11/11 par la PR #92).** Tout ce qui suit est CONFIRMÉ (code de `staging`, 11/11).

## Ce que le fichier expose
- `GameTips({ game, t, lang, open = true, compact = false, className })` :
  - `game` : clé du jeu (`valorant`, `fortnite`…) ; rien n'est affiché si le jeu n'a pas de réglages ([[tips.ts]] `tipsFor`) ;
  - `t` et `lang` passés en paramètre, comme `SessionChecks` ([[SessionCard.tsx]]) : la barre en jeu n'a pas de store ;
  - `open` : bloc ouvert au départ ou replié ;
  - `compact` (barre en jeu) : pas de phrase d'introduction, et seulement les **3** premiers réglages (`COMPACT`).
- Charge sa feuille de style `tips.css` lui-même (`import "../styles/tips.css"`), pour qu'elle soit dans les deux fenêtres ([[Styles de l'app (CSS)]]).

## Fonctionnement détaillé
- **En-tête** (bouton qui ouvre ou replie, `aria-expanded`) : ampoule, « Réglages conseillés pour {game} » (nom du jeu de [[tips.json]]), compteur « {n} à faire » ou « Tout est fait » (en vert), chevron.
- **Ouvert** :
  - en mode normal et s'il reste des réglages : « Les réglages que les pros et les guides conseillent, à changer dans le jeu. Coche ceux que tu as faits : Rago ne te les rappellera plus. » ;
  - la liste des réglages **pas encore faits** (tous avec « Voir les faits ») : case à cocher (`role="checkbox"`, titre « Marquer comme fait » ou « Marquer comme pas fait »), nom du réglage → valeur dans la langue de l'app, puce de catégorie (`tips.tag.*` : Visibilité, Latence, FPS, Construction, Visée), phrase « pourquoi ». Un réglage fait est barré ;
  - pied : « Voir 1 autre réglage » / « Voir les {n} autres réglages » (mode compact), « D'après » et les sources (chacune ouvre son adresse par `api.openUrl`), puis « Voir les faits ({n}) » / « Masquer les faits » s'il y en a.
- Cocher appelle `mark(id, fait)` de `useTipsDone` ([[tips.ts]]) : la case change tout de suite, le moteur enregistre ([[tips.rs]]), et l'autre fenêtre suit par l'événement `tips:done`.
- Les noms des réglages et leurs valeurs viennent du jeu en anglais (comme dans ses menus) ; la valeur et la raison sont traduites (`value.fr`, `why.fr`).

## Liens avec le reste
- Monté par [[Overlay.tsx]] (`compact`, ouvert s'il reste des réglages, dans le bloc `.ov-advice` qui défile) et [[Games.tsx]] (sous le jeu en avant, ouvert si le jeu tourne, `key` = jeu + en cours, pour se rouvrir au lancement).
- Textes : clés `tips.*` de [[i18n.ts]]. Styles : `tips.css` ([[Styles de l'app (CSS)]]). Données : [[tips.json]] par [[tips.ts]].

## À savoir avant de modifier
- Garder `t` et `lang` en paramètres : le composant doit marcher sans store (barre en jeu).
- Ne rien appliquer dans le jeu depuis ce bloc : Rago ne lit ni n'écrit les réglages des jeux ; la case dit seulement « fait » au moteur.
