---
type: code
tags: [code, app, typescript, analyse]
fichier: app/src/lib/analysis.ts
lignes: 276
maj: 2026-11-10
---
# analysis.ts

La logique d'**« Analyze my PC »** (1.3.0) : mesurer ce qui ralentit le PC en jeu, comparer chaque valeur à une norme (personnalisée pour le réseau), dire ce qui la règle (plan gratuit, Premium ou le joueur lui-même), et garder un **avant/après** sur ce PC. Aucun affichage ici : la page est [[Analysis.tsx]]. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Analyse du PC]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Appelle [[api.ts]] (`analysisFacts`, `toolsDrivers`, `netTest`, `liveStats`), donc côté Rust [[analysis.rs]], [[tools.rs]], [[nettest.rs]], [[stats.rs]].
- [[store.tsx]] appelle `markChanged()` à la fin de chaque lot réussi ; [[SubscriptionCard.tsx]] appelle `lastGain()` pour l'écran de résiliation ; [[Analysis.tsx]] utilise tout le reste.
- Choix écrits en tête du fichier : **pas de note de santé** (un PC bien réglé voit « things are fine ») ; les mesures **restent sur ce PC** (stockage du navigateur de l'app) ; les normes réseau sont **propres à chaque joueur** (Sofiene, 10/11 : « personnalisé en fonction de chaque utilisateur »), pour qu'un joueur loin des serveurs ne voie pas tout « au-dessus de la normale ». Les autres normes viennent de la maquette de l'app.

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `Values` | une analyse : `at`, `server`, `ping`, `jitter`, `loss` (0–1), `spikes`, `wired`, `refresh`, `refreshMax`, `fps`, `low1`, `stutters`, `cpuIdle`, `processes`, `memSpeed`, `memRated`, `gameDvr`, `notifications`, `powerSaving`, `background` (noms d'applis), `driverDays` ; `null` = pas mesuré |
| `Group` | `network`, `fps`, `system`, `windows` |
| `Fix` | `{ kind: "free", tweaks }`, `{ kind: "premium", module: "netopt" \| "latency" }`, `{ kind: "diy", how }` (clé de texte), `{ kind: "none" }` |
| `Finding` | un point trouvé : `id`, `group`, `value` (texte ou clé `pa.v.*`), `norm` (clé `pa.norm.*`), `vars`, `issue`, `fix` |
| `STEPS` / `Step` | les **6 étapes** : `hardware`, `windows`, `drivers`, `network`, `system`, `match` |
| `analyze(onStep)` | lance l'analyse (une vingtaine de secondes) |
| `Past`, `netNorms(v, past?)` | habitude réseau et seuils personnalisés |
| `findings(v)` | liste des points, dans l'ordre des groupes |
| `saved()`, `history()`, `record(v)`, `markChanged()`, `resetBaseline()` | mémoire avant/après |
| `Delta`, `deltas(before, after)` | comparaison valeur par valeur |
| `lastGain(label)` | meilleur gain mesuré, en une ligne |

## Fonctionnement détaillé

### `analyze` : les 6 étapes
1. `hardware` : `api.analysisFacts()` (écran, processus, mémoire, câble ou Wi-Fi, Game DVR, notifications, plan d'alimentation, applis de fond, dernière partie suivie par la barre en jeu).
2. `windows` : pause de 300 ms (étape d'affichage seulement).
3. `drivers` : `api.toolsDrivers()`.
4. `network` : `api.netTest(["hypixel", "internet"])` (test réseau vers Hypixel et vers Internet).
5. `system` : 10 lectures de `api.liveStats()` à 1 s d'intervalle ; moyenne du processeur **sans jeu ouvert** (`cpuIdle`).
6. `match` : assemble les valeurs.

Règles d'assemblage : `ping` = ping vers Hypixel arrondi à l'unité (`server = "Hypixel"`) ; gigue, perte et pics viennent de la mesure `internet` (ou d'Hypixel à défaut) ; `powerSaving` = plan Équilibré (`381b4222-…`) ou Économie d'énergie (`a1841308-…`) ; `background` = applis de fond sauf la catégorie `battery` ; `driverDays` = âge du pilote graphique en jours. Chaque appel qui échoue donne `null` sans arrêter l'analyse.

### Normes réseau personnalisées (`netNorms`)
- Habitude = médiane des **10 dernières** analyses faites avant celle-ci, seulement s'il y en a **au moins 2**.
- Joueur « loin » si ping ≥ 100 ms.
- **Gigue** max = le plus grand de : 5 ms, 10 % du ping (130 ms → 13 ms), 1,5 × gigue habituelle.
- **Perte** max (%) = le plus grand de : 0 (0,5 si loin), perte habituelle + 0,5.
- **Pics** max = le plus grand de : 1 (2 si loin), pics habituels + 1.
- Les seuils ne descendent jamais sous ceux d'un joueur proche des serveurs. Le texte de la norme dit d'où vient le seuil : `pa.norm.usual` (habitude de ce PC), `pa.norm.atPing` (à partir de 50 ms de ping), sinon rien.

### Points trouvés (`findings`)
| Point | Groupe | Problème si… | Ce qui règle |
|---|---|---|---|
| `jitter` | network | gigue > seuil | Premium, Packet Optimizer (`netopt`) |
| `loss` | network | perte (%) > seuil | Premium, Packet Optimizer |
| `spikes` | network | pics > seuil | Premium, Packet Optimizer |
| `wired` | network | Wi-Fi | le joueur : câble (`pa.diy.cable`) |
| `ping` | network | jamais (information) | — |
| `refresh` | fps | écran sous sa fréquence maximale | le joueur (`pa.diy.refresh`) |
| `low1` | fps | 1 % bas < moitié des FPS moyens | Premium, module Latence |
| `stutters` | fps | 2 saccades par minute ou plus | Premium, Latence |
| `fps` | fps | jamais (information) | — |
| `cpuIdle` | system | plus de 5 % sans jeu | gratuit : `win_background`, `win_services` |
| `processes` | system | plus de 160 processus | gratuit : `win_services`, `win_background` |
| `memSpeed` | system | mémoire sous sa vitesse nominale | le joueur : EXPO/XMP dans le BIOS (`pa.diy.expo`) |
| `gameDvr` | windows | activé | gratuit : `win_gamedvr` |
| `powerSaving` | windows | plan Équilibré ou Économie | Premium, Latence |
| `notifications` | windows | activées | gratuit : `win_notifications` |
| `background` | windows | au moins une appli de fond | le joueur (`pa.diy.background`) ; toujours listé |
| `driverDays` | windows | pilote graphique de plus de **180 jours** | le joueur (`pa.diy.driver`) |

### Avant / après (`localStorage` `rago.analysis`)
Contenu : `{ before, after, history, changed }`.
- `record(v)` : ajoute les mesures réseau à `history` (10 au plus) ; s'il n'y a pas d'« avant », `v` le devient ; si des tweaks ont été appliqués depuis (`changed`) ou s'il y a déjà un « après », `v` devient l'« après » ; sinon `v` **remplace l'avant** (rien n'a changé entre deux mesures).
- `markChanged()` : appelé par [[store.tsx]] à la fin d'un lot réussi ; ne fait rien tant qu'il n'y a pas d'« avant ».
- `resetBaseline()` (« Start over ») : efface avant et après, **garde l'habitude** (`history`).
- `deltas(before, after)` : compare `jitter`, `spikes`, `loss` (en %), `processes`, `cpuIdle`, `fps`, `low1`, `stutters` ; ignore une valeur absente ou inchangée ; les trois valeurs de partie sont ignorées si elles sont identiques (même partie, rien de neuf) ; `better` selon le sens (plus bas = mieux, sauf FPS et 1 % bas).
- `lastGain(label)` : les deux premiers gains, par exemple « Gigue 9 ms → 3 ms, Pics 4 → 1 » ; `null` sans avant/après.

## Données touchées
- `localStorage` `rago.analysis`.
- Réseau par le moteur : test vers Hypixel et vers Internet (voir [[Test réseau]]).

## Liens avec le reste
- Page : [[Analysis.tsx]] ; écran de résiliation : [[SubscriptionCard.tsx]].
- Textes : clés `pa.*` de [[i18n.ts]] (les clés `an.*` sont celles du conseil du Packet Optimizer, [[netopt.ts]]).
- Fonctionnalités liées : [[Packet Optimizer]], [[Barre en jeu]] (dernière partie suivie), [[Pendant la partie]].

## À savoir avant de modifier
- Les tweaks gratuits proposés (`win_background`, `win_services`, `win_gamedvr`, `win_notifications`) doivent rester dans [[free.json]], sinon le bouton gratuit de la page ouvrirait l'offre.
- Changer les seuils change ce que voient tous les joueurs : la règle de Sofiene du 10/11 impose des normes réseau personnalisées.
