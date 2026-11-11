---
type: technique
tags: [technique, git, déploiement]
maj: 2026-11-11
---
# Branches et environnements

Règle : **staging d'abord, prod après validation** ([[Règles de travail]]).

| Branche | Rôle | État 10/11 |
|---|---|---|
| `claude/rago-monorepo-initial-eyj6pq` | **Prod et branche par défaut** : Netlify (site) et Railway (serveur) déploient depuis elle | site + serveur à jour pour la 1.2.1, plus le nouveau [[Tableau de bord admin]] et le [[Cerveau du vault]] (PR #87, 10/11) ; code app encore 1.1.14 |
| `staging` | Pré-production (site staging Netlify, serveur `rago-staging`, Supabase `rago-staging`, Stripe test) | app **1.3.0** (PR #70, 04/11 ; sortie avec Rago Route en bêta, PR #76, 10/11), pont [[Rago OS]] (#73, #74), nouvel admin (#77, #82, #83, #84), [[Cerveau du vault]] (#85) ; dernière fusion de code : PR #84 (`30f36e3`, 10/11 18:40 UTC) ; 186 commits d'avance sur la prod (l'admin y est arrivé par un portage, PR #87) |
| `claude/app-redesign-glass-z5m1c8` | Branche de travail de la 1.2 (PR #58, #62, #63, #66) | fusionnée |
| `claude/project-thread-vvpy7b` | Rago OS (PR #60), abandonné le 31/10 ([[Décisions]]) | PR fermée le 01/11, branche gardée |
| `claude/auto-reset-tweaks-3ti5yy`, `claude/project-thread-8oenwk`, `claude/reset-on-signout-uninstall`, `claude/project-thread-uy8yf3` | 1.1.10 et 1.1.11-1.1.13 | PR #16, #50, #51 fermées le 01/11 (fonctions présentes dans la 1.2.1) ; branches à garder ([[Versions 1.1.11 à 1.1.13]]) |

- **Inventaire complet des 55 branches** (dernier commit, PR, ce qui n'est pas fusionné) : [[Branches du dépôt]]. Seule PR ouverte le 11/11 à 08:50 UTC : **#71** (bot communauté Discord vers la prod, depuis le 01/11). #86 (« Best hitreg » par défaut), #89 (jeu en priorité haute), #90 ([[Page Outils]] refaite), #91 (conseils au lancement du jeu), #93 ([[Couleurs et résolution]]) et #94 ([[Graphismes des jeux]]) sont fusionnées dans `staging` le 11/11 à 08:47 UTC par la PR #92 (version test) ; #84 (ventes de l'admin dans une seule devise) fusionnée dans `staging` le 10/11 ; #87 (admin et Cerveau en prod, depuis `claude/project-thread-49sqc3-prod`) fusionnée dans la branche de prod le 10/11. Branches qui gardent du travail jamais proposé en PR : `claude/project-thread-tzbch5` (2 commits du vault sur Supabase, À VÉRIFIER) et `trailer-4k-footage` (17 vidéos de rushes, transfert temporaire).
- Ce que chaque push ou PR déclenche en CI (depuis le 10/11, une branche de travail n'est testée que par sa PR) : [[Code de la CI et du dépôt]].
- Ne pas renommer la branche de prod : ça casserait Netlify et Railway (ordre à suivre : GitHub → Netlify → Railway).
- L'exe de l'app ne part **pas** d'une branche : il est construit par la CI ([[app-windows.yml]] : exe de test sur un push de `staging`, exe visant la prod sur une PR ou à la main) puis **déposé à la main** par Sofiene. Voir [[Publier une version]].
- Les PR de Claude visent `staging` (branche `claude/…` par fil). Environnements, adresses et commandes : [[Développer et tester]], [[Railway]], [[Netlify]], [[Supabase]].
- Supabase `rago-staging` (offre gratuite) se met en pause après une semaine d'inactivité.
- Minutes GitHub Actions : `rago` est public, donc ses builds sont gratuits ; le quota de 3 000 minutes sert aux dépôts privés (voir [[CI GitHub Actions]]).
