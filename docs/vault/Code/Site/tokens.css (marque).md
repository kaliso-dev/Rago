---
type: code
tags: [code, marque, css, json, design]
fichier: brand/tokens/tokens.css
lignes: 122
maj: 2026-11-10
---
# tokens.css (marque)

La feuille des jetons de design de Rago (variables CSS `--rg-*`) : couleurs, typographie, espacements, rayons, ombres, verre et mouvement. C'est la référence d'où partent les copies de l'app et du serveur. Cette note couvre aussi `brand/tokens/tokens.json` (177 lignes, mêmes valeurs en JSON). Fiche parente : [[Kit de marque (brand)]]. Fonctionnalité : [[Charte graphique]], [[Refonte glass]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging`, 10/11). En-tête du fichier : « design tokens v1.2 (07/10/2026 : inchangés depuis la v1.1 du 05/10/2026 : rouge #FF3B30, plus d'orange, arrondis partout) (source de vérité : tokens.json, même dossier) ».

## Rôle et place dans l'ensemble
- `tokens.json` est déclaré « source de vérité » et `tokens.css` sa traduction CSS ; **aucun script ne génère l'un depuis l'autre** : les deux fichiers sont tenus à la main et doivent être modifiés ensemble (ils sont identiques le 10/11).
- Copies ailleurs dans le dépôt, recopiées à la main (pas d'import du dossier `brand/`) :
  - `app/src/styles/tokens.css` (importé par `app/src/main.tsx` et la barre en jeu `app/src/overlay/main.tsx`) : en-tête resté en « v1.1 » avec un chemin de source ancien (`/mnt/project-files/brand/tokens/tokens.json`) ; il lui manque `--rg-warning-a06`, `--rg-warning-a10`, `--rg-warning-a18` ; il a bien les jetons de verre ;
  - `licensing/public/tokens.css` (pages du serveur de comptes et `/admin`) : même en-tête v1.1 ; il lui manque les trois `--rg-warning-a*` **et** les huit jetons de verre `--rg-glass-*` ;
  - le site n'importe pas ce fichier : [[page.html]], [[tweaks.html]], [[reviews.html]], [[partners.html]] et [[route.html]] redéclarent leurs propres alias courts (`--ink`, `--t1`, `--red`…) avec les mêmes valeurs.
- Les trois jetons `--rg-warning-a*` ne sont utilisés nulle part dans l'app, le site ou le serveur (recherche du 10/11) ; leur absence dans les copies n'a donc pas d'effet visible.

## Ce que le fichier expose (`:root`)
| Groupe | Jetons et valeurs |
|---|---|
| Encre (fonds) | `--rg-ink-0` `#070708` (fenêtre), `-1` `#0A0A0B` (fond), `-2` `#111113` (surface, cartes, barre latérale), `-3` `#17171A` (surface élevée, survol), `-4` `#1F1F23` (menus, champs), `-5` `#2A2A30` (actif, séparateur fort) |
| Texte | `--rg-text-1` `#F5F5F6`, `-2` `#A1A1AA`, `-3` `#7C7C86`, `--rg-text-inverse` `#0A0A0B` |
| Bordures | `--rg-line-1` blanc 6 %, `-2` 10 %, `-3` 16 % |
| Rouge (accent unique) | `--rg-red-300` `#FF8A82`, `-400` `#FF5E55` (survol), `-500` `#FF3B30` (**accent** ; texte posé dessus = `--rg-ink-1`, contraste 5,6:1, jamais blanc 3,5:1), `-600` `#F2352B` (appuyé), `-700` `#C9221A` (rouge profond, texte blanc accepté), `--rg-red-a12` (fond teinté 12 %), `--rg-red-a24` (anneau de focus 24 %) |
| Dégradé | `--rg-red-gradient` : `linear-gradient(100deg, #C9221A 0%, #FF3B30 55%, #FF5E55 100%)`, aucun orange ; seulement héros, barre de progression, bouton d'achat |
| Sens | `--rg-success` `#3DDC97` (gains), `--rg-warning` `#FFD60A` (jaune, jamais orange) + `--rg-warning-a06` / `-a10` / `-a18` (fond d'encart, fond de badge « Advanced », bordure d'encart), `--rg-info` `#5AB8FF`, `--rg-danger` `#FF3B30` (toujours avec une icône et un texte) |
| Polices | `--rg-font-sans` « Geist », Inter, Segoe UI Variable, Segoe UI, system-ui ; `--rg-font-mono` « Geist Mono », JetBrains Mono, Cascadia Mono, ui-monospace |
| Tailles | display 56 px (interligne 1,02, interlettrage −0,035 em), h1 36, h2 24, h3 18, corps 14 (1,55), small 13, caption 12, overline 11 (majuscules, mono, +0,12 em), metric 40 (chiffres de perf, mono, `tabular-nums`) |
| Espacement (base 4) | `--rg-space-1` 4 px … `-24` 96 px (1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24) |
| Rayons | `xs` 8 (badges), `sm` 12 (champs, petits boutons), `md` 16 (boutons, tuiles), `lg` 24 (cartes), `xl` 32 (modales, sections, carte des prix), `2xl` 40 (héros, fenêtre de l'app sur le site), `full` 999 (pilules, interrupteurs, avatars). Règle : rayon intérieur = rayon extérieur − marge intérieure |
| Ombres | `--rg-shadow-1/2/3` (reflet intérieur + ombre portée croissante), `--rg-glow` (halo rouge), `--rg-focus` (double anneau encre + rouge) |
| Verre (refonte du 16/10) | `--rg-glass-1` blanc 2,5 % (carte), `-2` 4,5 % (survol, contrôles), `-3` 8 % (actif), `--rg-glass-float` `rgba(17,17,19,.82)` (panneau flottant), `--rg-glass-blur` `blur(36px) saturate(1.8)` (seulement sur ce qui flotte : barre Apply, modales, palette, messages ; jamais sur les cartes, pour garder un défilement fluide), `--rg-glass-edge` (reflet du bord haut), `--rg-glass-fill` (voile clair des cartes), `--rg-glass-rim` (liseré en `::after`) |
| Mouvement | `--rg-ease-out` `cubic-bezier(.16,1,.3,1)`, `--rg-ease-in-out` `(.65,0,.35,1)`, `--rg-ease-spring` `(.34,1.56,.64,1)` ; durées `instant` 90 ms, `fast` 160, `base` 240, `slow` 420, `pulse` 1 600 (onde « Pulse » pendant une optimisation) |

Autres règles du fichier :
- `@media (prefers-reduced-motion: reduce)` : `instant`, `fast`, `base`, `slow` passent à 0 ms (la pulsation garde sa durée).
- `[data-theme="light"]` : thème clair « site uniquement si besoin, l'app reste sombre » (encres claires, texte foncé, rouge `#D70015`, succès `#0E9F6E`, alerte `#7A6200`, info `#1F7FD1`). Jamais utilisé par le site aujourd'hui.
- Classes `.rg-metric` (mono, `tabular-nums`, −0,02 em) et `.rg-overline` (mono 11 px, majuscules, couleur tertiaire).
- Animations `@keyframes rg-pulse` (échelle 0,6 → 2,6, opacité 0,9 → 0) et `rg-pixel-blink`.

## `tokens.json`
Objet `{ name: "Rago", version: "1.2.0", fonts: {sans, mono, license}, dark: {ink, text, line, red, success, warning, info, danger, font, fs, lh, ls, space, radius, shadow, glow, focus, glass, ease, dur}, light_overrides: {ink, text, line, red, success, warning, info, danger} }`. Mêmes valeurs que le CSS, y compris `glass` et `warning-a06/a10/a18`. Le README dit qu'il sert à « générer un thème WPF/WinUI/Tailwind » : aucun générateur de ce genre n'existe dans le dépôt.

## Historique
Créés le 07/10 (`6c2bcad`). Jetons de verre ajoutés le 16/10 avec la [[Refonte glass]] (`a2477b6`, `4989ee8`, `85571b5`). Sur la branche de prod, ni `brand/tokens/tokens.css` ni `app/src/styles/tokens.css` n'ont encore les jetons de verre (14 lignes de différence avec `staging` pour le fichier de la marque).

## Liens avec le reste
- Kit complet : [[Kit de marque (brand)]] ; règles lisibles : [[Charte graphique]].
- Utilisé (par copie) par l'app ([[Architecture de l'app]], [[Refonte glass]]) et le serveur de comptes ([[Serveur de licences]]) ; repris en alias par les pages du site ([[page.html]]).

## À savoir avant de modifier
- Modifier **à la fois** `tokens.json` et `tokens.css`, puis recopier dans `app/src/styles/tokens.css` et `licensing/public/tokens.css`, et vérifier les alias du site.
- Ne jamais réintroduire d'orange ni de second accent : règle de la v1.1 (05/10).
- Texte sur `#FF3B30` : toujours l'encre `#0A0A0B`.
