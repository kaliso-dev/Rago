---
type: code
tags: [code, site, html, javascript]
fichier: site/src/tweaks.html
lignes: 876
maj: 2026-11-28
---
# tweaks.html

Source de la page Tweaks (`rago-optimizer.com/tweaks.html`) : téléchargement gratuit de l'app en haut, puis les 218 tweaks expliqués un par un, avec recherche, filtres et fiche détaillée. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109 vers `staging`, 22/11). Fichier de 879 lignes et environ 585 Ko, dont l'essentiel est la liste des fiches générée. Passée au design v5 le 22/11 ([[Charte graphique]]) : même mise en page et même script qu'avant, avec les couleurs, polices, boutons, en-tête et pied v5 et les icônes imprimées. La page publiée `site/tweaks.html` est produite par [[build.py]] (`v5.css?v=`, `accountBase`, image de partage versionnée) : ne jamais la modifier à la main. Créée le 12/10 (PR #39, alors « 199 tweaks »).

## Rôle et place dans l'ensemble
- Page de destination du bouton « Download free » de l'accueil et de tous les liens « See every tweak ». Elle sert à la fois de page de téléchargement du plan gratuit et de catalogue public.
- Deux outils l'écrivent :
  - [[sync_tweaks.py]] remplace tout ce qui est entre `<!-- tw:nav|goals|chips|list -->` et les marqueurs de fin, ainsi que les nombres (`n-all`, `n-free`, `n-mods`, `n-presets`, le titre, « Search 218 tweaks ») ;
  - [[build.py]] fabrique la page publiée.
- Tout le reste (structure, CSS, JavaScript, textes du haut et du bas) s'écrit à la main dans ce fichier.

## Plan du fichier
`<head>` (titre `All 218 tweaks · Download Rago Optimizer`, description, canonical, `og:*` et Twitter, `v5.css`, `<style>` propre à la page : l'ancienne mise en page passée sur les jetons v5), sprite d'icônes (entre `<!-- icons -->` et `<!-- /icons -->`, écrit par `sync_icons.py`), en-tête, section `#download`, section `#tweaks` (principes, explorateur, liste), section finale, pied de page, fiche `#sheet`, dialogues `#send` et `#dlg`, toast, script.

## Sections et boutons
- **En-tête** `header.s-nav#top` (v5) : logo vers `./`, liens Why Rago (`./#why`), Features, Rago Route (`route.html`), **Tweaks** (page courante), Pricing (`./#pricing`), FAQ ; « Sign in » (`js-account`, caché sur téléphone) ; « Get Premium » → `./#pricing`. Plus de menu mobile ni de flèche « Scroll » depuis le 22/11.
- **`#download`** (« Free download for Windows ») : titre « Download Rago Optimizer. Start free. » (interlettrage -0,01 em depuis le 22/11 au soir : à -0,05 em les lettres se chevauchaient) ; carte d'installation avec l'icône de l'app `img/v5/rago-icon.svg` (R rouge sur tuile blanche), texte « No account needed: 68 tweaks are open from the first launch, and Premium unlocks all 218 in the same app. » ; boutons « Download latest version » (classe `js-free-app`, vers `/download` du serveur de comptes) et « Explore the 218 tweaks » ; ligne d'infos : `#ver` (« Always the latest version », remplacé par « Version X » lu sur `/api/v1/installer`), « Windows 10 and 11, 64-bit », `RagoOptimizer-Setup.exe` ; garanties « No account needed », « Restore point offered », « Most tweaks undo with one switch » ; carte animée de l'installateur (barre 0 → 100 %) et trois étapes (télécharger, autoriser malgré l'écran SmartScreen « Windows protected your PC » faute de certificat de signature payant, choisir ses tweaks) ; « Only download Rago from this site. ».
- **Bande de chiffres** : 218 tweaks, 10 sections, 68 open in the free plan, 20 one-click presets, 1 switch to undo most tweaks.
- **`#tweaks`** (« Every tweak, in plain words. ») : trois principes, puis l'explorateur `#ex` :
  - barre latérale `#side` : navigation par section (`<!-- tw:nav -->`), interrupteurs « Show only » : Free tweaks (`data-f="free"`), Safe tweaks (`safe`), No restart needed (`nb`) ; objectifs « Helps with » (`<!-- tw:goals -->`) ; sur tablette et téléphone elle s'ouvre par-dessus la page avec le bouton « Filters » `#fbtn` ;
  - barre `#bar` (collante) : champ `#q` (« Search 218 tweaks: mouse, ping, NVIDIA… », raccourcis `/` et `Ctrl+K`), bouton effacer `#q-x`, puces des sections (`<!-- tw:chips -->`), compteur « Showing all 218 tweaks », suggestions `#sugg` (mouse, ping, fps, nvidia, laptop, privacy), « Reset filters » ;
  - liste `#list` (`<!-- tw:list -->`) : une `<section class="grp">` par module, des `<details class="tc">` par tweak (format décrit dans [[sync_tweaks.py]]) ; état vide avec `#empty-reset`.
