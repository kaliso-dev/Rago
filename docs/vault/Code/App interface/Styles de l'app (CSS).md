---
type: code
tags: [code, app, css, design]
fichier: app/src/styles/ (tokens.css, fonts.css, app.css, features.css, account.css, mouse.css, v5.css, overlay.css, tips.css)
lignes: 11690
maj: 2026-11-22
---
# Styles de l'app (CSS)

Les **feuilles de style** de l'app Windows : les jetons de design (couleurs, tailles, mouvement), les polices, le cadre et les composants, les fonctionnalités ajoutées depuis la 1.2.0, le compte et les avis, la charte v5 posée par-dessus, et la barre en jeu. Il n'y a ni Tailwind, ni CSS Modules, ni CSS dans le JavaScript : des classes simples, écrites à la main. Fiche parente : [[Code de l'app (interface)]]. Design : [[Charte graphique]] (v5 « Match day » depuis la PR #108 du 22/11, vers `staging`, jamais testée sur Windows) ; l'ancien verre : [[Refonte glass]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`), avec les 238 lignes de la page Outils refaite par la **PR #90** (11/11, fusionnée dans `staging` par la PR #92) : sur `staging`, `features.css` fait 3 492 lignes et l'ensemble 7 195.

## Les fichiers et qui les charge

| Fichier | Lignes | Chargé par | Contenu |
|---|---|---|---|
| `tokens.css` | 219 | les deux fenêtres | jetons `--rg-*` du kit v5 (`marque/tokens/tokens.css` des maquettes), classes `.rg-metric` et `.rg-overline`, animations `rg-pulse` et `rg-pixel-blink` |
| `fonts.css` | 79 | les deux fenêtres | `@font-face` de Barlow (400, 500, 600, 700) et Barlow Condensed (600 à 900 droit, 700 à 900 italique), `font-display: block` |
| `app.css` | 2922 | fenêtre principale | polices, cadre, barre de titre, navigation, pages, cartes, boutons, réglages, barre « Appliquer », fenêtres, exécution, tableau de bord, Minecraft, paramètres, licence, plan gratuit, verre, finitions, 1.3.0 |
| `account.css` | 257 | fenêtre principale | avatar, invitation à laisser un avis, formulaire d'avis, carte Profil |
| `features.css` | 3850 | fenêtre principale | fonctionnalités de la 1.2.0 et après (liste plus bas) |
| `overlay.css` | 747 | barre en jeu | toute la barre en jeu (RAG-82) ; la fin du fichier (section « Charte v5 ») la réhabille |
| `v5.css` | 3004 | fenêtre principale, **chargée en dernier** | la charte v5 « Match day » posée sur les classes existantes (voir plus bas) |
| `tips.css` | 214 | fenêtre principale et barre en jeu (importé par [[GameTips.tsx]]) | bloc des réglages conseillés (`.game-tips*`, `.game-tip*`), place sous le jeu en avant de la bibliothèque (`.games-hero-tips`), bloc des conseils de la barre en jeu qui défile à part (`.ov-advice`, 258 px au plus, fondu en bas ; `.ov-tips`), pastille élargie du rappel (`.ov-nudge*`). Voir [[Conseils au lancement du jeu]] |
| `mouse.css` | 40 | fenêtre principale (importé par [[main.tsx (app)]]) | [[Page Souris]] : zone de mesure, pastilles du test de clics, liste des logiciels, formulaire de sensibilité (`.mouse-*`) ; PR #96 |

- Ordre d'import dans [[main.tsx (app)]] : `fonts.css`, `tokens.css`, `app.css`, `account.css`, `features.css`, `mouse.css`, puis `v5.css` en dernier. L'ordre compte : une règle plus bas l'emporte à égalité, c'est ce qui permet à `v5.css` de tout réhabiller sans réécrire les autres feuilles.
- La barre en jeu ([[main.tsx (barre en jeu)]]) charge seulement `fonts.css`, `tokens.css` et `overlay.css`.
- Exception : `tips.css` est importée par le composant [[GameTips.tsx]], pas par les `main.tsx`, parce que ce bloc sert dans les deux fenêtres (la barre en jeu ne charge pas `features.css`).
- **Polices** (depuis la PR #108 du 22/11, vers `staging`, jamais testée sur Windows) : Barlow et Barlow Condensed, fichiers `woff2` dans `app/src/assets/fonts/` avec leur licence `Barlow-OFL.txt`, déclarées une seule fois dans `fonts.css`. Geist est retiré de l'app. Rien n'est chargé depuis Internet : la CSP de la fenêtre l'interdirait (voir [[Configuration Tauri]]).

## `tokens.css` : les jetons de design
- **Origine** : depuis la PR #108 du 22/11, vers `staging`, jamais testée sur Windows, c'est le `tokens.css` du kit v5 des maquettes (`rago-redesign/rendus-v5/marque/tokens/`), qui garde les noms `--rg-*`. Deux retouches pour l'app : `.rg-metric` ne force plus 64 px (police condensée 700, `tabular-nums`), et ajout de `--rg-text-muted` et des animations `rg-pulse` et `rg-pixel-blink`. Les fonds v5 sont `#0A0A0B`, `#111113`, `#17171A`, `#1F1F23`, le papier `#ECE9E2`.
- **Thème sombre par défaut, et seul thème de l'app**. Le bloc `[data-theme="light"]` existe, mais le commentaire précise « site uniquement si besoin, l'app reste sombre ». Aucun fichier de l'app ne pose `data-theme`.
- **Familles de jetons** :
  - encre `--rg-ink-0` à `-5` (fonds, du plus profond au plus élevé) ;
  - texte `--rg-text-1` à `-3` et `--rg-text-inverse` ;
  - bordures `--rg-line-1` à `-3` ;
  - **rouge Rago, accent unique** `--rg-red-300` à `-700`, avec `--rg-red-500` = `#FF3B30`. Le texte posé sur ce rouge est sombre, jamais blanc (contraste) ;
  - `--rg-red-a12` et `-a24` (fond teinté, halo) et `--rg-red-gradient` (héros, barre de progression, achat) ;
  - couleurs de sens : `--rg-success` (vert), `--rg-warning` (jaune, jamais orange), `--rg-info`, `--rg-danger` (= l'accent, toujours avec une icône et un texte) ;
  - typographie : `--rg-font-sans`, `--rg-font-mono` et les tailles `--rg-fs-*` ;
  - espacements `--rg-space-*` (base 4 px) ;
  - rayons `--rg-radius-xs` (8) à `-2xl` (40) et `-full`. Règle d'imbrication : rayon intérieur = rayon extérieur − marge ;
  - ombres `--rg-shadow-1` à `-3`, `--rg-glow`, `--rg-focus` ;
  - mouvement : `--rg-ease-out`, `-in-out`, `-spring`, `--rg-dur-instant` (90 ms) à `-slow` (420 ms), et `--rg-dur-pulse` (1,6 s).
- **Jetons du verre** (refonte du 16/10/2026, voir [[Refonte glass]]) :

  | Jeton | Valeur | Usage |
  |---|---|---|
  | `--rg-glass-1` | blanc à 2,5 % | carte, liste de réglages |
  | `--rg-glass-2` | blanc à 4,5 % | survol, contrôles |
  | `--rg-glass-3` | blanc à 8 % | élément actif |
  | `--rg-glass-float` | `rgba(17,17,19,.82)` | panneau flottant, toujours avec le flou |
  | `--rg-glass-blur` | `blur(36px) saturate(1.8)` | flou de ce qui flotte |
  | `--rg-glass-edge` | reflet blanc de 1 px en haut | bord des cartes et des panneaux |
  | `--rg-glass-fill` | dégradé blanc de 3,5 % à 1,5 % | fond des cartes |
  | `--rg-glass-rim` | dégradé à 150° | liseré des cartes |

## L'effet verre, en pratique (avant la v5)
Ce qui suit décrit `app.css` et `features.css`, toujours chargés. Sur `staging`, `v5.css` recouvre la plupart de ces règles (cartes pleines, plus de liseré ni de flou) ; la prod (1.3.0) les montre encore.
- **Cartes** (`.card`) : fond `--rg-glass-fill`, bordure `--rg-line-1`, rayon `--rg-radius-lg`, reflet `--rg-glass-edge` et une ombre douce. **Pas de flou** sur les cartes, pour garder un défilement fluide.
- **Liseré lumineux** (section « verre : bord lumineux » de `app.css`) : un `::after` avec un masque trace le dégradé `--rg-glass-rim`, vif en haut à gauche et éteint ailleurs. Il est posé sur `.card`, `.tweak-list`, `.preset`, `.applybar`, `.gate-card`, `.nav-upgrade` et `.review-prompt`. Il n'est pas posé sur ce qui défile à l'intérieur (barre latérale, fenêtres) : là, le reflet reste en `box-shadow`. Un preset choisi (`.preset.on`) a un liseré rouge.
- **Flou** (`backdrop-filter: var(--rg-glass-blur)`) : seulement sur ce qui flotte au-dessus du contenu. Cela comprend :
  - la barre latérale, la barre « Appliquer » et les fenêtres ;
  - les panneaux de licence, les messages et les toasts ;
  - l'invitation à laisser un avis ;
  - quelques éléments de `features.css` (onglets de Réseau, menus).
- **Barre en jeu** : verre sombre **sans flou** sous la fenêtre (le jeu reste lisible derrière). L'ombre tient dans la marge de la fenêtre transparente : coupée au bord, elle dessinerait un rectangle sur le jeu.

## Mouvement réduit
- Deux façons de l'activer :
  - le réglage de l'app (`motion` = `reduced` dans [[store.tsx]]) : [[App.tsx]] pose la classe `.reduced` sur `.app` et passe `MotionConfig reducedMotion="always"` à `motion/react` ;
  - le réglage de Windows (`prefers-reduced-motion`), que le tweak `win_visual` active, d'après le commentaire de `app.css`.
- Dans les deux cas, les fondus et les animations courtes sont gardés. Seul le mouvement est retiré : les ondes « Pulse » ne font plus que s'allumer et s'éteindre (`rg-pulse-fade`), et le bouton Premium de la barre latérale ne bouge plus au survol.
- `tokens.css` met les durées à 0 sous `prefers-reduced-motion`, mais `app.css`, chargé après, les remet à 90, 120, 160 et 200 ms.

## Plan de `app.css`
- Lignes 1 à 140 : polices, base, `.spin`, `.pixel-blink`, mouvement réduit.
- 141 cadre (`.app`) ; 163 barre de titre ; 269 navigation (barre latérale) ; 400 pages et cartes (`.card` vers la ligne 502) ; 537 boutons (`.btn-*`) ; 635 interrupteur et `segmented` ; 758 réglages (`.tweak-*`).
- 940 barre « Appliquer » ; 991 fenêtres (`.scrim`, `.modal`) et palette ; 1242 exécution (`RunOverlay`) ; 1412 tableau de bord ; 1684 Minecraft ; 1750 paramètres ; 1840 licence (dont Google et Discord, vers 1915).
- Vers 1988 : **démo à largeur de téléphone** (`max-width: 760px`). L'app de bureau a une largeur minimale de 1080 px ; ce bloc sert à la démo web.
- 2162 plan gratuit ; 2360 vérification du 07/10/2026 (toasts, message de licence) ; 2586 verre (bord lumineux) ; 2637 focus et finitions (audit du 17/10) ; 2687 et suivantes : lien Discord, `Splash`, `Pulse`.
- 2763 : **1.3.0**, analyse du PC, fenêtre Premium avec les prix, résiliation.

## Plan de `features.css`
- En-tête : « Nouvelles fonctionnalités de la 1.2.0 (17/10/2026)… Les règles de app.css ne sont pas modifiées ici. ».
- Sections, dans l'ordre :
  - 5 : Nettoyer la RAM (RAG-48) ;
  - 16 : Partage et support (RAG-44, RAG-70) ;
  - 245 : Mes presets ;
  - 319 : pages nouvelles dans la barre latérale ;
  - 342 : puces ;
  - 368 : bibliothèque de jeux (RAG-57) ;
  - 454 : launcher de Minecraft Java ;
  - 588 : graphismes du jeu (`.games-gfx*`, plus utilisé depuis le 23/11 : la page Jeux suit le CSS des maquettes, [[Maquettes v5 dans l'app (s5)]]) ;
  - 826 : onglets de Réseau ;
  - 904 : test réseau ;
  - 1301 : mise à jour prête (RAG-24) ;
  - 1380 : paramètres de la barre en jeu et de l'arrière-plan (RAG-82) ;
  - 1422 : optimisations gratuites du tableau de bord ;
  - 1478 : RBW Mod ;
  - 1587 : launchers ;
  - 1714 : presets par jeu ;
  - 1880 : outils (nettoyage, applis, pilotes ; « en un clic » 2141, applis au démarrage 2262, réglages Windows utiles 2323, tous les outils de l'app 2355 : [[Page Outils]]) ;
  - 2396 : Pendant la partie ;
  - 2431 : Packet Optimizer ;
  - 2545 : vue gratuite du Packet Optimizer (1.3.0) ;
  - 2976 et 3023 : Avancé et Réglages experts ;
  - 3289 : Analyser mon PC ;
  - 3556 : modifier un preset ;
  - 3718 : Rago Route (fin du fichier).
  - La section « couleurs et résolution par jeu » (`.display-*`) est retirée depuis le 23/11 : [[Display.tsx]] est refaite sur la maquette v5 ([[Maquettes v5 dans l'app (s5)]]).
- Le titre de la section Rago Route dit encore « exe de test » : en retard, l'onglet est dans tous les exe depuis le 10/11 (voir [[RouteTab.tsx]]).

## `account.css` et `overlay.css`
- `account.css` : `.avatar` (ligne 1), invitation en bas à droite (22), formulaire d'avis (89), carte Profil (151). Voir [[ProfileCard.tsx]], [[ReviewDialog.tsx]], [[ReviewPrompt.tsx]].
- `overlay.css` : fenêtre transparente où seule la barre ou la pastille est peinte (1), verre sombre (56), barre ouverte (66), défilement des deux colonnes (213), interrupteur au même dessin que dans l'app (277), pastille qui ne prend ni le focus ni les clics (327), Pendant la partie (361). Voir [[Overlay.tsx]].

## Classes clés à connaître
- `.rg-overline` : petites capitales en condensé (v5), titres de carte.
- `.rg-metric` : chiffres en condensé 700, `tabular-nums` (v5).
- `.card`, `.card-head` : cartes.
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.btn-md`, `.btn-lg` : boutons (`Button`).
- `.switch`, `.segmented`, `.badge` : contrôles de `ui.tsx` ([[Petits composants de l'interface]]).
- `.scrim`, `.modal` : fenêtres.
- `.muted`, `.small` : texte secondaire.
- `.spin` : icône qui tourne.
- `.dot`, `.dot-ok`, `.dot-warn` : pastilles d'état.
- `.chip` : puces.
- `.page`, `.page-head`, `.lead` : en-tête de page.
- Préfixes par fonctionnalité :
  - `no-` : Packet Optimizer ;
  - `net-` et `nt-` : test réseau ;
  - `rt-` : Rago Route ;
  - `tools-` et `driver-` : outils ;
  - `share-` : partage ;
  - `games-`, `game-` et `launcher-` : bibliothèque ; `games-gfx` : ancienne carte des graphismes ; ces classes de la bibliothèque ne servent plus depuis le 23/11 ([[Games.tsx]] suit la maquette v5) ;
  - `pe-` : modifier un preset ;
  - `profile-` et `review-` : compte.

## `v5.css` : la charte v5 « Match day »
Ajoutée par la PR #108 du 22/11, vers `staging`, jamais testée sur Windows. Elle réhabille les classes existantes sans toucher au code des autres feuilles. Plan, dans l'ordre :
- corps de page, couleurs des icônes imprimées (`--pf` face, `--pb` dos rouge), grain d'impression sur `.app::after` (`assets/fx/grain.svg`) ;
- **cadre** : grille `.app` 236 px + 1fr ; `.body` en lignes 64 px + 1fr (barre du haut, puis contenu) ;
- barre du haut (`.titlebar`, recherche, bandeau démo, Premium ou connexion, boutons `.wc`) ;
- **barre latérale** : `.nav-logo`, éléments en condensé 900 italique, `.nav-active` avec barre rouge, `.nav-count`, carte `.nav-pc` en rayures carbone, `.nav-upgrade` compacte, `.nav-motto`, `.nav-discord` ; sous 880 px de haut, éléments de 29 px ;
- **titres de page** : taille `--title-size` (56 à 112 px, réglée par [[App.tsx]]), écho en contour (`::before` avec `attr(data-t)`), pinceau rouge (`::after`, `assets/fx/brush.svg`) ;
- **rubans** : `.section-title > span:first-child`, `.tape`, `.modal-title`, `h2.section-title.rg-overline`, `.gate-card h1` sur `tape-red.svg` avec le masque `tape-mask.svg` ;
- composants : `.section-chip`, cartes, boutons penchés par `::before` (primaire rouge), champs, interrupteur penché, `segmented`, badges, puces, `.carbon` ;
- `.head-num` (bloc rouge au bord déchiré, masque `num-mask.svg`) et la jauge à segments `.segs` ;
- tableau de bord (`.dash-top`, `.dash-free`, `.dash-an`, presets en liste) ; pages module (`.module-bar-v5`, `.sec-count`, `.sec-fold`, grille de tuiles sur 3 colonnes, `.tweak.tile`, `.wide`, `.tweak-state`, bulle claire `.tweak-pop` au survol après 0,35 s) ;
- barre « Appliquer » (660 px, 72 px de haut, chiffre rouge de 54 px), bandeau de licence, erreur de page, fenêtres, confirmation, exécution (compteur de 170 px sur pinceau), palette de recherche, toasts ;
- connexion (`.gate-*`), Premium (grille 260 px + 1fr, panneau rouge `.upsell-side`), onglets `.hub-tab` penchés (onglet ouvert en rouge), titres de carte et de ligne en condensé capitales ;
- écran de démarrage (`.splash-*`, voir [[Splash.tsx]]) ;
- état du Packet Optimizer (`.no-hero-title`, 26 px).
- Textures dans `app/src/assets/fx/` : `brush.svg`, `tape-red.svg`, `torn-a.svg`, `torn-b.svg`, `grain.svg`, `num-left.svg` (copiés des maquettes), `tape-mask.svg` et `num-mask.svg` (tirés des maquettes `module.css` et `poster.css`).

## À savoir avant de modifier
- Un changement de look va dans `v5.css` (ou la section « Charte v5 » d'`overlay.css`), pas dans les anciennes feuilles.
- Utiliser les jetons `--rg-*` plutôt que des couleurs écrites en dur, pour rester d'accord avec le site et la marque.
- Ne pas ajouter de flou sur les cartes : le défilement deviendrait lourd sur les petits PC (règle de la refonte).
- Une nouvelle fonctionnalité va dans `features.css`, dans une section avec un titre ; `app.css` garde le socle.
- Le texte posé sur le rouge doit rester sombre (règle de contraste écrite dans `tokens.css`).
