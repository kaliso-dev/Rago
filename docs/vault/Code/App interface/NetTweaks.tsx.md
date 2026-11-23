---
type: code
tags: [code, app, typescript, react, reseau]
fichier: app/src/pages/NetTweaks.tsx
lignes: 171
maj: 2026-11-23
---
# NetTweaks.tsx

L'onglet **« Tweaks »** (« Optimisations ») de la page Réseau : les réglages réseau du catalogue, à l'identique de la maquette v5 `app-network-pi.html`. Créé le 23/11 (PR #123) ; avant, cet onglet affichait [[ModulePage.tsx]] en mode `embedded`. Fiche parente : [[Code de l'app (interface)]]. Page : [[Network.tsx]]. Réglages : [[Tweaks Réseau]].

Tout ce qui suit est CONFIRMÉ (code de la PR #123 du 23/11, commit `c0d27dd`, vers `staging`). Jamais testé sur Windows.

## Ce que le fichier expose
- `NetTweaks()` : l'onglet. Composant interne : `Profile` (un profil).
- Constantes internes :
  - `PROFILES` : les trois profils, leur titre, leur nombre de colonnes et le texte court de chaque option ;
  - `PACKET_ORDER` : ordre des options de « paquets » dans la maquette (hitreg, knockback, qos), différent du catalogue ;
  - `SKIP` : les réglages qui ne sont pas dans la grille.

## Fonctionnement détaillé

### « profiles » (trois cartes)
| Carte | Réglage du catalogue | Options |
|---|---|---|
| hitreg | `ping_hitreg` | better, best, balanced, hypixel, slowest (textes `s5.net.hit.*`) + off, sur 3 colonnes |
| ping | `ping_main` | 1, 2, 3… (numéro de l'option) + off, sur 4 colonnes |
| packets | `ping_packets` | hitreg, knockback, qos (`s5.net.pk.*`) + off, sur 2 colonnes |

- La variante « retour » du catalogue (Default) n'est pas une option : c'est le bouton **off**.
- Un clic sur une option la choisit et coche le réglage (rouge plein s'il est appliqué, contour s'il est coché pour la prochaine application). **off** décoche le réglage, ou le coche pour être annulé s'il était appliqué.
- Réglage fermé (Premium) ou option fermée : l'offre Premium s'ouvre ([[Upsell.tsx]]).
- La carte suit la recherche Ctrl+K : elle défile jusqu'au réglage cherché et s'éclaire 1,8 s (`focusTweak`).

### « settings » (la grille)
- Tous les réglages du module `network`, sauf les trois profils, `net_profile` et `net_restart` (`SKIP`) :
  - `net_profile` (profil réseau par jeu) n'est montré que sur la page Minecraft ; [[catalog.ts]] le rattache donc à Minecraft pour la recherche et « Also in » ;
  - `net_restart` est le bouton « restart network card » de l'en-tête ([[Network.tsx]]).
- Un carreau [[TweakRow.tsx]] par réglage, avec son **nom court** (`label`, clés `s5.net.nm.<id>`, 19 noms). La recherche et l'historique gardent le nom du catalogue. Un réglage ajouté plus tard sans nom court garde son nom.
- Compteur « {appliqués} / {total} » des interrupteurs, et bouton **« select safe »** qui coche les réglages sûrs disponibles. En gratuit sans aucun réglage sûr ouvert, ce bouton devient « Premium » avec un cadenas.
- Les réglages à risque `advanced` sont repliés dans une tuile **« advanced {n} »**. Ils se déplient tout seuls quand la recherche mène à l'un d'eux.

## Liens avec le reste
- Store : `selected`, `applied`, `pendingUndo`, `variantOf`, `setVariant`, `toggle`, `selectMany`, `isLocked`, `variantLocked`, `undoOnly`, `setUpsell`, `focusTweak` ([[store.tsx]]).
- Catalogue : `availability`, `sectionTweaks`, `tweaks` ([[catalog.ts]]).
- Textes : `s5.net.*`, `s5.mod.*` ([[i18n.ts]]). Styles : `s5/pages/module.css` et `s5/pages/net.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Un nouveau réglage réseau dans le catalogue apparaît tout seul dans la grille. Lui écrire un nom court `s5.net.nm.<id>` (fr et en) pour suivre la maquette.
- Un nouveau profil à options : l'ajouter dans `PROFILES` et dans `SKIP`.
