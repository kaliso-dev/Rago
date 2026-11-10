---
type: technique
tags: [technique, railway, déploiement, serveur]
maj: 2026-11-11
---
# Railway

Hébergement du [[Serveur de licences]] (`licensing/`). Code : [[Architecture du serveur]]. Base et fichiers : [[Supabase]]. Variables : [[Variables d'environnement]].

## Projet et environnements
Un projet Railway relié au dépôt GitHub `kaliso-dev/Rago`, un service (le serveur), deux environnements :
| Environnement | Branche suivie | Adresses | Base |
|---|---|---|---|
| `production` | `claude/rago-monorepo-initial-eyj6pq` | `https://account.rago-optimizer.com` (domaine perso, CNAME `account` chez OVH) et `https://rago-production.up.railway.app` (**à garder** : les apps 1.1.7 et avant l'ont en dur ; c'est aussi l'adresse du webhook Stripe live d'origine) | Supabase de prod |
| `staging` | `staging` | `https://rago-staging.up.railway.app` | Supabase `rago-staging` |

L'environnement `staging` est une copie de `production` (Duplicate) avec ses propres variables ; son nom suffit à en faire un serveur de test (`RAILWAY_ENVIRONMENT_NAME`, ou `APP_ENV=staging`). Coût : plan Hobby, environ 5 $ par mois (README).

## Construction et lancement
- **Root Directory** = `licensing` : Railway construit `licensing/Dockerfile` (`node:22-alpine`, `npm ci --omit=dev`, copie `src`, `public`, `scripts`, `supabase`, `NODE_ENV=production`, `PORT=8787`, `npm start`). Le `Dockerfile` de la racine (site + serveur) n'est **pas** utilisé.
- Pas de volume : tout l'état est dans Supabase. Seuls l'état en mémoire (limites de débit, liens de connexion de l'app, cache) est perdu à chaque redéploiement.
- **Un seul réplica** : les tâches périodiques et le bot Discord tournent dans le processus ([[Architecture du serveur]]).
- Au démarrage, les lignes `[warn]` des logs disent ce qui manque (variables, prix Stripe, webhook, Discord). Un serveur de prod sans `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou avec un `PUBLIC_URL` non https **refuse de démarrer**, comme un staging avec une clé Stripe live ou la base d'un autre environnement.

## Réglages conseillés du service
Écrits dans `licensing/docs/MISE-EN-LIGNE.md` (étape 5) ; état réel en prod vu par Sofiene le 11/11 (q65) : **Wait for CI activé**, **Healthcheck Path = `/healthz`** (délai 300 s par défaut), **Watch Paths vide** (à remplir : `/licensing/**`), **aucun moniteur externe** (à créer). Claude n'a pas accès à Railway.
- **Watch Paths** = `licensing/**` : un push qui ne touche que l'app ou le site ne redéploie pas le serveur.
- **Wait for CI** : Railway attend les vérifications GitHub du commit (dont `licensing-tests`). Revers : si une autre vérification du commit échoue (build de l'app, `site-check`), le déploiement peut être **sauté** (*Skipped*) et un commit suivant qui ne touche pas `licensing/` ne le relance pas. Après chaque fusion qui touche `licensing/`, regarder **Deployments** et cliquer **Redeploy** si besoin.
- **Healthcheck Path** = `/healthz` (répond `{"ok":true}` seulement si la base répond) : un déploiement cassé ne remplace pas celui qui marche.
- Moniteur externe (UptimeRobot) sur `https://account.rago-optimizer.com/healthz` : **pas encore créé** (11/11), voir [[Surveillance]].

## Déployer
- Prod : fusion d'une PR dans la branche de prod qui touche `licensing/` (sur « fusionne » de Sofiene). Staging : fusion dans `staging`.
- Changer une variable redéploie le service. Les variables de mise à jour de l'app (`INSTALLER_VERSION`, `UPDATE_ROLLOUT`, `UPDATE_PAUSED`, `UPDATE_NOTES`) se changent **sans PR**, par Sofiene ([[Publier une version]]).
- Vérifier après coup : `/healthz`, `/admin` (Stripe : prix, webhook, portail « OK »), `/download/status`, `/api/v1/update/status`.

## Lire les logs
Railway → service → **Deployments** → **View logs**. Préfixes : `[warn]`, `[stripe]`, `[discord]`, `[community]`, `[affiliate]`, `[network]`, `[retention]`, `[db]`, `[mail]` (e-mails écrits dans les logs quand Resend n'est pas configuré, c'est le cas normal en local).

## Support depuis un terminal
`cd licensing && DATABASE_URL=<celle de Railway> npm run admin -- <commande>` (liste dans [[Serveur de licences]]). Seul Sofiene a ces valeurs ; Claude ne les demande pas et ne les écrit nulle part.
