# Passer le design v5 « Match day » en vrai, sur staging

Demande de Sofiene, 22/11/2026 à 20 h 39 : « il faut envoyer ça sur staging donc l'app plus le site entièrement fonctionnel avec ce nouveau design ».
La revue des maquettes est terminée (version 16 de https://claude.ai/artifact/L4b3Esbh52YhYNssLV5esR, 135 maquettes validées).

## Les règles du dépôt (CLAUDE.md et vault)
- Dépôt `kaliso-dev/rago`, branche de départ **`staging`**. Une branche `claude/…` par fil, PR vers `staging`. Description de PR en français : « Avant : », « Après : », « Comment : ». Commits en phrases françaises.
- Lire d'abord `CLAUDE.md`, `docs/vault/Règles de travail.md`, `docs/vault/Technique/Reprendre le développement.md`, `docs/vault/Technique/Développer et tester.md`, et le `CLAUDE.md` du dossier touché.
- Sofiene a demandé l'envoi sur staging : la PR peut être fusionnée dans `staging` quand les tests passent. **Rien vers la prod** sans un nouvel accord de sa part.
- Aucun secret écrit nulle part ; ne jamais toucher aux clés de signature ni lancer `npm run keys`.
- Mettre le vault à jour à la fin (`docs/vault/Mettre à jour le vault.md`), en particulier `Design/Charte graphique.md` (la v5 remplace la charte v1.2 et la refonte « glass »).
- Le texte public (app, site, e-mails) reste en anglais US ; l'admin reste en français.
- Claude ne peut pas tester sur un vrai Windows : tout ce qui touche l'app est « jamais testé sur Windows » jusqu'au test de Sofiene (exe de test : artefact `rago-optimizer-setup-STAGING` du run `app-windows` sur `staging`).

## Où sont les maquettes
Tout est dans `/mnt/project-files/rago-redesign/rendus-v5/` :
- `inventaire-pages.md` (dossier parent) : chaque écran du dépôt, avec le fichier de code d'origine et la maquette v5 correspondante. **C'est la liste de travail.**
- `src/*.html` : la source HTML de chaque maquette (`app-*`, `site-*`, `acc-*`, `adm-*`, `inst-*`, `og-*`, `email-header`, `discord-*`, `marque-*`), avec les CSS (`rago5.css` = base et barre de l'app, `frame.css`, `pages.css`, `module.css`, `analysis.css`, `ingame.css`, `win.css`, `site5.css`, `tools.css`, `anim.css`…) et les scripts (`icons.js`, `printicons.js`, `anim.js`…). À ouvrir dans un navigateur pour lire les mesures exactes.
- `outils/` : les générateurs des maquettes (`gen_*.py`) et les icônes imprimées (`ricons/`).
- `marque/` : le kit logo final (`logo/` : SVG, PNG, `rago.ico`, `web/` favicons et images de partage, `installer/` .ico et .bmp de Tauri et NSIS), les tokens (`tokens/tokens.css`, `tokens.json`, noms `--rg-*` du dépôt), la charte (`charte-1…5.jpg`) et le bot Discord (`discord/`, `discord-messages.jpg`).
- `videos/` : animations de référence (démarrage, barre en jeu, Discord, transitions de l'app).

## Décisions prises pendant la revue (à respecter)
- Rouge #FF3B30, coins arrondis, titres Barlow Condensed 900 italique en capitales, texte en Barlow. Les polices doivent être embarquées (l'app n'a pas d'accès réseau).
- **Logo (22/11 au soir)** : le R est rouge plein partout ; l'icône de l'app est un R rouge sur une tuile blanche (.exe, .ico, favicon, installeur, avatar, barres du site, du compte, de l'admin, des e-mails). Plus de R blanc, de R imprimé, ni de tuile rouge. Sur la transition rouge plein écran de l'app, le R est noir.
- Icônes « imprimées » (formes pleines, couche rouge décalée) pour les icônes de l'interface, pas pour le logo.
- Effet carbone de la carte « This PC » : rayures en dégradé vers la gauche, sous le texte.
- Section Discord de l'accueil : animation Discord gardée telle quelle ; grand mot en contour du bandeau final : « RAGO » en capitales.
- Illustrations en cours de refonte (doc https://claude.ai/artifact/B7d4pxyJ49T6GtzznUPshi) : utiliser les illustrations actuelles des maquettes, elles seront remplacées ensuite (dont l'image de partage Rago Route).

## Découpage proposé (une PR vers `staging` par partie)
1. **App Windows** (`app/`) : maquettes 1 à 77 de la revue. Cadre (barre de titre, barre latérale, carte de mise à jour, bandeau de licence, barre « Apply », erreur de page), toutes les pages, fenêtres (connexion, Premium, confirmations, exécution, avis, résiliation, toasts), analyse, modules, barre en jeu (`overlay`), écran de démarrage, icône de la zone de notification, icônes de l'app et installeur (`src-tauri/icons`, bitmaps NSIS). Version : `npm run bump`, toujours au-dessus de tout exe déjà distribué.
2. **Site public** (`site/` + `netlify/`) : maquettes 78 à 98. Accueil, Rago Route (ordinateur et mobile), tous les tweaks, avis, partenaires, conditions, confidentialité, 404, compte à rebours (fonction edge `launch-gate`), images de partage, favicons. On modifie `site/src/*.html` puis `python3 site/tools/build.py`.
3. **Espace compte, e-mails et admin** (`licensing/`) : maquettes 99 à 129, plus le bot Discord (135, demande une modification de `licensing/src/community.js`). Pages compte (`public/account.*`), e-mails (en-tête, gabarit), admin (`public/admin.*`), `public/tokens.css`. `npm test` doit passer.
4. **Marque** : copier le kit `marque/logo/*` dans `brand/logo/` et `marque/tokens/*` dans `brand/tokens/` (correspondances dans la charte, chapitre 10). Peut partir avec la PR du site.
