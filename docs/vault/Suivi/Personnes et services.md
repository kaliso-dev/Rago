---
type: référence
tags: [personnes, services]
maj: 2026-11-11
---
# Personnes et services

Retour à [[Projet]]. Aucun identifiant ni secret ici ([[Clés et secrets]]).

## Personnes
- **Sofiene** (GitHub `kaliso-dev`) : propriétaire et décideur. Écrit en français, souvent vite ; préfère des réponses courtes, des questions à un mot, et dire « fusionne » / « push » pour lancer une mise en prod. Teste sur son PC Windows ; utilise aussi un Mac (dossier « NOUVELLES OPTIMISATIONS RAGO »).
- **Abel** : associé de Sofiene et co-fondateur de la communauté [[Discord]] (Sofiene, 01/11). Il gère le Discord (salons, rôles, bots, webhooks), trouve les partenariats Discord et YouTube ([[Partenaires et créateurs]]) et fait les vidéos (mots de Sofiene : « il s'occupe des vidéos du client rago et de la gestion du discord »). Sofiene répond aussi à certains clients sur le Discord. Son compte [[Linear]] est « acerSHOCK » (Sofiene, 01/11).
- Histoire (Sofiene, 10/11) : il y a 3 ans, Rago (Abel) et Straight faisaient les `.bat` Rago Hub, puis tout a été abandonné. **KALISO (Sofiene)**, ami d'Abel, a relancé une nouvelle version avec interface, puis l'a présentée à Abel. **Straight n'a aucun droit et ne travaille pas avec eux** ; le code doit être signé « KALISO et RAGO » et ne plus citer Straight (à faire). Sofiene et Abel doivent partager l'argent à deux ; rien d'écrit, pas de société ([[Conformité juridique]]).

## Services
| Service | Usage |
|---|---|
| GitHub `kaliso-dev/rago` | code, CI (3 workflows), artefacts exe ([[Branches et environnements]]) |
| Netlify | [[Site]] (prod, staging, aperçus) ([[Netlify]]) |
| Railway | [[Serveur de licences]] prod et staging ([[Railway]]) |
| Supabase ([[Supabase]]) | Postgres + buckets privés `downloads` (exe) et `avatars` ; projet séparé `rago-staging` |
| Stripe ([[Paiements Stripe]]) | abonnements, Lifetime, codes promo, portail client (live depuis le 10/10) ; accessible à Claude en lecture depuis le 04/11 ([[Ventes Stripe]]) |
| Resend | emails `noreply@rago-optimizer.com` ([[Domaine et e-mails]]) |
| OVH | domaine `rago-optimizer.com`, DNS, boîte Zimbra `support@rago-optimizer.com` ([[Domaine et e-mails]]) |
| Vultr | 2 VPS Rago Route, Paris et Frankfurt, 5 $/mois chacun ([[Infrastructure Rago Route]]) |
| Google Cloud | connexion « Continue with Google » (clés OAuth) ([[Connexion Google et Discord]]) |
| Discord Developer Portal | application du bot et connexion Discord ([[Connexion Google et Discord]], [[Discord]]) |
| UptimeRobot | moniteur de `/healthz`, **à créer** ([[Surveillance]]) |
| Gestionnaire de mots de passe | toutes les clés et identifiants (11/11, [[Clés et secrets]]) |
| DB-IP | ville et fournisseur des tests réseau ([[Proxy]]) |
| Discord | communauté, rôle Pro, connexion ([[Discord]]) |
| Linear | tickets et documents ([[Linear]]) |
| Kling AI | plans vidéo générés ([[Trailer 1.2]]) |
| Claude (projet « Rago optimizer (suite) ») | fils de travail, dossier partagé ([[Sources]]) |
