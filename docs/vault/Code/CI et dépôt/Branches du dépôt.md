---
type: carte
tags: [code, git, branches, dépôt]
maj: 2026-11-28
---
# Branches du dépôt

État des branches du dépôt GitHub `kaliso-dev/Rago` **après le ménage du 28/11/2026** (q81, décision de Sofiene : « oui c'est parti »). Fiche parente : [[Code de la CI et du dépôt]]. Règles et environnements : [[Branches et environnements]]. PR : [[Pull requests]].

Source : `git ls-remote`, `git rev-list` / `git cherry` contre `staging` (`d4c53c1`) et la prod (`2b8a471`), liste des 169 PR par `gh pr list --state all`. Statut : OBSERVÉ le 28/11 vers 01 h UTC.

## Le ménage du 28/11
- **Avant : 103 branches. Supprimées : 71. Restantes : 32.**
- Règle suivie : une branche est supprimée seulement si tout son contenu est déjà dans `staging` ou dans la prod (branche ancêtre de `staging` ou de la prod, `git cherry` vide, ou tête de branche contenue dans une PR fusionnée). Jamais supprimées : `staging`, la prod, les têtes de PR ouvertes, les branches avec un commit de moins de 24 h.
- Cas particulier : `design/rago-redesign-archive` (238 Mo d'images, PR #156) supprimée après vérification que le dépôt privé `kaliso-dev/rago-design` contient ses 1 154 fichiers à l'identique (même empreinte Git pour chaque fichier) ([[New Brand Rago]]).
- Une branche supprimée par erreur se recrée tant que GitHub garde ses commits : `gh api -X POST repos/kaliso-dev/Rago/git/refs -f ref=refs/heads/<nom> -f sha=<sha complet>`. Branches supprimées et leur tête : `claude/account-page-layout-iyr1qb` (`c87a6ca`), `claude/admin-grant-days-1t4j7g` (`9b0df29`), `claude/app-1.1.14` (`cdc8579`), `claude/app-redesign-glass-z5m1c8` (`57ea47f`), `claude/app-v5-analysis` (`2a1fac3`), `claude/app-v5-display` (`9f861c9`), `claude/app-v5-games` (`ea07f7a`), `claude/app-v5-ingame` (`1bc5a69`), `claude/app-v5-modules` (`ed320cb`), `claude/app-v5-mouse` (`b4f98b7`), `claude/app-v5-network` (`a07807f`), `claude/app-v5-settings` (`792e323`), `claude/app-v5-share` (`e6afb35`), `claude/app-v5-splash` (`54ca0cc`), `claude/app-v5-strict` (`3502528`), `claude/app-v5-tools` (`fc82cec`), `claude/app-v5-windows` (`451345d`), `claude/app-v5-windows-b` (`4a4aa56`), `claude/ci-prod-moins-de-builds` (`0d6dc6f`), `claude/countdown-launch-3yh36e` (`19b3390`), `claude/discord-growth-satipp` (`7f96295`), `claude/discord-pro-role-4v6sp7` (`ee27b8e`), `claude/free-tweaks-site-sync-le8nlb` (`995b238`), `claude/free-tweaks-site-sync-prod` (`995b238`), `claude/lifetime-plan-partners-dutm1k` (`7424c4a`), `claude/low-latency-power-plan-ne38fh` (`2e8fa40`), `claude/product-page-wpo7v3` (`162c0c1`), `claude/project-thread-0ij01e` (`dc5bdd3`), `claude/project-thread-0z6ufn` (`cf83667`), `claude/project-thread-2ar1he` (`40af44c`), `claude/project-thread-2btl2s` (`f784c8b`), `claude/project-thread-3xfdo7` (`bd145b4`), `claude/project-thread-49sqc3` (`ed2d64d`), `claude/project-thread-49sqc3-prod` (`94e30b7`), `claude/project-thread-5ln7f8` (`5d5dce3`), `claude/project-thread-7n0ikn` (`20f9594`), `claude/project-thread-8253ab` (`38d1fe5`), `claude/project-thread-8jxv9z` (`bb40393`), `claude/project-thread-ayd1at` (`dc8a08b`), `claude/project-thread-bhprt3` (`65f6dfa`), `claude/project-thread-bmc1pg` (`6fcd7e5`), `claude/project-thread-bmc1pg-prod` (`4d6274e`), `claude/project-thread-c7kp1c` (`8e4f993`), `claude/project-thread-g3od2h` (`4f89ac3`), `claude/project-thread-i5pq4g` (`d768bfa`), `claude/project-thread-iesde9` (`403f685`), `claude/project-thread-jyh9u0` (`93ad4e9`), `claude/project-thread-lh6mw1` (`7e4ce89`), `claude/project-thread-o1kjte` (`b31151c`), `claude/project-thread-ofup9b` (`fea4697`), `claude/project-thread-ofup9b-prod` (`32d57bc`), `claude/project-thread-r7gr4d` (`da2368a`), `claude/project-thread-tb9u7i` (`7323e66`), `claude/project-thread-tyht7t` (`2cf6040`), `claude/project-thread-u6htp7` (`ebf6647`), `claude/project-thread-v3d507` (`78630f1`), `claude/project-thread-v7otam` (`b4e70f5`), `claude/project-thread-voewre` (`7249230`), `claude/project-thread-xj2eim` (`cfc2cde`), `claude/project-thread-y7dmrv` (`5c4ebaf`), `claude/reviews-avatars-afvxy7` (`080d220`), `claude/secure-applied-json` (`5ce872c`), `claude/secure-scripts-1.1.11` (`5736d66`), `claude/secure-scripts-prod-1.1.11` (`d3ee01d`), `claude/site-nouveautes-1-2-0-discord-vg01q1` (`45656b3`), `claude/site-reviews-vsdsbi` (`d4ed085`), `claude/stats-reseau` (`d853c9b`), `claude/tweaks-restore-1-1-8-tcuyhj` (`7fc541e`), `claude/vault-build-splash` (`5057118`), `design/rago-redesign-archive` (`2425b16`), `vault-final` (`aba1fd2`).

## Les 32 branches restantes

### À garder (5)
| Branche | Pourquoi |
|---|---|
| `claude/rago-monorepo-initial-eyj6pq` | **prod** (branche par défaut ; [[Netlify]] et [[Railway]] déploient depuis elle) |
| `staging` | **pré-production**, référence du vault |
| `claude/project-thread-7emsbt` | PR #136 ouverte (accueil v6, ne pas fusionner) |
| `fix/stream-discord-priorite` | PR #155 ouverte (stream Discord, à tester sur Windows) |
| `claude/rago-account-page-rewards-nrvczv` | PR #165 fusionnée dans `staging` le 28/11 (page compte) ; branche supprimable |

### Déjà fusionnées, gardées parce qu'elles avaient un commit de moins de 24 h (12)
Leur contenu est dans `staging` ou la prod ; à supprimer au prochain ménage : `claude/cerveau-rago-design-explorer-7m3b9m` (#167), `claude/cerveau-rago-design-explorer-prod-7m3b9m` (#168), `claude/move-rago-redesign` (#166), `claude/pr143-vault-update-8po627` (#154, #158), `claude/rago-account-cancel-wpg03a` (#159), `claude/rago-failed-payments-wpg03a` (#160), `claude/rago-failed-payments-prod-wpg03a` (#161), `claude/rago-overlay-error-color-vzz2s6` (#164), `claude/rago-route-lifetime-subscription-wpg03a` (#157), `claude/vault-merges-q110-prod-wpg03a` (#162), `claude/vault-rago-design-prod-7m3b9m` (#169), `claude/vault-rago-route-release-40utcl` (#163).

### Jamais fusionnées (15) : décision de Sofiene (q138)
Commits absents de `staging` **et** de la prod. Gardées ; Claude recommande d'en supprimer 14 (tout est dépassé ou déjà refait ailleurs) et de garder `trailer-4k-footage` tant que Sofiene n'a pas confirmé avoir les rushes.

| Branche | Dernier commit | Commits non fusionnés | Contenu | Recommandation |
|---|---|---|---|---|
| `claude/project-thread-tzbch5` | 11/11 | 9 | vault seulement : e-mail Supabase, sauvegarde des clés, réglages Railway (q65), fiches [[Domaine et e-mails]] et [[Surveillance]] | supprimer : tout est repris dans `staging` ([[Clés et secrets]], [[Railway]], [[Supabase]]) |
| `claude/project-thread-k6pmox` | 11/11 | 1 | vault : inventaire des PR après la #92 | supprimer (dépassé) |
| `claude/project-thread-63o6u9` | 22/11 | 2 | vault : sortie de la 1.3.0 (PR #106 fermée) | supprimer (dépassé, [[Version 1.3.0]]) |
| `claude/project-thread-s0m3ex` | 04/11 | 1 | vault : « la 1.3.0 est sur staging » | supprimer (dépassé) |
| `claude/project-thread-rulzwj` | 01/11 | 3 | portage en prod du bot communauté (`licensing/`) + 2 commits du vault (PR #71 fermée) | supprimer : code en prod depuis la #105 ([[Bot communauté Discord]]) |
| `claude/project-thread-8oenwk` | 15/10 | 63 | app 1.1.x : RAG-66/67/68, « Tout annuler », remise à zéro des tweaks (59 fichiers, PR #51 fermée) | supprimer : repris dans la 1.1.14 et la suite ([[Versions 1.1.11 à 1.1.13]]) |
| `claude/project-thread-uy8yf3` | 14/10 | 47 | même travail que `8oenwk` (version plus ancienne, sans PR) | supprimer |
| `claude/auto-reset-tweaks-3ti5yy` | 10/10 | 1 | app 1.1.10 : remise à zéro des tweaks à la fin de Premium (PR #16 fermée) | supprimer (dépassé, [[Version 1.1.10]]) |
| `claude/reset-on-signout-uninstall` | 14/10 | 2 | app 1.1.13 : tout remettre à zéro à la déconnexion (PR #50 fermée) | supprimer (dépassé) |
| `claude/fix-discord-screenshare-ko1vyb` | 10/10 | 2 | packs GPU Safe sans MPO ni préemption (PR #21 fermée) | supprimer (sujet repris ailleurs) |
| `claude/fix-rbw-mod-services-vk0n2t` | 13/10 | 2 | RBW Mod « Activé » (PR #46 fermée) | supprimer (RBW Mod refait dans la 1.1.14) |
| `claude/project-thread-irhc93` | 11/10 | 1 | astuce de restauration après suppression d'applis (PR #26 fermée) | supprimer |
| `claude/project-thread-8teqin` | 01/11 | 1 | « charte graphique 2.2 » sur l'accueil, aperçu (PR #69 fermée) | supprimer (abandonné, [[Charte graphique]]) |
| `claude/local-dev-staging-oy4wlg` | 11/10 | 1 | `netlify.toml` : ne republier le site que quand il change (PR #24 fermée) | supprimer (jamais repris ; à refaire depuis `staging` si utile) |
| `trailer-4k-footage` | 29/10 | 4 | 17 rushes MP4 dans `trailer-4k/` (« temporary transfer »), aucune PR | garder jusqu'à ce que Sofiene confirme avoir les vidéos, puis supprimer ([[Vidéos YouTube]]) |

## Liens avec le reste
- Comment on travaille avec ces branches (staging d'abord, prod après validation) : [[Branches et environnements]], [[Règles de travail]].
- Ce que la CI lance selon la branche : [[app-windows.yml]], [[licensing-tests.yml]], [[site-check.yml]].
- Versions livrées par ces branches : [[Historique des versions]].

## À savoir
- Ne jamais renommer ni supprimer la branche de prod sans suivre l'ordre GitHub → Netlify → Railway (voir [[Fichiers de la racine du dépôt]], section README).
- Pour refaire l'état : `git fetch --prune`, puis pour chaque branche `git rev-list --count origin/staging..origin/<b>` et `git cherry origin/staging origin/<b>` (et pareil contre la prod), et `gh pr list --state all --json headRefName,state,headRefOid` (une tête de branche contenue dans le `headRefOid` d'une PR fusionnée = branche fusionnée, même après un « squash »).
