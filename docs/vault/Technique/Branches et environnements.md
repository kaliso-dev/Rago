---
type: technique
tags: [technique, git, déploiement]
maj: 2026-10-31
---
# Branches et environnements

Règle : **staging d'abord, prod après validation** ([[Règles de travail]]).

| Branche | Rôle | État 31/10 |
|---|---|---|
| `claude/rago-monorepo-initial-eyj6pq` | **Prod et branche par défaut** : Netlify (site) et Railway (serveur) déploient depuis elle | site + serveur à jour pour la 1.2.1 ; code app encore 1.1.14 |
| `staging` | Pré-production (site staging Netlify, serveur `rago-staging`, Supabase `rago-staging`, Stripe test) | app **1.2.1** |
| `claude/app-redesign-glass-z5m1c8` | Branche de travail de la 1.2 (PR #58, #62, #63, #66) | fusionnée |
| `claude/project-thread-vvpy7b` | Rago OS (PR #60), abandonné le 31/10 ([[Décisions]]) | PR encore ouverte, à fermer sur demande |
| `claude/auto-reset-tweaks-3ti5yy`, `claude/project-thread-8oenwk`, `claude/reset-on-signout-uninstall`, `claude/project-thread-uy8yf3` | 1.1.10 et 1.1.11-1.1.13 | à garder ([[Versions 1.1.11 à 1.1.13]]) |

- Ne pas renommer la branche de prod : ça casserait Netlify et Railway (ordre à suivre : GitHub → Netlify → Railway).
- L'exe de l'app ne part **pas** d'une branche : il est construit par la CI (`app-windows.yml`, cible prod ou staging) puis **déposé à la main** par Sofiene. Voir [[Publier une version]].
- Supabase `rago-staging` (offre gratuite) se met en pause après une semaine d'inactivité.
- Les minutes GitHub Actions peuvent s'épuiser (21/10) : vérifier Billing and plans.
