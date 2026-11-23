---
type: code
tags: [code, app, typescript, react, design]
fichier: app/src/s5/
maj: 2026-11-23
---
# Maquettes v5 dans l'app (`app/src/s5/`)

Depuis le 23/11/2026, l'app reprend **le HTML et le CSS des maquettes v5 tels quels** ([[Charte graphique]]), page par page, au lieu d'un habillage de l'ancienne interface. Demande de Sofiene du 23/11 : l'app livrée par la PR #108 « n'est pas conforme au design », il faut la refaire « strictement conforme », au pixel près, quitte à changer le back-end. Fiche parente : [[Code de l'app (interface)]].

## Fichiers
| Fichier | Rôle |
|---|---|
| `s5/base.css` | **généré** : `rago5.css` + `round.css` + `poster.css` + `frame.css` des maquettes, les effets des boutons d'`anim.css` et le CSS injecté par `printicons.js` et `icons.js`. Ne pas éditer à la main. |
| `s5/pages/<page>.css` | **généré** : le `<style>` d'une maquette, chaque sélecteur rattaché à la racine de la page (`.pg-dash` pour le tableau de bord). Le `.main` de la maquette devient la racine de la page. |
| `s5/app.css` | écrit à la main : seulement ce que la fenêtre change (barre latérale et barre du haut fixes, page qui défile dessous, boutons `<button>` à la place des `<span>` des maquettes, états que les maquettes ne montrent pas). |
| `s5/iconData.ts` | **généré** depuis `icons.js` : icônes au trait, icônes imprimées, alias des noms (`grid` → `dashboard`…), filtres, tracé du R. |
| `s5/I.tsx` | `<I n="…"/>` remplace `<i data-i="…">` des maquettes, avec les couleurs que `icons.js` choisit selon le fond ; `IconDefs`, `LogoR`, `Seg` (barre à segments `.seg`). |
| `s5/art.ts` | images des jeux embarquées (`assets/s5/games/<sorte>/<jeu>.jpg` : `wide`, `cover`, `hero`, `play`), clé d'un jeu d'après son id ou son nom. |
| `s5/text.ts` | « 2 days ago » (`ago`) et date courte (`shortDate`). |

Les fichiers générés viennent de `rendus-v5/outils/port_s5.py` (dossier du projet, pas dans le dépôt) : `icons`, `base`, `page <maquette> <classe>`. Les images citées par le CSS des maquettes sont copiées dans `app/src/assets/s5/img/`.

## Fenêtre
La maquette est une image de 1440 × 900 : la fenêtre s'ouvre à cette taille (`tauri.conf.json`), et sur un écran plus petit `fit_main_window` (`lib.rs`) la réduit à la zone de travail (minimum 1080 × 680). À 1440 × 900, en haut de page, l'app et la maquette se superposent. La barre de défilement (10 px) prend sa place sur la marge droite de la page.

## Classes de l'ancienne interface renommées
Pour que le CSS des maquettes ne touche pas les pages pas encore refaites : `.btn` → `.obtn`, `.chip` → `.ochip`, `.live` → `.olive`, `.main` → `.omain`, `.wc` → `.owc` dans `styles/*.css` et les composants qui s'en servent.

## Avancement (23/11)
| Partie | Maquette | État |
|---|---|---|
| Cadre : barre latérale, barre du haut, carte de mise à jour, bandeau de licence | `shell5.js`, `frame.css` | refait |
| Tableau de bord | `app-dashboard-v2-pi.html` | refait |
| Le reste (jeux, display, modules, réseau, outils, souris, paramètres, partage, analyse, fenêtres, barre en jeu, démarrage) | voir l'inventaire des maquettes | à faire, ancienne interface en attendant |

Rien de tout cela n'a été testé sur un vrai Windows.
