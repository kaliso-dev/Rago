---
type: code
tags: [code, app, css, design]
fichier: app/src/styles/ (tokens.css, app.css, features.css, account.css, overlay.css, tips.css, mouse.css)
lignes: 8125
maj: 2026-11-11
---
# Styles de l'app (CSS)

Les **cinq feuilles de style** de l'app Windows : les jetons de design (couleurs, tailles, verre, mouvement), le cadre et les composants, les fonctionnalités ajoutées depuis la 1.2.0, le compte et les avis, et la barre en jeu. Il n'y a ni Tailwind, ni CSS Modules, ni CSS dans le JavaScript : des classes simples, écrites à la main. Fiche parente : [[Code de l'app (interface)]]. Design : [[Refonte glass]], [[Charte graphique]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`), avec les 238 lignes de la page Outils refaite par la **PR #90** (11/11, fusionnée dans `staging` par la PR #92) : sur `staging`, `features.css` fait 3 492 lignes et l'ensemble 7 195.

## Les fichiers et qui les charge

| Fichier | Lignes | Chargé par | Contenu |
|---|---|---|---|
| `tokens.css` | 119 | les deux fenêtres | jetons `--rg-*`, classes `.rg-metric` et `.rg-overline`, animations `rg-pulse` et `rg-pixel-blink` |
| `app.css` | 2935 | fenêtre principale | polices, cadre, barre de titre, navigation, pages, cartes, boutons, réglages, barre « Appliquer », fenêtres, exécution, tableau de bord, Minecraft, paramètres, licence, plan gratuit, verre, finitions, 1.3.0 |
| `account.css` | 257 | fenêtre principale | avatar, invitation à laisser un avis, formulaire d'avis, carte Profil |
| `features.css` | 4208 | fenêtre principale | fonctionnalités de la 1.2.0 et après (liste plus bas) |
| `overlay.css` | 392 | barre en jeu | toute la barre en jeu (RAG-82) |
| `tips.css` | 214 | fenêtre principale et barre en jeu (importé par [[GameTips.tsx]]) | bloc des réglages conseillés (`.game-tips*`, `.game-tip*`), place sous le jeu en avant de la bibliothèque (`.games-hero-tips`), bloc des conseils de la barre en jeu qui défile à part (`.ov-advice`, 258 px au plus, fondu en bas ; `.ov-tips`), pastille élargie du rappel (`.ov-nudge*`). Voir [[Conseils au lancement du jeu]] |
| `mouse.css` | 40 | fenêtre principale (importé par [[main.tsx (app)]]) | [[Page Souris]] : zone de mesure, pastilles du test de clics, liste des logiciels, formulaire de sensibilité (`.mouse-*`) ; PR #96 |

- Ordre d'import dans [[main.tsx (app)]] : `tokens.css`, `app.css`, `account.css`, `features.css`. L'ordre compte : une règle plus bas l'emporte à égalité.
- La barre en jeu ([[main.tsx (barre en jeu)]]) charge seulement `tokens.css` et `overlay.css`.
- Exception : `tips.css` est importée par le composant [[GameTips.tsx]], pas par les `main.tsx`, parce que ce bloc sert dans les deux fenêtres (la barre en jeu ne charge pas `features.css`).
- **Polices** : Geist et Geist Mono, en fichiers variables `woff2` dans `app/src/assets/fonts/` (graisses 100 à 900, `font-display: swap`). Elles sont déclarées dans `app.css` et à nouveau dans `overlay.css`. Rien n'est chargé depuis Internet : la CSP de la fenêtre l'interdirait (voir [[Configuration Tauri]]).

## `tokens.css` : les jetons de design
- **En-tête** : « design tokens v1.1 (05/10/2026 : rouge #FF3B30, plus d'orange, arrondis partout) ». La source de vérité citée est le fichier de la marque. La copie de l'app **diffère un peu** de [[tokens.css (marque)]] : par exemple, les jetons `--rg-warning-a06`, `--rg-warning-a10` et `--rg-warning-a18` n'existent que du côté de la marque.
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

## L'effet verre, en pratique
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
  - 588 : graphismes du jeu (`.games-gfx*`, carte [[GameGraphics.tsx]] de [[Graphismes des jeux]]) ;
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
  - 3718 : Rago Route ;
  - 3852 : couleurs et résolution par jeu (`.display-*`, page [[Display.tsx]] ; elle réutilise les curseurs `.no-slider` du Packet Optimizer et les puces `.chip-btn`).
- Le titre de la section Rago Route dit encore « exe de test » : en retard, l'onglet est dans tous les exe depuis le 10/11 (voir [[RouteTab.tsx]]).

## `account.css` et `overlay.css`
- `account.css` : `.avatar` (ligne 1), invitation en bas à droite (22), formulaire d'avis (89), carte Profil (151). Voir [[ProfileCard.tsx]], [[ReviewDialog.tsx]], [[ReviewPrompt.tsx]].
- `overlay.css` : fenêtre transparente où seule la barre ou la pastille est peinte (1), verre sombre (56), barre ouverte (66), défilement des deux colonnes (213), interrupteur au même dessin que dans l'app (277), pastille qui ne prend ni le focus ni les clics (327), Pendant la partie (361). Voir [[Overlay.tsx]].

## Classes clés à connaître
- `.rg-overline` : petites capitales en police mono, titres de carte.
- `.rg-metric` : chiffres en police mono à chasse fixe.
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
  - `games-`, `game-` et `launcher-` : bibliothèque ; `games-gfx` : graphismes des jeux ([[GameGraphics.tsx]]) ;
  - `pe-` : modifier un preset ;
  - `profile-` et `review-` : compte.

## À savoir avant de modifier
- Utiliser les jetons `--rg-*` plutôt que des couleurs écrites en dur, pour rester d'accord avec le site et la marque.
- Ne pas ajouter de flou sur les cartes : le défilement deviendrait lourd sur les petits PC (règle de la refonte).
- Une nouvelle fonctionnalité va dans `features.css`, dans une section avec un titre ; `app.css` garde le socle.
- Le texte posé sur le rouge doit rester sombre (règle de contraste écrite dans `tokens.css`).
