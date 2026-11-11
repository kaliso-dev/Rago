---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/Sidebar.tsx
lignes: 113
maj: 2026-11-11
---
# Sidebar.tsx

La **barre latérale** : navigation entre les pages, compteurs, cadenas, badges « Nouveau », carte de mise à jour, carte du plan gratuit, lien Discord, Paramètres et état administrateur. Fiche parente : [[Code de l'app (interface)]]. Vue produit : [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`), sauf la clé `tools.v2` du badge d'Outils, ajoutée par la **PR #90** (11/11, fusionnée dans `staging` par la PR #92).

## Fonctionnement détaillé

### Entrées, par groupe
| Groupe | Entrées (id de page) |
|---|---|
| (sans titre) | Tableau de bord (`dashboard`), Analyse du PC (`analysis`) |
| Optimiser | Réseau (`network`), Latence (`latency`), Carte graphique (`gpu`), Windows (`windows`), Outils (`tools`) |
| En jeu | Hitreg (`hitreg`), Minecraft (`minecraft`), RBW Mod (`rbw`), Mode jeu (`gamemode`), Jeux (`games`), Couleurs et résolution (`display`, ajoutée le 11/11, PR #93), Souris (`mouse`, PR #NN, [[Page Souris]]) |
| Avancé | Mode expert (`expert`), Restaurer (`restore`) |
| (bas) | carte de mise à jour, carte du plan gratuit, « Rejoindre le Discord », Paramètres (`settings`) |

- Libellés : modules → nom du catalogue ([[catalog.json]]) ; `games`, `display`, `mouse`, `tools`, `analysis` → « Jeux », « Couleurs et résolution », « Souris », « Outils », « Analyse du PC ». Icônes : `MODULE_ICONS` ([[Petits composants de l'interface]]).
- Réseau regroupe le Packet Optimizer et le test réseau dans ses onglets (« deux entrées de moins ») : l'entrée reste active sur les 4 onglets (`isNetworkTab`, [[Network.tsx]]). Paramètres reste actif sur la page `share` (Partage et support s'ouvre depuis les paramètres).
- Clic → `goTo(id)` ([[store.tsx]]).

### Marques sur chaque entrée
- Pastille animée de l'entrée active (`layoutId="nav-active"`, ressort 500/42).
- **Compteur** : nombre de réglages du module cochés (pas encore appliqués).
- **Cadenas** (si compteur à 0) : en gratuit, dès qu'au moins un réglage du module est Premium ou « retour seul », même si d'autres sont gratuits (Windows, Hitreg) ; pas de cadenas pour un module entièrement gratuit (Restaurer).
- **« Nouveau »** (nouveautés de la 1.2.0, puis la page Outils refaite et Couleurs et résolution) : table `NEW` = `games` → `games`, `display` → `display`, `mouse` → `mouse`, `tools` → `tools` et `tools.v2` (`TOOLS_SEEN`, importé de [[Tools.tsx]]), `network` → `netopt` et `nettest`, `analysis` → `analysis`. Le badge reste tant qu'une des pages listées n'a pas été ouverte ([[seen.ts]]). Visiter `games`, `display`, `tools` ou `analysis` les marque vues ; les onglets de Réseau sont marqués par [[Network.tsx]]. Libellé de plus de 14 caractères : un point au lieu du mot.

### Bas de la barre
- [[UpdateCard.tsx]] : mise à jour prête.
- **Carte du plan gratuit** (licence connue et pas Premium) : « Plan gratuit », « {n} réglages sur {total} ouverts » (`FREE.size` = 73 sur `totalTweaks` = 218), « {used} sur {n} places utilisées » (places du plan gratuit, `slotsUsed` plafonné à 30), « Passer Premium » ; clic → offre `plan` ([[Upsell.tsx]]).
- « Rejoindre le Discord » → `openUrl(DISCORD_URL)` ([[LicenseGate.tsx]]).
- Paramètres.
- Pied : point vert « Administrateur » ou orange « Sans droits admin » (`sys.isAdmin`) et nom du PC.

## Liens avec le reste
- Store : `page`, `goTo`, `selected`, `sys`, `license`, `premium`, `setUpsell`, `isLocked`, `undoOnly`, `slotsUsed`, `FREE`, `FREE_SLOTS`.
- Styles : « navigation » de `app.css`, « plan gratuit » de `app.css`, « barre latérale : pages nouvelles » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Ajouter une page : une entrée dans `GROUPS` (et `LABELS` si ce n'est pas un module), plus la branche dans [[App.tsx]].
- « {n} réglages sur {total} » compare `FREE.size` (ids gratuits, actions comprises) à `totalTweaks` (réglages distincts, jumeaux fusionnés) : les deux chiffres ne se comptent pas tout à fait de la même façon, mais c'est le même calcul que le site (`site/tools/sync_app.py`).
