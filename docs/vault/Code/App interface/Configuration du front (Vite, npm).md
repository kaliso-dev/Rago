---
type: code
tags: [code, app, config, vite, npm]
fichier: app/package.json, app/vite.config.ts, app/tsconfig.json, app/index.html, app/overlay.html, app/public/, app/ci/
lignes: 181
maj: 2026-11-10
---
# Configuration du front (Vite, npm)

Comment l'interface React de l'app est construite. Cette note couvre :
- les scripts `npm` ;
- la configuration de Vite et de TypeScript ;
- les deux pages HTML (l'app et la barre en jeu) ;
- le dossier `public/` ;
- l'ancienne copie du workflow dans `app/ci/`.

Fiche parente : [[Code de l'app (interface)]]. Côté Rust : [[Configuration Tauri]]. Mode d'emploi : [[Développer et tester]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## `package.json` (33 lignes)
- Nom `rago-optimizer`, `private`, **version `1.3.0`**, modules ES (`"type": "module"`).
- **La version vient d'ici** :
  - `tauri.conf.json` la lit (`"version": "../package.json"`) ;
  - Vite l'injecte dans l'interface (`__APP_VERSION__`) ;
  - elle est changée par `npm run bump`, jamais à la main.

| Script | Commande | Rôle |
|---|---|---|
| `dev` | `vite` | serveur de développement sur le port 1420 (lancé par Tauri en `tauri dev`) |
| `window` | `node tools/window.mjs` | **simulateur** : l'interface en mode démo dans une fenêtre de la taille de l'app (voir plus bas et [[window.mjs]]) |
| `build` | `tsc --noEmit && vite build` | vérifie les types, puis construit `dist/` (lancé par Tauri avant le build de l'exe) |
| `preview` | `vite preview` | sert le `dist/` construit |
| `catalog` | `python3 tools/build_catalog_v6.py` | régénère `src/data/catalog.json` et les scripts (voir [[build_catalog_v6.py]]) |
| `tauri` | `tauri` | outil Tauri (`npm run tauri dev`, `npm run tauri build`) |
| `bump` | `node tools/bump-version.mjs` | `npm run bump X.Y.Z` met la version dans `package.json` et `src-tauri/Cargo.toml` (voir [[bump-version.mjs]]) |

- **Dépendances** :
  - `@tauri-apps/api` 2.12 : `invoke`, `listen`, fenêtre ;
  - `@tauri-apps/plugin-dialog` 2.8 : boîtes Ouvrir et Enregistrer ;
  - `@tauri-apps/plugin-opener` 2.7 : ouvrir une URL ;
  - `geist` 1.7 ;
  - `lucide-react` 1.52 : icônes ;
  - `motion` 14 : animations, importé depuis `motion/react` ;
  - `react` et `react-dom` 19.3.
- **Outils de développement** : `@tauri-apps/cli` 2.12, `@vitejs/plugin-react` 6.1, `typescript` 7.0, `vite` 8.3, types React 19.
- Les deux plugins Tauri ne sont chargés qu'à la demande (`await import(...)` dans [[api.ts]]). Le mode démo du navigateur ne les charge donc jamais.
- La dépendance `geist` n'est importée nulle part dans `app/src` ni dans `app/tools` (OBSERVÉ par recherche). Les polices utilisées sont des copies dans `src/assets/fonts/` (voir [[Styles de l'app (CSS)]]).

## `vite.config.ts` (21 lignes)
- `base: "./"` : chemins relatifs, nécessaires quand Tauri sert les fichiers depuis le disque.
- Plugin React ; `clearScreen: false`, pour ne pas masquer les erreurs Rust dans la console.
- **Serveur** : port **1420** fixe (`strictPort`, Tauri l'attend : `devUrl` de [[Configuration Tauri]]). Le dossier `src-tauri/` est ignoré par le rechargement.
- `envPrefix: ["VITE_", "TAURI_ENV_"]` : seules ces variables arrivent dans l'interface.
- `define: { __APP_VERSION__ }` : la version de `package.json`.
- **Build** :
  - cible `es2022`, sans sourcemap, avertissement de taille à 900 Ko ;
  - **deux pages d'entrée** : `index.html` (l'app) et `overlay.html` (la barre en jeu, RAG-82, voir [[Overlay.tsx]]).

## `tsconfig.json` (19 lignes)
- Cible ES2022, bibliothèques ES2023 et DOM, modules `ESNext` avec résolution `bundler`, JSX `react-jsx`.
- Règles strictes : `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Une variable inutilisée fait donc échouer `npm run build`.
- `resolveJsonModule` : `catalog.json` et `free.json` s'importent directement (voir [[catalog.json]], [[free.json]]).
- `noEmit` : TypeScript ne fait que vérifier ; c'est Vite qui construit.
- Seul le dossier `src` est vérifié.
- Les types des variables `VITE_*` sont dans `src/vite-env.d.ts` (voir [[Petits composants de l'interface]]).

## Les deux pages HTML
- `index.html` (13 lignes) : `<div id="root">`, script `/src/main.tsx` (voir [[main.tsx (app)]]), icône `/favicon.svg`, titre « Rago Optimizer », `lang="en"`.
- `overlay.html` (12 lignes) : `<body class="overlay-body">`, script `/src/overlay/main.tsx` (voir [[main.tsx (barre en jeu)]]), même titre. Pas d'icône.
- `public/` ne contient que `favicon.svg` : le logo, une image de 256 × 256 avec des métadonnées d'origine (C2PA) dans le fichier.

## Variables lues au build
Ce sont des noms seulement ; les valeurs sont dans GitHub (voir [[Variables d'environnement]], [[app-windows.yml]]).

| Variable | Posée par le workflow | Lue par |
|---|---|---|
| `VITE_ACCOUNT_URL` | adresse de l'API du serveur choisi (prod ou staging) | [[LicenseGate.tsx]] (`ACCOUNT_URL` : créer un compte, mot de passe oublié) |
| `VITE_SITE_URL` | adresse du site | [[LicenseGate.tsx]] (`SITE_URL`, sinon `ACCOUNT_URL`), [[api.ts]] (lien d'achat de la démo) |
| `VITE_SUPPORT_URL` | variable `SUPPORT_URL` du dépôt, facultative | [[LicenseGate.tsx]] (`SUPPORT_URL`, sinon le Discord de Rago) |
| `VITE_RAGO_SERVER` | `staging` pour l'exe de test seulement | [[TitleBar.tsx]] (bandeau de l'exe de test), [[Settings.tsx]] (ligne réservée à l'exe de test), [[RouteTab.tsx]] (jeton pour le Mac) |

Sans ces variables (développement), le compte pointe vers `http://localhost:8787`.

## Le simulateur `npm run window`
- `tools/window.mjs` (46 lignes, voir [[window.mjs]]) démarre le serveur Vite avec la même configuration. Il lit ensuite la taille de la fenêtre dans `src-tauri/tauri.conf.json` (1280 × 820).
- Il cherche Chrome, Edge, Brave ou Chromium (ou `CHROME_PATH`) et l'ouvre en mode application (`--app=<url>`, sans barre d'adresse). Le moteur de rendu est le même que WebView2, qui dessine l'app sous Windows.
- Profil de navigateur à part, dans le dossier temporaire (`rago-optimizer-window`) : la fenêtre s'ouvre à la bonne taille, et l'état de la démo (Premium ou gratuit, réglages appliqués) est gardé d'un lancement à l'autre.
- Sur Mac, la fenêtre a 28 px de plus pour la barre de titre du système.
- Dans le navigateur, `isTauri` est faux : [[api.ts]] et [[accountApi.ts]] utilisent leurs **simulations** (`mockApi`), et rien ne touche au système.
- Connexion de démo : n'importe quel e-mail avec un mot de passe de 4 caractères ou plus donne Premium ; un e-mail qui commence par « free » reste au plan gratuit.
- Les paramètres d'URL de la démo (`?playing`, `?fastnet`, `?update`…) sont décrits dans [[Code de l'app (interface)]].

## `app/ci/build-windows.yml` (83 lignes)
- C'est une **ancienne copie** du workflow Windows. Son en-tête dit « À placer à la racine du dépôt : .github/workflows/app-windows.yml ».
- GitHub ne l'exécute pas. Le vrai workflow est `.github/workflows/app-windows.yml` (189 lignes, voir [[app-windows.yml]]), qui a en plus :
  - le choix du serveur staging ou prod ;
  - les mises à jour signées ;
  - PresentMon ;
  - le numéro de version de test.
- `app/README.md` renvoie encore à cette copie, et donne des chiffres d'avant (11 réglages gratuits, 198 réglages). Les deux sont en retard.

## À savoir avant de modifier
- Changer le port 1420 demande de changer aussi `devUrl` dans `tauri.conf.json` ([[Configuration Tauri]]).
- Une nouvelle fenêtre de l'app demande une nouvelle entrée dans `rollupOptions.input` et une page HTML.
- Une nouvelle variable pour l'interface doit commencer par `VITE_`, être déclarée dans `vite-env.d.ts` et posée par le workflow. Jamais de secret : tout ce qui est `VITE_*` est lisible dans l'exe.
