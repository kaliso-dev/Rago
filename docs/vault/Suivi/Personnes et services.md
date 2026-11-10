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
| Kling AI | plans vidéo générés ([[Trailer 1.2]]) |
| Claude (projet « Rago optimizer (suite) ») | fils de travail, dossier partagé ([[Sources]]) |
