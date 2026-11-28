---
type: technique
tags: [technique, git, déploiement]
maj: 2026-11-28
---
# Branches et environnements

Règle : **staging d'abord, prod après validation** ([[Règles de travail]]).

| Branche | Rôle | État 25/11 |
|---|---|---|
| `claude/rago-monorepo-initial-eyj6pq` | **Prod et branche par défaut** : Netlify (site) et Railway (serveur) déploient depuis elle | **1.3.0** (app, serveur, site) depuis la PR #105 (22/11), plus l'admin, le cadre du Cerveau et les e-mails en v5 (PR #114, #117), les cerveaux Rago Client et Serveur Minecraft (PR #145, 25/11) et le hook [[Rago Hub]] (`.claude/`, PR #150 à #152, 26/11 ; le même `.claude/` est dans `staging` depuis le 27/11) ; dernier commit `ac4107a` (26/11 11:24 UTC) |
| `staging` | Pré-production (site staging Netlify, serveur `rago-staging`, Supabase `rago-staging`, Stripe test) | tout le chantier [[New Brand Rago]] : app [[Version 1.4.1]] (PR #108, #119 à #139), site v5 et accueil v6 (PR #109 à #135), pages compte et bot v5 (PR #107, #111) ; dernier commit `04d118b` (PR #141, 25/11) ; 60 commits que la prod n'a pas (25/11) |
| `claude/app-redesign-glass-z5m1c8` | Branche de travail de la 1.2 (PR #58, #62, #63, #66) | fusionnée |
| `claude/auto-reset-tweaks-3ti5yy`, `claude/project-thread-8oenwk`, `claude/reset-on-signout-uninstall`, `claude/project-thread-uy8yf3` | 1.1.10 et 1.1.11-1.1.13 | PR #16, #50, #51 fermées le 01/11 (fonctions présentes dans la 1.2.1) ; branches à garder ([[Versions 1.1.11 à 1.1.13]]) |

- **Inventaire des branches** : [[Branches du dépôt]]. Ménage du 28/11 (q81) : 71 branches fusionnées supprimées, 32 restantes (103 avant). PR ouvertes le 28/11 : #136 (accueil v6), #155 (stream Discord) ; #165 (page compte) fusionnée dans `staging` le 28/11. 15 branches jamais fusionnées attendent la décision de Sofiene (q138).
- Ce que chaque push ou PR déclenche en CI (depuis le 10/11, une branche de travail n'est testée que par sa PR) : [[Code de la CI et du dépôt]].
- Ne pas renommer la branche de prod : ça casserait Netlify et Railway (ordre à suivre : GitHub → Netlify → Railway).
- L'exe de l'app ne part **pas** d'une branche : il est construit par la CI ([[app-windows.yml]] : exe de test sur un push de `staging`, exe visant la prod sur une PR ou à la main) puis **déposé à la main** par Sofiene. Voir [[Publier une version]].
- Les PR de Claude visent `staging` (branche `claude/…` par fil). Environnements, adresses et commandes : [[Développer et tester]], [[Railway]], [[Netlify]], [[Supabase]].
- Supabase `rago-staging` (offre gratuite) se met en pause après une semaine d'inactivité.
- Minutes GitHub Actions : `rago` est public, donc ses builds sont gratuits ; le quota de 3 000 minutes sert aux dépôts privés (voir [[CI GitHub Actions]]).
