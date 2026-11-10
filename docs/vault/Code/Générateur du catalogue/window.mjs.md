---
type: code
tags: [code, app, outil, javascript, démo]
fichier: app/tools/window.mjs
lignes: 46
maj: 2026-11-10
---
# window.mjs

Lance l'interface de l'app en **mode démo navigateur**, dans une fenêtre de la taille de l'app Windows, sur un Mac ou n'importe quel ordinateur. Rien ne touche au système : les tweaks, les infos du PC et la connexion sont simulés. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Développer et tester]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 10/10 (commit `d1fd99c`, « Développer sans toucher à la prod »), jamais modifié depuis. Les commentaires du fichier sont en anglais.

## Rôle et place dans l'ensemble
- Commande : `cd app && npm run window` (script `"window": "node tools/window.mjs"`). Ctrl+C arrête Vite.
- Il démarre le serveur de développement Vite (port fixe 1420, `strictPort`, fixé dans `app/vite.config.ts`) et ouvre un navigateur Chromium (Chrome, Edge, Brave ou Chromium) **sans barre d'adresse** : même moteur que WebView2, qui dessine l'app sur Windows, donc le rendu le plus proche de ce que voient les joueurs. Les modifications du code s'affichent en direct.
- Le mode démo est celui du simulateur de `app/src/lib/api.ts` (quand `isTauri` est faux) : toute commande ajoutée à l'API doit y avoir son équivalent, sinon cette démo casse ([[Reprendre le développement]], piège n° 5 ; [[Architecture de l'app]]).

## Fonctionnement détaillé
1. Lit `app/src-tauri/tauri.conf.json` et prend `width` et `height` de la première fenêtre (1280 × 820 au 10/11).
2. `createServer({ root: app/, configFile: vite.config.ts })`, `listen()`, affiche les adresses ; URL = première adresse locale, sinon `http://localhost:1420/`.
3. Cherche un navigateur, dans cet ordre : la variable d'environnement `CHROME_PATH`, puis selon le système :
   - macOS : `Google Chrome`, `Microsoft Edge`, `Brave Browser`, `Chromium` dans `/Applications` puis `~/Applications` ;
   - Windows : `Google/Chrome/Application/chrome.exe`, `Microsoft/Edge/Application/msedge.exe` sous `PROGRAMFILES`, `PROGRAMFILES(X86)`, `LOCALAPPDATA` ;
   - Linux : `/usr/bin/google-chrome`, `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/microsoft-edge`.
4. Sans navigateur : affiche « No Chrome, Edge or Brave found: open <url> in one of them (Safari works too, with small differences). »
5. Avec navigateur : le lance détaché avec `--app=<url>`, `--window-size=<largeur>,<hauteur + 28 sur macOS>` (la barre de titre du Mac fait environ 28 px), `--user-data-dir=<dossier temporaire>/rago-optimizer-window` (profil propre : bonne taille même si le navigateur tourne déjà, et l'état de la démo, Premium ou gratuit, tweaks appliqués, est gardé d'un lancement à l'autre), `--no-first-run`, `--no-default-browser-check`.
6. Affiche la taille et le mode d'emploi de la démo : **n'importe quel e-mail et un mot de passe d'au moins 4 caractères = Premium ; un e-mail qui commence par « free » reste sur le plan gratuit** (règle du simulateur de `api.ts`).

## Données touchées
Aucune donnée du projet. Crée ou réutilise le profil de navigateur `rago-optimizer-window` dans le dossier temporaire du système.

## Liens avec le reste
- Mode démo de l'interface : [[Architecture de l'app]], [[App Windows]] ; textes et écrans : [[Tableau de bord]].
- Utilisé dans le processus décrit par [[Développer et tester]] et [[Règles de travail]] (Claude ne teste pas sur Windows : la démo ne remplace pas un essai sur un vrai PC).

## À savoir avant de modifier
- Le port 1420 est imposé par Tauri (`vite.config.ts`) : ne pas le changer ici.
- La taille vient de `tauri.conf.json` : changer la taille de la fenêtre de l'app change aussi celle de la démo.
