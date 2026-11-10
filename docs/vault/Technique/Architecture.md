---
type: carte
tags: [technique]
maj: 2026-11-10
---
# Architecture

Monorepo GitHub `kaliso-dev/rago`, **public** (constaté le 10/11 ; Sofiene : « on build en public ») (aussi écrit `kaliso-dev/Rago`). Retour à [[Projet]]. Pour savoir quoi lire avant de coder : [[Reprendre le développement]].

## Dossiers du dépôt
| Chemin | Rôle | Fiche |
|---|---|---|
| `app/` | App Windows : Tauri 2 (Rust, `src-tauri/`) + React/TypeScript (`src/`), générateur du catalogue (`tools/`), anciens `.bat` (`legacy/`) | [[Architecture de l'app]], [[App Windows]] |
| `licensing/` | Serveur Node : comptes, licences, Stripe, mises à jour de l'app, tests réseau, bot Discord, pages de compte | [[Architecture du serveur]], [[API du serveur]] |
| `licensing/supabase/schema.sql` | Schéma Postgres complet, rejoué à chaque démarrage | [[Supabase]] |
| `site/` | Site de vente statique ; sources dans `site/src/`, pages publiées générées par `site/tools/build.py` | [[Netlify]], [[Site]], code : [[Code du site]], [[Fichiers publiés du site]] |
| `netlify/`, `netlify.toml` | Fonction edge `launch-gate` (compte à rebours du lancement, inactive), script des aperçus `preview.sh`, redirections | [[Netlify]], code : [[netlify.toml]], [[preview.sh]], [[launch-gate.js]] |
| `proxy/` | Rago Route côté serveurs : `rago-route.py` (sortie et relais), `mcping.py`, `install.sh` généré par `fabriquer-install.py` | [[Infrastructure Rago Route]] |
| `brand/` | Kit de marque : `tokens/` (CSS, JSON), `logo/`, `charte.html`, `voice-en.md`, `tools/export-logo.js` | [[Charte graphique]], [[Voix et ton]], code : [[Kit de marque (brand)]], [[tokens.css (marque)]], [[export-logo.js]] |
| `.github/workflows/` | `app-windows.yml`, `licensing-tests.yml`, `site-check.yml` | [[CI GitHub Actions]], code : [[Code de la CI et du dépôt]] |
| `Dockerfile`, `_config.yml`, `.gitignore`, `.dockerignore` (racine) | `Dockerfile` : variante site + serveur sur un seul domaine, **non utilisée** (Railway utilise `licensing/Dockerfile`) ; `_config.yml` : réglage de GitHub Pages, **encore actif** et qui publie `docs/` (OBSERVÉ le 10/11) | [[Railway]], [[Fichiers de la racine du dépôt]] |
| `docs/vault/`, `docs/tools/catalogue_vault.py` | Ce vault et le générateur des notes `Tweaks/` ; `docs/vault/Code/` : une note par fichier de code, rangées par brique, chacune avec sa note carte | [[Mettre à jour le vault]], [[Code du site]], [[Code de la CI et du dépôt]] |
| `README.md`, `DEVELOPPEMENT.md`, `CLAUDE.md`, `app/README.md`, `licensing/README.md`, `licensing/docs/API.md`, `licensing/docs/MISE-EN-LIGNE.md` | Guides en français écrits pour Sofiene (et consignes pour Claude) ; certains chiffres (198 réglages, 11 gratuits) et le raccourci de la barre en jeu (Ctrl+Maj+R au lieu d'Alt+X) sont en retard sur le code, le vault fait foi | [[Sources]], [[Fichiers de la racine du dépôt]] |

## Schéma
```
 Joueur ──► rago-optimizer.com (Netlify, site/)
              │ boutons Sign in / Get Premium / Download
              ▼
 account.rago-optimizer.com (Railway, licensing/) ◄── webhook ── Stripe
   │  pages de compte (HTML rendu par le serveur)          ▲
   │  /api/v1 (seulement l'app)                            │ Checkout, portail, codes promo
   │  Postgres + Storage ──► Supabase (prod)               │
   │  bot Discord (REST + gateway) ──► Discord             │
   │  e-mails ──► Resend                                   │
   ▼                                                        │
 Rago Optimizer.exe (PC Windows, app/) ── HTTPS ───────────┘ (jamais Stripe directement)
   │  canal nommé local ◄── Rago OS (bureau, autre programme)
   └─ UDP 25600 chiffré ──► sorties Rago Route (Vultr Paris, relais Frankfurt) ──► Hypixel / Minemen
```

## Les flux qui traversent plusieurs briques
1. **Achat** : site → `GET /buy?interval=month|year` (ou `/buy/lifetime`, `?trial=1`, `?ref=`, `?promo=`) → session Stripe Checkout → webhook `checkout.session.completed` → licence créée → e-mail avec lien `/claim/:token` → compte. Détail : [[Paiements Stripe]].
2. **Activation dans l'app** : `POST /api/v1/auth/login` (email + mot de passe, ou lien navigateur Google/Discord depuis la 1.3.0) → `activation_required` → `POST /licenses/activate` → jeton de licence EdDSA 30 jours + `scripts_key` → l'app déchiffre ses scripts Premium. Rafraîchi par `POST /licenses/refresh`. Détail : [[API du serveur]], [[Licence dans l'app]].
3. **Fin de Premium** : Stripe (annulation, impayé, remboursement, litige) → webhook → licence `revoked` → au prochain refresh l'app reçoit `revoked` → [[Remise à zéro]] automatique des réglages. Le bot Discord retire le rôle Pro.
4. **Mise à jour de l'app** : CI → artefact `.exe` + `.exe.sig` → Sofiene les dépose dans le bucket `downloads` de Supabase → `INSTALLER_VERSION` sur Railway → l'app interroge `/api/v1/update/windows/x86_64/<version>` au lancement et toutes les 4 h. Détail : [[Mise à jour automatique]], [[Publier une version]].
5. **Téléchargement** : `/download` → lien signé Supabase de 5 min vers le `.exe` le plus récent du bucket. Le site affiche la version par `/api/v1/installer`.
6. **Test réseau** : l'app mesure, puis `POST /api/v1/network/report` ; le serveur ajoute ville et fournisseur (bases DB-IP) et oublie l'IP ; `/admin/reseau` résume. Détail : [[Test réseau]], [[Proxy]].
7. **Rago Route** (staging) : l'app demande `POST /api/v1/route/token` (jeton `typ: route`, 6 h, licence Premium active) → l'envoie chiffré à la sortie Vultr, qui le vérifie avec la clé publique du serveur. Détail : [[Infrastructure Rago Route]].
8. **Rôle Discord** : liaison depuis `/account/discord` (OAuth2) → le bot donne ou retire le rôle Pro selon la licence, toutes les 5 min et après chaque webhook. Détail : [[Bot communauté Discord]], [[Architecture du serveur]].

## Environnements
| | Production | Staging |
|---|---|---|
| Branche | `claude/rago-monorepo-initial-eyj6pq` | `staging` |
| Site | `https://rago-optimizer.com` | `https://staging--rago-optimiser.netlify.app` |
| Serveur | `https://account.rago-optimizer.com` (+ `rago-production.up.railway.app`, à garder) | `https://rago-staging.up.railway.app` |
| Base | projet Supabase de prod | projet Supabase `rago-staging` (gratuit, se met en pause après 7 jours sans activité) |
| Stripe | live | mode test (carte `4242 4242 4242 4242`) |
| App | « Rago Optimizer » `gg.rago.optimizer` | « Rago Optimizer Staging » `gg.rago.optimizer.staging`, s'installe à côté |

Détail : [[Branches et environnements]], inventaire des branches : [[Branches du dépôt]]. Services externes : [[Personnes et services]].
