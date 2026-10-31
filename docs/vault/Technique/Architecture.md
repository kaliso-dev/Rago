---
type: carte
tags: [technique]
maj: 2026-10-31
---
# Architecture

Monorepo privé GitHub `kaliso-dev/rago` (aussi écrit `kaliso-dev/Rago`). Retour à [[Projet]].

| Chemin | Rôle | Note |
|---|---|---|
| `app/` | App Windows Tauri 2 (Rust) + React/TypeScript | [[App Windows]] |
| `licensing/` | Serveur comptes, licences, paiement (Node 22, Hono, Postgres) | [[Serveur de licences]] |
| `site/` + `netlify/` | Site statique sur Netlify | [[Site]] |
| `brand/` | Kit de marque (tokens, logos, charte, voix) | [[Charte graphique]] |
| `.github/workflows/` | `app-windows.yml`, `licensing-tests.yml`, `site-check.yml` | [[Publier une version]] |
| `docs/vault/` | Ce vault | [[Mettre à jour le vault]] |
| `README.md`, `DEVELOPPEMENT.md` | Guides (FR) ; le README est en retard sur les versions | |

Flux : le joueur achète sur le [[Site]] → Stripe → le [[Serveur de licences]] crée la licence → l'[[App Windows]] se connecte, reçoit un jeton signé Ed25519 et la clé des scripts Premium → elle applique les tweaks. L'exe est servi depuis Supabase Storage par le serveur.

Services externes : voir [[Personnes et services]]. Environnements et branches : [[Branches et environnements]].
