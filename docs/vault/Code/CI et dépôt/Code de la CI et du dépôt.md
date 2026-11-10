---
type: carte
tags: [code, ci, github-actions, dépôt, carte]
maj: 2026-11-10
---
# Code de la CI et du dépôt

Carte des fichiers qui ne sont ni l'app, ni le serveur, ni le site : les workflows GitHub Actions, les fichiers de la racine du dépôt et l'inventaire des branches. Fiches techniques parentes : [[CI GitHub Actions]], [[Branches et environnements]], [[Architecture]].

Tout est CONFIRMÉ d'après le code de `staging` (10/11), sauf les chiffres d'exécution et l'état de GitHub Pages, OBSERVÉS par l'API GitHub le 10/11.

## Les notes
| Note | Rôle en une ligne |
|---|---|
| [[app-windows.yml]] | tests Rust et fabrication de l'installateur Windows (exe de prod ou « Rago Optimizer Staging »), PresentMon, signature des mises à jour |
| [[licensing-tests.yml]] | tests du serveur de comptes (PGlite puis vrai Postgres 16) et contrôle de l'image Docker de Railway (photos de profil) |
| [[site-check.yml]] | reconstruit le site avec `build.py` et exige que les pages commitées soient à jour |
| [[Fichiers de la racine du dépôt]] | `README.md`, `DEVELOPPEMENT.md`, `CLAUDE.md`, `Dockerfile` (inutilisé), `_config.yml` (GitHub Pages), `.gitignore`, `.dockerignore` |
| [[Branches du dépôt]] | les 55 branches GitHub : dernier commit, PR, ce qui n'est pas fusionné |

Notes voisines : la configuration Netlify ([[netlify.toml]], [[preview.sh]], [[launch-gate.js]]) est rangée avec le site dans [[Code du site]].

## Qui se déclenche quand
| Événement | `app-windows` | `licensing-tests` | `site-check` |
|---|---|---|---|
| PR qui touche le dossier concerné | oui (exe **visant la prod**, artefact `rago-optimizer-setup`) | oui | oui |
| push sur `staging` | oui (exe de test « Staging ») | oui | oui |
| push sur la prod | **non** | oui | oui |
| push sur une autre branche | non | non | non |
| tag `app-v*` | oui (brouillon de release ; jamais utilisé) | non | non |
| lancement manuel | oui (`server`, `version`) | oui | oui |
| fichiers surveillés | `app/**` + le workflow | `licensing/**` + le workflow | `site/**` + le workflow |

Chaque workflow annule son run précédent sur la même référence (`concurrency`). Règle du 10/11 (PR #78 sur `staging`, #81 en prod) : une branche de travail est testée par sa PR, pas par ses push, pour ne pas tout faire deux fois.

## Ce qui relie la CI aux déploiements
```
PR ──► app-windows (exe prod, artefact) ─┐
   ├─► licensing-tests ──────────────────┤  checks verts = condition pour fusionner
   └─► site-check ───────────────────────┘
fusion dans staging ──► Netlify (staging--…) + Railway (rago-staging) + app-windows (exe Staging)
fusion dans la prod ──► Netlify (rago-optimizer.com) + Railway (account.…) [« Wait for CI » : licensing-tests]
                    └─► GitHub Pages (« pages build and deployment », publie aussi docs/ : voir _config.yml)
exe de prod ──► téléchargé à la main par Sofiene ──► Supabase `downloads` + INSTALLER_VERSION (Railway)
```
Détails : [[Publier une version]], [[Netlify]], [[Railway]], [[Mise à jour automatique]].

## Durées observées (runs réussis, depuis le 04/11)
| Workflow | Médiane | Plage | Machine |
|---|---|---|---|
| `app-windows` | 7,7 min | 5 à 13 min (28 sans cache) | `windows-latest` |
| `licensing-tests` | 6,3 min | 3 à 7 min | `ubuntu-latest` (2 jobs parallèles) |
| `site-check` | 0,7 min | 0,5 à 2,5 min | `ubuntu-24.04` |
Le dépôt est public : ces minutes ne sont pas décomptées (voir [[CI GitHub Actions]] pour la question du passage en privé).

## Problèmes relevés le 10/11
- **`site-check` rouge sur la branche de prod** : la prod a encore `ubuntu-latest` (Ubuntu 26.04 depuis le 09/11), où Playwright 1.56.1 ne s'installe pas ; le correctif `98181fb` n'est que sur `staging`. Le push de la prod du 10/11 à 15:05 a échoué ([[site-check.yml]]).
- **GitHub Pages actif** et qui publie le vault de la branche de prod ([[Fichiers de la racine du dépôt]], `_config.yml`).
- Le test de la fonction edge `netlify/launch-gate.test.mjs` n'est lancé par aucun workflow et échoue depuis la date du lancement ([[launch-gate.js]]).
- `app/ci/build-windows.yml` est une ancienne copie inactive du workflow Windows ([[app-windows.yml]]).
- Les guides de la racine sont en retard sur plusieurs points ([[Fichiers de la racine du dépôt]]).

## Secrets et variables (noms seulement)
- `app-windows` : secrets `RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY`, `STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY`, `RAGO_SCRIPTS_SECRET`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` ; variables `SITE_URL`, `STAGING_SITE_URL`, `SUPPORT_URL`, `RAGO_UPDATER_PUBKEY` ; jeton automatique `github.token` (PresentMon).
- `licensing-tests` et `site-check` : aucun secret.
Valeurs, rôle et règles : [[Variables d'environnement]], [[Clés et secrets]].
