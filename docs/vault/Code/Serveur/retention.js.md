---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/retention.js
lignes: 19
maj: 2026-11-10
---
# retention.js

Applique les durées de conservation promises par la politique de confidentialité : efface les vieilles lignes du journal, des arrivées Discord, des inscriptions en attente et des essais gratuits. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Conformité juridique]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté avec l'essai gratuit (04/11/2026). La politique de confidentialité du site (générée par `site/tools/make_legal.py`, section « How long we keep it ») annonce ces durées ; ce fichier les applique. Il est appelé **toutes les heures** par le balayage de [[server.js]]. Les tests réseau ont leur propre purge dans [[network.js]] (12 mois).

## Ce que le fichier expose

| Nom | Valeur | Sens |
|---|---|---|
| `AUDIT_DAYS` | 365 | Journal de sécurité ([[Table audit]]) gardé 12 mois. |
| `TRIAL_DAYS_KEPT` | 730 | Essais gratuits ([[Table trials]]) gardés 2 ans, pour refuser un deuxième essai à la même personne ou la même carte. |
| `LEFT_DAYS` | 365 | Arrivées Discord ([[Table discord_joins]]) gardées 12 mois après le départ du membre. |
| `purgeOldRecords(db, now)` | | Lance les 4 suppressions. |

## Fonctionnement détaillé

`purgeOldRecords` exécute, dans l'ordre :
1. `DELETE FROM audit WHERE at < now − 365 j AND type NOT IN ('license.subscription_stopped', 'license.subscription_replaced')` : ces deux marqueurs restent **pour toujours**, car [[billing.js]] les relit pour savoir qu'un abonnement remplacé par Lifetime a déjà été arrêté ;
2. `DELETE FROM discord_joins WHERE left_at IS NOT NULL AND left_at > 0 AND left_at < now − 365 j` (les membres encore présents et les lignes `left_at = 0` restent) ;
3. `DELETE FROM signup_codes WHERE expires_at < now − 1 j` : une inscription en attente contient le hash du mot de passe d'un compte pas encore créé ;
4. `DELETE FROM trials WHERE started_at < now − 730 j`.

## Liens avec le reste

- Appelé par [[server.js]] (balayage horaire) et par le test « retention: security log and Discord leavers after 12 months, free trials after 2 years, subscription markers kept » ([[Tests du serveur]]).
- La suppression d'un compte à la demande (RGPD) est ailleurs : [[support.js]].

## À savoir avant de modifier

- Toute durée changée ici doit l'être aussi dans la politique de confidentialité du site ([[Conformité juridique]]), et l'inverse.
- Ne pas retirer l'exception des deux marqueurs d'abonnement : sans eux, le balayage horaire de [[billing.js]] pourrait réessayer d'arrêter un abonnement déjà arrêté.
