---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/support.js
lignes: 45
maj: 2026-11-10
---
# support.js

Action de support partagée entre le terminal et `/admin` : la suppression complète d'un compte (droit à l'effacement du RGPD). Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Tableau de bord admin]], [[Conformité juridique]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Un seul export, `deleteAccount`, appelé par le bouton « Supprimer le compte » de la fiche joueur ([[admin.js (serveur)]], action `supprimer`) et par `npm run admin -- delete-user <email>` ([[admin.js (script serveur)]]). Les deux font donc exactement la même chose.

## Ce que le fichier expose

`deleteAccount(db, {stripe, avatars, discord, log}, email)` → `{user, licenses, canceled}` ou `null` si rien n'est stocké pour cet e-mail.

## Fonctionnement détaillé

1. E-mail mis en minuscules. Lecture du compte ([[Table users]]) et de **toutes** les licences dont l'e-mail est celui-là **ou** qui appartiennent au compte ([[Table licenses]]).
2. Rien trouvé → `null`.
3. Abonnements à arrêter = licences avec `stripe_subscription_id` et `status = 'active'`. S'il y en a et que Stripe n'est pas configuré → erreur « Active subscription: STRIPE_SECRET_KEY is needed to cancel it first. »
4. **Photo de profil** : si le compte en a une, le stockage doit être Supabase (sinon erreur « The profile photo lives in Supabase Storage… »), puis `removeAvatar` de [[profile.js]] efface le fichier.
5. **Rôle Pro Discord** : si le lien Discord a le rôle, `discord.unlink` le retire (une erreur est seulement journalisée `[discord] unlink before deletion`).
6. **Stripe** : chaque abonnement actif est annulé tout de suite (`subscriptions.cancel`). Les erreurs « No such subscription » ou « canceled » sont ignorées ; les autres arrêtent tout.
7. **Transaction** :
   - pour chaque licence : suppression du PC ([[Table devices]]), puis anonymisation : `user_id = NULL`, `email = deleted-<id licence>@deleted.invalid`, `claim_token_hash = NULL`, `status = 'revoked'`, `status_reason = 'deleted'` ; le `detail` des lignes du journal de cette licence est effacé ([[Table audit]]) ;
   - pour le compte : `detail` effacé dans le journal, puis `DELETE FROM users`. Les clés étrangères en `ON DELETE CASCADE` emportent les sessions web et API, les liens de mot de passe, l'affiliation, les parrainages, l'avis, les identités Google/Discord, le lien Discord, les PC du compte ([[Table account_devices]]). `discord_rewards.user_id` passe à `NULL` (`ON DELETE SET NULL`).

## Données touchées

Stripe (annulation), Supabase Storage (photo), Discord (rôle), et les tables citées. Les montants, identifiants Stripe et dates des licences **restent** pour la comptabilité, sans la personne.

## Erreurs et cas limites

- Les lignes de [[Table trials]] (e-mail + empreinte de carte) liées à cet e-mail ne sont **pas** effacées ici : elles restent **2 ans** après le début de l'essai ([[retention.js]]), pour refuser un 2e essai à la même personne ou à la même carte. C'est ce que promet la politique de confidentialité (« Free trial records (email, card fingerprint): 2 years after the trial started », CONFIRMÉ dans `site/tools/make_legal.py`). Les codes d'inscription ([[Table signup_codes]]) sont effacés un jour après leur expiration, quoi qu'il arrive.
- [[admin.js (serveur)]] exige de recopier l'e-mail avant d'appeler cette fonction.

## Liens avec le reste

Appelé par [[admin.js (serveur)]] et [[admin.js (script serveur)]] ; appelle [[profile.js]], [[discord.js]] (objet `discord`), Stripe. Explications pour le support : [[Tableau de bord admin]].

## Tests

Le test « /admin dashboard: players, Premium time, revoke, ban, gifts, sales, journal (2026-11-10) » de `flow.test.js` passe par la suppression ([[Tests du serveur]]).

## À savoir avant de modifier

- L'ordre compte : Storage, Discord et Stripe **avant** la transaction, car ces services ne peuvent pas être annulés par un `ROLLBACK`. Si Stripe échoue, rien n'est effacé en base.
- Ne jamais supprimer les lignes de [[Table licenses]] : elles servent à la comptabilité et à [[sales.js]].
