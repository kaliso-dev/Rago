---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
maj: 2026-11-27
---
# Table trial_ips

**Un essai gratuit par réseau** (27/11, q104, Sofiene : « carte requise pour essai gratuit pas paypal et faudrait même que ça reconnaisse l'ip »). Une ligne par essai vraiment commencé, avec l'empreinte de l'IP qui a ouvert le paiement. Définie dans [[schema.sql]] (juste après [[Table trials]]), créée au démarrage du serveur comme les autres tables (rien à créer à la main dans Supabase). Fiche parente : [[Code du serveur]]. PR « Résiliation sur la page compte, un Premium par e-mail, un essai par réseau » vers `staging` (fil HUB-d1451f), non fusionnée.

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `subscription_id` | TEXT | clé primaire | Abonnement Stripe de l'essai | [[billing.js]] (`settleTrial`) |
| `ip_hash` | TEXT | NOT NULL | HMAC-SHA256 de l'IP avec `TRIAL_IP_SALT` (64 caractères hexadécimaux), **jamais l'IP** | [[billing.js]] (`trialIpHash`, calculé par `/buy` dans [[app.js]]) |
| `started_at` | BIGINT | NOT NULL | Début de l'essai (ms) | [[billing.js]] |

Index `trial_ips_hash (ip_hash, started_at)`. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Qui écrit, qui lit
- **Écrit** : `settleTrial` ([[billing.js]]) quand l'essai démarre vraiment (pas quand il est refusé) ; l'empreinte arrive dans la métadonnée `trial_ip` du Checkout.
- **Lit** : `/buy` ([[app.js]], `trialIpUsed`) : un réseau qui a démarré un essai dans les 6 derniers mois n'en a pas d'autre (page « Free trial already used on this network ») ; `settleTrial`, pour deux paiements ouverts en même temps.
- **Efface** : [[retention.js]], au-delà de 6 mois (`TRIAL_IP_DAYS` = 183 jours), comme promis par la politique de confidentialité ([[Conformité juridique]]).

## À savoir
- Changer `TRIAL_IP_SALT` rend toutes les empreintes inutiles (chaque réseau retrouverait un essai) : ne jamais le changer ([[Variables d'environnement]]).
- Liée : [[Table trials]] (e-mail et carte), [[Paiements Stripe]].
