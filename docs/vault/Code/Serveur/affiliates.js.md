---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/affiliates.js
lignes: 237
maj: 2026-11-10
---
# affiliates.js

Programme d'affiliation : un code par affilié, un parrainage par acheteur, règles anti-triche (même PC, même payeur, remboursement), et récompense de 6 mois de Premium à 3 joueurs comptés. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Promotions et affiliation]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Le joueur rejoint le programme sur `/affiliate` ([[app.js]], page dans [[views.js]]). Son code sert de lien (`/buy?ref=CODE`) et de **code promo Stripe** à −5 % (créé par [[billing.js]]). L'acheteur le donne une seule fois (lien, code promo à la caisse, ou saisie juste après l'achat). Les parrainages sont évalués à l'activation du PC du filleul, à l'ouverture de `/affiliate`, à la connexion dans l'app et **toutes les heures** ([[server.js]]). Règles décidées par Sofiene le 07/10/2026 : 3 joueurs par code, compte dès l'activation (`AFFILIATE_HOLD_DAYS=0`), une seule récompense de 6 mois.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `normalizeCode(v)` | Majuscules, lettres et chiffres seulement, 16 caractères au plus. |
| `getAffiliate(db, userId)`, `affiliateByCode(db, code)` | Lecture de [[Table affiliates]]. |
| `joinAffiliate(db, userId)` | Crée l'affilié avec un code de **6 caractères** tirés dans `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sans 0/O ni 1/I) ; 5 essais en cas de collision ; renvoie la ligne existante si déjà inscrit. Audit `affiliate.joined`. |
| `codeFull(db, cfg, aff)` | Vrai si l'affilié a déjà ses récompenses (`rewards >= AFFILIATE_REWARD_MAX`, si ce maximum n'est pas 0) ou si les parrainages non annulés atteignent `AFFILIATE_MAX_REFERRALS` (3). |
| `checkCode(db, code, buyerEmail, cfg)` | Avant la création du compte : `invalid_code`, `code_full`, `self_referral` (e-mail de l'affilié). |
| `recordReferral(db, aff, referredUserId, license, cfg)` | Crée le parrainage. Refus `self_referral` (même compte, licence pas sur ce compte, même e-mail que l'affilié, même client Stripe qu'une licence de l'affilié) et `code_full`. Audit `referral.created`. Si le PC est déjà activé, son empreinte est recopiée tout de suite. |
| `rememberDevice(db, userId, parsed)` | Note un PC depuis lequel le compte s'est connecté dans l'app (même gratuit) dans [[Table account_devices]] (`fp` = les 3 hash joints par `|`). |
| `voidReferrals(db, licenseIds, reason)` | Annule les parrainages de ces licences (`refunded`, `disputed`, `test_mode`…). Si le parrainage était déjà compté et que l'affilié a reçu sa récompense : audit `affiliate.reward_at_risk` (la récompense **reste** : la reprendre est la décision de Sofiene). |
| `evaluateAffiliate(db, cfg, userId, {stripe, log})` | Compte les parrainages et donne la récompense. Voir plus bas. |
| `affiliateSummary(db, cfg, userId)` | Tout ce qu'affiche `/affiliate`. |
| `affiliatesToEvaluate(db, cfg)` | Ids à évaluer au balayage horaire. |
| `maskEmail(email)` | `ab••••@domaine` (2 premiers caractères, 2 à 6 points). |
| `settleAffiliate(db, cfg, stripe, log, userId)` | `evaluateAffiliate` qui ne lève jamais (log `[affiliate] evaluation failed`). |

## Fonctionnement détaillé

### Comptage (`evaluateAffiliate`, première transaction, ligne affilié verrouillée)
Parrainages examinés : `pending`, dont la licence a été achetée il y a au moins `AFFILIATE_HOLD_DAYS` jours (0 = tout de suite) et **dont le PC est activé** (`machine_guid` non nul). Pour chacun, dans l'ordre :
1. licence plus active → `void` avec la raison de la licence (`refunded`, `disputed`, `subscription_ended`, `replaced`…), sinon `revoked` ;
2. PC du filleul qui partage **au moins un** identifiant avec un PC de l'affilié (ses licences + [[Table account_devices]]) ou avec un filleul déjà compté → `void` `same_device` (règle plus stricte que le « 2 sur 3 » de l'activation) ;
3. même client Stripe qu'une licence de l'affilié → `void` `same_payer` ;
4. sinon `counted` (`counted_at`).

### Récompense (boucle)
Tant que `comptés >= AFFILIATE_GOAL × (rewards + 1)` et que le maximum n'est pas atteint :
1. réservation atomique : `UPDATE affiliates SET rewards = rewards + 1, reward_granted_at = now WHERE rewards = <ancienne valeur> RETURNING` (deux évaluations simultanées ne donnent pas deux récompenses) ;
2. `giveReward` : `givePremiumTime(db, stripe, userId, {months: 6})` de [[licensing.js]] (abonné : paiements décalés chez Stripe ; sinon licence `reward`), `reward_license_id`, audit `affiliate.rewarded` (`{reward, months, action}`) ;
3. échec (Stripe refuse) : la réservation est **annulée** (`rewards - 1`), audit `affiliate.reward_failed` avec l'erreur (200 caractères), l'erreur remonte. Le balayage horaire réessaie (`affiliatesToEvaluate` inclut les affiliés au palier sans récompense).

### Résumé (`affiliateSummary`)
`{code, codeFull, maxReferrals, goal, counted, progress, pending, rewards, months, maxed, full, discount, referrals: [{email masqué, status, voidReason, since, countsFrom, activated}]}`. `progress` = comptés au-delà des paliers déjà récompensés (borné à `goal`) ; `full` garde l'anneau plein juste après un palier.

## Données touchées

[[Table affiliates]], [[Table referrals]], [[Table account_devices]], lecture de [[Table licenses]], [[Table devices]] et [[Table users]], écriture dans [[Table audit]].

## Événements d'audit écrits

`affiliate.joined`, `referral.created`, `affiliate.rewarded`, `affiliate.reward_failed`, `affiliate.reward_at_risk`.

## Erreurs et cas limites

- Limite connue (documentée dans `MISE-EN-LIGNE.md`) : 3 abonnements avec 3 e-mails et 3 PC différents passent, même avec une seule carte (chaque paiement sans compte crée un nouveau client Stripe).
- Le filtre « affiliation » du journal de l'admin (`affiliate.%`) ne montre pas `referral.created` ([[admin.js (serveur)]]).

## Liens avec le reste

Appelé par [[app.js]] (inscription, page `/affiliate`, connexion de l'app : `rememberDevice` puis `settleAffiliate`), [[licensing.js]] (empreinte recopiée à l'activation), [[billing.js]] (`codeFull`, `voidReferrals`), [[server.js]] (balayage), [[admin.js (serveur)]] (action `affilie`), [[admin.js (script serveur)]] (`affiliate`). Réglages : [[config.js]] ; règles commerciales : [[Promotions et affiliation]], [[Partenaires et créateurs]].

## Tests

`flow.test.js` : « affiliate: 5 % code in Stripe, 3 players per code, a player counts when they activate, 6 months once », « a reward Stripe refuses is retried by the hourly sweep… », « an affiliate on their 6 free months can subscribe… », « AFFILIATE_REWARD_MAX=0 and more spots… », « affiliate without a license gets 6 months… », et les tests Lifetime avec code d'affilié ([[Tests du serveur]]).

## À savoir avant de modifier

- Changer `AFFILIATE_*` change les règles pour **tous** les affiliés, y compris ceux déjà inscrits : décision de Sofiene requise.
- Toute nouvelle raison de révocation de licence devient une raison d'annulation de parrainage (cas 1 plus haut) : la prévoir dans les libellés de [[views.js]] et [[admin-views.js]].
