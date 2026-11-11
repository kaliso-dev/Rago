---
type: technique
tags: [technique, surveillance, railway, uptimerobot]
maj: 2026-11-11
---
# Surveillance

Comment savoir que le [[Serveur de licences]] de prod tombe avant qu'un joueur s'en plaigne. Voir [[Railway]], [[Supabase]].

## `/healthz`
`https://account.rago-optimizer.com/healthz` répond `{"ok":true}` **seulement si la base Supabase répond aussi**. C'est l'adresse à surveiller.

## Healthcheck Railway (en place)
Railway → service → Settings → **Healthcheck Path** = `/healthz`, délai 300 s (vu par Sofiene le 11/11). Un nouveau déploiement qui ne répond pas ne remplace pas celui qui marche. Ne prévient personne : ce n'est pas un moniteur.

## Moniteur externe : UptimeRobot (en place)
**Créé par Sofiene le 11/11** (« uptimerobot c'est bon ») : moniteur HTTP(s) sur `https://account.rago-optimizer.com/healthz`, alertes par e-mail à Sofiene. Intervalle et e-mail d'alerte exacts : ceux de la procédure ci-dessous, non revérifiés par Claude (pas d'accès à UptimeRobot).

Procédure (pour le refaire) :
1. Compte gratuit sur uptimerobot.com (identifiants dans le gestionnaire de mots de passe de Sofiene).
2. **New monitor** → type **HTTP(s)** → URL `https://account.rago-optimizer.com/healthz` → intervalle 5 min → alerte par e-mail à Sofiene → **Create**.
3. Le moniteur doit passer « Up ». S'il passe « Down » : regarder les logs Railway ([[Railway]]) et l'état du projet Supabase (quota, pause, voir [[Supabase]]).

## Autres signaux
- Logs Railway au démarrage : lignes `[warn]` (variables, Stripe, Discord manquants).
- `/admin` : état Stripe (prix, webhook, portail).
- E-mails de Supabase (quota, pause) et de Stripe (webhook en échec) dans la boîte Gmail de Sofiene.