- **Section finale** : depuis le 22/11 au soir, la même bande rouge que l'accueil (`section.s-final`, mot « RAGO » en contour) : « Your next match », « Start with the free tweaks. Unlock the rest when you want. », boutons « Download free » et « Get Premium » (l'ancienne section sombre était jugée « moche » et illisible par Sofiene). La phrase « Same app, free or Premium. Download it now […] » a été retirée le 22/11 au soir (demande de Sofiene) ; le titre était décalé à cause d'une classe `.in` partagée avec les animations, corrigé (voir [[v5.js]]).
- **Pied** : le pied de page v5 commun (product, dont Rago Route ; community ; account ; legal) et l'avertissement (résultats variables, point de restauration, Minecraft marque de Mojang).
- **Fiche `#sheet`** (panneau latéral, feuille du bas sur téléphone) : chemin (module · section), nom, résumé, badges, « What it's for » + le détail de la fiche ; boutons précédent / suivant, position « k / n », « Copy link » ; bouton d'action « Download free » (tweak gratuit, vers `/download`) ou « Unlock with Premium » (vers `./#pricing`).
- **Dialogue `#send`** (visiteur qui n'est pas sous Windows) : « Rago runs on your PC. Send it there. », adresse à recopier, « Copy link », « Share » (API `navigator.share`), « On this device anyway? Download the installer » (`#send-dl`).
- **Dialogue `#dlg`** (après un clic de téléchargement sous Windows) : « Download started », « Three steps to your first tweaks. », « Got it », « See Premium », « Nothing downloaded? Try again ».

## Ce que le script expose
- `CONFIG` : `accountBase` (`https://account.rago-optimizer.com`, réécrit par [[build.py]]), `previewAccountBase` (rempli par [[preview.sh]] sur les aperçus), `loginPath`, `signupPath`, `affiliatePath`, `freeAppPath` (`/download`).
- `HOST`, `acct(p)`, `ACCOUNT_OFF` (`#account-off`) : même choix de serveur que [[page.html]] :
  - nom d'hôte vide, `localhost`, `127.0.0.1`, `[::1]`, adresses privées (10.x, 192.168.x, 172.16-31.x) ou `.local` → `http://<hôte>:8787` (serveur local, `npm run local`) ;
  - `*.netlify.app` (aperçus) → `previewAccountBase`, ou `null` si vide : tout lien `#account-off` affiche alors le toast « Account pages are off on this preview (STAGING_ACCOUNT_URL isn't set on Netlify). » ;
  - sinon le serveur de prod.
- `REF` : code d'affilié lu dans `?ref=` (2 à 40 caractères `A-Za-z0-9_-`), écrit dans `localStorage.rago_ref` (`{c, t}`, lu ensuite par l'accueil pour 30 jours) et `sessionStorage.rago_ref` ; la page elle-même ne relit que `sessionStorage`. Il sert à `sendUrl()` (`origin + pathname + ?ref=… + #download`).
- `trap(d)` : garde la touche Tab dans un dialogue ouvert.
- `onWindows` : détection par `navigator.userAgent` ou `userAgentData.platform`.
- `toast(m)` : message 2,8 s.

## Fonctionnement détaillé
### Recherche et filtres
- `norm(s)` : minuscules, accents retirés (`NFD` + suppression des diacritiques).
- `SYN` : synonymes des mots des joueurs : `fps`, `frames`, `ping`, `lag`, `delay`, `stutter`, `hit`, `hits`, `wifi`, `net`, `internet`, `gpu`, `cpu`, `ram`, `ssd`, `disk`, `bloat`, `debloat`, `telemetry`, `battery`, `undo`, `keyboard`, `mc` (→ minecraft).
- Chaque fiche devient un objet `T[i]` avec `m`, `h` (objectifs), `free` (`data-p="free"`), `safe` (`data-r="safe"`), `nb` (`data-b="0"`) et des champs normalisés : `name` (nom + alias), `tags` (objectifs, section, module), `sum` (résumé), `rest` (détail).
- `score(t, mots)` : **chaque mot doit trouver une correspondance** (sinon 0) ; pour chaque mot, meilleur score parmi ses synonymes : le nom commence par le mot 14, mot entier dans le nom 11, contenu dans le nom 9, dans les objectifs / section 6, dans le résumé 4, ailleurs 1.
- `pass(t)` : filtres section (`S.m`), objectif (`S.h`), Free, Safe, No restart.
- `apply()` : affiche les fiches qui passent, triées par score pendant une recherche (ordre de l'app sinon), surligne les mots avec `<mark>` dans le nom et le résumé, cache les sections vides, met à jour les compteurs « n of m » à côté de chaque section et objectif (ce qu'on obtiendrait en le choisissant), le texte « Showing … », l'état vide et le bouton de réinitialisation. La recherche est gardée dans l'adresse (`?q=`, `history.replaceState`) pour pouvoir être partagée ; au chargement, `?q=` (80 caractères au plus) est relu.
- Saisie : recalcul 60 ms après la dernière frappe ; `Esc` vide le champ ; `Entrée` ferme le clavier et descend à la liste.

### Fiche détaillée et liens directs
- Cliquer sur le résumé d'une fiche ouvre `#sheet` au lieu de déplier le `<details>` (sans JavaScript, le `<details>` se déplie normalement).
- L'adresse prend `#<id>` (`replaceState`) : `tweaks.html#kbm_accel` ouvre directement cette fiche ; un ancien id de jumeau (attribut `data-ids`) la retrouve aussi. Les ancres `#download`, `#numbers` et `#tweaks` sont ignorées.
- Flèches gauche / droite : fiche précédente / suivante parmi les fiches affichées ; `Esc` ferme et rend le focus au résumé.
- « Copy link » copie `origin + pathname + #id` et affiche « Link copied: share it to point to this tweak. ».
- Le bouton d'action d'une fiche gratuite se comporte comme les autres boutons de téléchargement (dialogue `#send` hors Windows).

### Téléchargement
- Tous les liens `.js-free-app` pointent vers `/download` du serveur de comptes (lien public de l'installateur, sans licence). Hors Windows, le clic ouvre `#send` au lieu de télécharger (sauf `#send-dl`). Sous Windows, le téléchargement part et `#dlg` s'ouvre.
- La version affichée vient de `GET /api/v1/installer` (champ `version`, accepté seulement s'il ressemble à `1.3.0`) ; en cas d'échec le texte reste « Always the latest version ».

### Animations
Apparition des blocs au défilement (`IntersectionObserver`, classe `pre`), animation de l'installateur (barre de 2 200 ms, étapes), indicateur de défilement `#cue`, lumière rouge qui suit le pointeur sur les fiches (`--mx`, `--my`). Tout est coupé avec `prefers-reduced-motion`.

## Données touchées
- Réseau : `GET <accountBase>/api/v1/installer` (voir [[API du serveur]]).
- `localStorage.rago_ref`, `sessionStorage.rago_ref`.
- Adresse de la page : `?q=`, `#id`.

## Erreurs et cas limites
- Sans JavaScript : la liste complète reste lisible (fiches `<details>`), les chiffres sont justes (écrits par [[sync_tweaks.py]]), les liens du serveur de comptes sont absolus ; la recherche, les filtres et la fiche latérale n'existent pas.
- Aperçu Netlify sans `STAGING_ACCOUNT_URL` : liens de compte remplacés par `#account-off` ([[preview.sh]]) et toast d'explication.
- `/api/v1/installer` en panne : la version n'est simplement pas affichée.

## Liens avec le reste
- Écrite par [[sync_tweaks.py]] (liste) à partir de [[catalog.json]], [[free.json]] et [[tweaks-copy.json]] ; publiée par [[build.py]] ; vérifiée par [[site-check.yml]] ; retouchée par [[preview.sh]] sur les aperçus.
- Le téléchargement passe par le serveur de comptes ([[Serveur de licences]], route `/download`).
- Pages sœurs : [[page.html]] (accueil, même feuille `v5.css`), [[reviews.html]], [[partners.html]].

## À savoir avant de modifier
- « 68 » tweaks gratuits : le même chiffre sur l'accueil et la page compte depuis le 28/11 (q75, [[sync_app.py]]).
- Ne pas retirer les marqueurs `<!-- tw:… -->` ni changer les classes `n-all`, `n-free`, `n-mods`, `n-presets` sans adapter [[sync_tweaks.py]].
- La page doit garder une seule ligne `<link rel="stylesheet" href="v5.css">` (attendue par [[build.py]]).
- Les icônes des modules et des fiches viennent du jeu v5 (`#i-network`, `#i-graphics`…), plus des icônes Lucide.
