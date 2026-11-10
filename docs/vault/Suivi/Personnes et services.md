---
type: référence
tags: [personnes, services]
maj: 2026-11-10
---
# Personnes et services

Retour à [[Projet]]. Aucun identifiant ni secret ici ([[Clés et secrets]]).

## Personnes
- **Sofiene** (GitHub `kaliso-dev`) : propriétaire et décideur. Écrit en français, souvent vite ; préfère des réponses courtes, des questions à un mot, et dire « fusionne » / « push » pour lancer une mise en prod. Teste sur son PC Windows ; utilise aussi un Mac (dossier « NOUVELLES OPTIMISATIONS RAGO »).
- **Abel** : associé de Sofiene et co-fondateur de la communauté [[Discord]] (Sofiene, 01/11). Il gère le Discord (salons, rôles, bots, webhooks), trouve les partenariats Discord et YouTube ([[Partenaires et créateurs]]) et fait les vidéos (mots de Sofiene : « il s'occupe des vidéos du client rago et de la gestion du discord »). Sofiene répond aussi à certains clients sur le Discord. Son compte [[Linear]] est « acerSHOCK » (Sofiene, 01/11).
- **Testeurs proches** : un ami et un collègue de Sofiene installent les exe de test (15/10 : la 1.1.14 de test et ses logs ; 28/10 : la mise à jour automatique ; 08/11 : un compte rendu des performances de Rago Route est écrit pour le collègue). Pas de nom ici.
- Histoire (Sofiene, 10/11) : il y a 3 ans, Rago (Abel) et Straight faisaient les `.bat` Rago Hub, puis tout a été abandonné. **KALISO (Sofiene)**, ami d'Abel, a relancé une nouvelle version avec interface, puis l'a présentée à Abel. **Straight n'a aucun droit et ne travaille pas avec eux** ; le code est signé « KALISO and RAGO » et ne cite plus Straight (PR #76 : `.bat` historiques de `app/legacy`, « Made by KALISO and RAGO » dans À propos de l'app, copyright de l'installateur, `authors` de `Cargo.toml`, pieds de page du site et du compte ; l'éditeur Windows reste « Rago » pour ne pas casser les mises à jour). Sofiene et Abel doivent partager l'argent à deux ; rien d'écrit, pas de société ([[Conformité juridique]]).

## Services
| Service | Usage |
|---|---|
| GitHub `kaliso-dev/rago` | code, CI (3 workflows), artefacts exe ([[Branches et environnements]]) |
| Netlify | [[Site]] (prod, staging, aperçus) |
| Railway | [[Serveur de licences]] prod et staging |
| Supabase | Postgres + buckets privés `downloads` (exe) et `avatars` ; projet séparé `rago-staging` |
| Stripe | abonnements, Lifetime, codes promo, portail client (live depuis le 10/10) ; accessible à Claude en lecture depuis le 04/11 ([[Ventes Stripe]]) |
| Resend | emails `noreply@rago-optimizer.com` |
| OVH | domaine `rago-optimizer.com`, DNS, boîte Zimbra `support@rago-optimizer.com` |
| DB-IP | ville et fournisseur des tests réseau ([[Proxy]]) |
| Discord | communauté, rôle Pro, connexion ([[Discord]]) |
| Linear | tickets et documents ([[Linear]]) |
| Claude (projet « Rago optimizer (suite) ») | fils de travail, dossier partagé ([[Sources]]) ; liste et résumé des fils : [[Fils du projet]] |
| Vultr | serveurs de [[Proxy\|Rago Route]] : sortie à Paris et relais à Frankfurt (environ 5 $ par mois chacun, depuis le 06/11) ; serveurs de test du 05/11 (Frankfurt, Mumbai, New York, Chicago) qui ne servent plus. OVHcloud a été écarté le 05/11 ([[Infrastructure Rago Route]]) |
| Cloudflare | pas un service de Rago : Hypixel passe par Cloudflare, dont l'entrée la plus proche de la France est à Paris ; c'est pour cela que Rago Route sort à Paris ([[Fil - Développer les proxys Minecraft]]) |
| GitHub `network-server-rago` | dépôt séparé du serveur Minecraft (combat, lobby, practice, Bed Wars) ; privé, sa CI a vidé les minutes de novembre ; Sofiene doit le rendre public (décision du 10/11, [[CI GitHub Actions]]) ; lien avec le [[Client Minecraft Rago]] : À VÉRIFIER |
| Dépôt `nimbus` (Mac de Sofiene) | code de [[Rago OS]], branche `rago-design` ; pas sur le GitHub de Rago |
| Gestionnaire de mots de passe, moniteur de disponibilité | conseillés le 10/11 (Bitwarden pour les clés, un moniteur externe sur `/healthz`) ; adoptés ou non : À VÉRIFIER ([[Clés et secrets]]) |
