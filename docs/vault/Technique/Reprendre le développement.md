---
type: carte
tags: [technique, reprise, index]
maj: 2026-11-11
---
# Reprendre le développement

> **Nouveau Claude qui doit toucher au code ?** Lis [[Projet]], [[État actuel]] et [[Règles de travail]], puis cette note. Elle dit, pour chaque type de tâche, quelle fiche lire, quels fichiers ouvrir, quelles commandes lancer et quels pièges éviter. Tout ce qui est écrit ici a été vérifié dans le code de `staging` le 10/11/2026.

## 1. Le dépôt en 30 secondes
Monorepo **public** `kaliso-dev/rago` (GitHub l'affiche aussi `kaliso-dev/Rago`). Cinq briques :

| Brique | Dossier | Techno | Hébergement | Fiche |
|---|---|---|---|---|
| App Windows « Rago Optimizer » | `app/` | Tauri 2 (Rust) + React 19 / TypeScript / Vite | exe NSIS construit par GitHub Actions, déposé dans Supabase Storage | [[Architecture de l'app]], [[App Windows]] |
| Serveur de comptes, licences, paiements, bot Discord | `licensing/` | Node ≥ 22.5 (ESM), Hono, Postgres | Railway (`account.rago-optimizer.com`) | [[Architecture du serveur]], [[API du serveur]] |
| Base de données et fichiers | `licensing/supabase/schema.sql` | Postgres + Storage | Supabase | [[Supabase]] |
| Site de vente | `site/`, `netlify/` | HTML statique généré par Python | Netlify (`rago-optimizer.com`) | [[Netlify]], [[Site]] |
| Rago Route (tunnel anti-lag) | `proxy/` + `app/src-tauri/src/route.rs` | Python (serveurs), Rust (PC) | 2 VPS Vultr (Paris, Frankfurt) | [[Infrastructure Rago Route]], [[Proxy]] |

Hors dépôt : [[Rago OS]] (bureau Windows, sur le Mac de Sofiene, dossier `nimbus`) parle à l'app par un canal nommé ; [[Client Minecraft Rago]] est un projet à part.

**Une note par fichier de code** (dossier `Code/` du vault) : chaque fichier y a sa fiche (rôle, fonctions, données touchées, pièges). Partir de la carte de la brique : [[Code de l'app (Rust)]], [[Code de l'app (interface)]], [[Code du générateur de catalogue]], [[Code du serveur]], [[Code du site]], [[Code de Rago Route]], [[Code de la CI et du dépôt]]. Pour voir tout le vault en graphe et ouvrir n'importe quel fichier du dépôt : [[Cerveau du vault]] (`/admin/cerveau`).

Vue d'ensemble et flux entre les briques : [[Architecture]]. Paiement : [[Paiements Stripe]]. Toutes les variables : [[Variables d'environnement]]. Fabrication et tests automatiques : [[CI GitHub Actions]]. Lancer en local : [[Développer et tester]].

## 2. Branches : où travailler
- **`staging`** porte la dernière app (1.3.0 au 10/11), le serveur et le site de test, et le vault le plus récent. **Toute PR part de `staging` et y revient** ([[Règles de travail]]).
- **`claude/rago-monorepo-initial-eyj6pq`** est la branche de **prod** (Netlify et Railway prod déploient depuis elle). Elle reçoit une PR « (prod) » seulement après validation de Sofiene. Son code app est en retard (1.1.14) : c'est normal, l'app part de `staging`.
- Détail : [[Branches et environnements]].

## 3. « Je dois… » → quoi lire, quoi toucher

| Tâche | Fiches | Fichiers principaux | Vérifier avec |
|---|---|---|---|
| Ajouter ou corriger un tweak | [[Catalogue des tweaks]], [[Moteur des tweaks]], [[Code du générateur de catalogue]] | `app/tools/*.py`, les textes dans `app/tools/descriptions.json` (jamais les JSON générés), `app/src/data/free.json` | `npm run catalog`, `cargo test`, puis `python3 docs/tools/catalogue_vault.py` |
| Changer un écran de l'app | [[Architecture de l'app]], la note de l'écran (ex. [[Tableau de bord]]) | `app/src/pages/*.tsx`, `app/src/components/*.tsx`, textes dans `app/src/lib/i18n.ts` (EN + FR) | `npm run window` (démo navigateur), `npm run build` |
| Ajouter une commande Rust appelée par l'interface | [[Architecture de l'app]] | `#[tauri::command]` dans `app/src-tauri/src/lib.rs` + `generate_handler!`, appel dans `app/src/lib/api.ts` **et son simulateur** | `cargo test`, `npm run build` |
| Toucher à la licence, au compte, à l'essai | [[Licence dans l'app]], [[API du serveur]], [[Paiements Stripe]] | `app/src-tauri/src/license.rs`, `licensing/src/app.js`, `licensing.js`, `billing.js`, contrat `licensing/docs/API.md` | `cd licensing && npm test` |
| Ajouter une page ou une route au serveur | [[Architecture du serveur]], [[API du serveur]] | `licensing/src/app.js` (routes), `views.js` (HTML), `licensing.js` (logique) | `npm run local`, `npm test` |
| Ajouter une table ou une colonne | [[Supabase]] | `licensing/supabase/schema.sql` (idempotent, rejoué au démarrage) | `npm test` (PGlite et vrai Postgres 16 en CI) |
| Ajouter une variable d'environnement | [[Variables d'environnement]] | `licensing/src/config.js` + `licensing/.env.example` + `licensing/docs/MISE-EN-LIGNE.md` | avertissement au démarrage (`cfg.warnings`) |
| Modifier le site | [[Netlify]], [[Site]] | `site/src/*.html`, puis `python3 site/tools/build.py` | CI `site-check`, aperçu Netlify de la PR |
| Sortir une version de l'app | [[Publier une version]], [[Mise à jour automatique]] | `cd app && npm run bump X.Y.Z` | CI `app-windows`, `/api/v1/update/status` |
| Bot Discord | [[Bot communauté Discord]], [[Architecture du serveur]] | `licensing/src/discord.js` (rôle Pro, récompenses), `community.js` + `gateway.js` (bot communauté) | `npm test` (`community.test.js`) |
| Rago Route | [[Infrastructure Rago Route]], [[Proxy]] | `proxy/rago-route.py`, `proxy/fabriquer-install.py`, `app/src-tauri/src/route.rs`, `app/src/pages/RouteTab.tsx` | `cargo test`, tests en labo décrits dans [[Proxy]] |
| Pont avec Rago OS | [[Rago OS]], [[Architecture de l'app]] | `app/src-tauri/src/bridge.rs`, `bridge_handler` dans `lib.rs`, `boost.rs` | `cargo test` (`bridge_tests`) |
| Couleurs et résolution par jeu, réglages des pros (branche `claude/project-thread-7n0ikn`, 11/11) | [[Couleurs et résolution]], [[display.rs]], [[Display.tsx]] | `app/src-tauri/src/display.rs`, `app/src/pages/Display.tsx`, `app/src/data/pros.json` (relevé à revérifier avant chaque sortie, [[pros.json]]) | `cargo test` (11 tests `display::`), `npm run window` (`?amd`, `?intel`) ; les pilotes et l'écran ne se vérifient que sur un vrai Windows |
| Support d'un joueur | [[Problèmes joueurs]], [[Serveur de licences]] | `npm run admin -- show <email>` (depuis `licensing/`, avec le `DATABASE_URL` de prod que seul Sofiene a) | — |

## 4. Les pièges qui ont déjà coûté cher
1. **Ne jamais changer les clés** : `LICENSE_SIGNING_KEY` / table `server_secrets`, `SCRIPTS_SECRET` = `RAGO_SCRIPTS_SECRET`, `TAURI_SIGNING_PRIVATE_KEY`. Les apps installées cesseraient de valider leur licence, d'ouvrir leurs scripts Premium ou de se mettre à jour. **Jamais `npm run keys`.** Voir [[Clés et secrets]].
2. **Ne jamais éditer à la main** `app/src/data/catalog.json`, `app/src-tauri/scripts/*.json`, `site/index.html`, `site/tweaks.html`, `site/reviews.html`, `site/partners.html`, `site/route.html`, `proxy/install.sh`, ni les notes `Tweaks/` du vault : ils sont générés.
3. **Numéro de version toujours plus haut** que tout exe distribué (pas 1.1.11 à 1.1.13, pas 1.2.9 : utilisés en test). Toujours par `npm run bump`.
4. **Le front n'a pas d'accès réseau** (CSP `connect-src ipc:`) : tout appel HTTP passe par une commande Rust (`ureq`).
5. **Chaque commande ajoutée à `api.ts` doit avoir son équivalent dans le simulateur** (`isTauri` faux), sinon `npm run window` casse.
6. **Le moteur Rust revérifie le plan gratuit** (`catalog::over_free_slots`, `free.json`) : un verrou ajouté seulement dans l'interface est contournable, un verrou ajouté seulement dans Rust donne une interface qui ment. Les deux.
7. **Exe de test ≠ exe de prod** : l'exe `rago-optimizer-setup-STAGING` (« Rago Optimizer Staging ») ne va **jamais** dans le Supabase de prod.
8. **Railway peut sauter un déploiement** quand « Wait for CI » est actif et qu'une autre vérification du commit échoue : regarder l'onglet Deployments ([[Railway]]).
9. **Claude ne teste pas sur Windows** : toute nouveauté Windows reste « jamais testée sur Windows » tant que Sofiene ne l'a pas essayée ([[Règles de travail]]).
10. **Rien sur GitHub sans demande de Sofiene** ; « fusionne » / « push » = accord pour la PR concernée.

## 5. Conventions de code
- Commentaires et messages de commit **en français** ; textes vus par les joueurs **en anglais US** (app : anglais par défaut, français dans Paramètres ; site, e-mails, pages de compte, Discord : anglais). Voix : [[Voix et ton]], `brand/voice-en.md`.
- Les journaux du serveur lus par Sofiene (`/admin`, avertissements Stripe, Discord) sont en français ; le reste des logs en anglais.
- Chaque fichier commence par un commentaire qui dit son rôle et ses règles : le lire avant de modifier.
- Dates et décisions de Sofiene citées dans les commentaires (« Sofiene, 04/11 : … ») : garder cette habitude, elle explique le pourquoi.
- Pas de nouvelle dépendance sans raison : le serveur n'a que 6 dépendances, le bot Discord n'utilise aucune bibliothèque (WebSocket de Node 22).
- Description de PR : « Avant : », « Après : », « Comment : » ; PR vers `staging`.

## 6. À la fin de la tâche
Suivre [[Mettre à jour le vault]] : la fiche de la brique touchée doit décrire le code tel qu'il est après la PR (routes, tables, variables, commandes).
