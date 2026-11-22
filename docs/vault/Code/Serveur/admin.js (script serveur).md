---
type: code
tags: [code, serveur, javascript, support]
fichier: licensing/scripts/admin.js
lignes: 337
maj: 2026-11-10
---
# admin.js (script serveur)

Les commandes de support en ligne de commande : `npm run admin -- <commande> [arguments]`. Elles agissent directement sur la base (Supabase) et, si besoin, sur Stripe et Discord. Ne pas confondre avec [[admin.js (serveur)]] (le tableau de bord `/admin`, qui a un bouton pour presque chaque commande) et [[admin.js (page admin)]]. Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Se lance depuis `licensing/` avec les variables du serveur visé (en pratique, dans le terminal Railway ou avec `DATABASE_URL` exporté). Le script charge la config avec `NODE_ENV=development` ([[config.js]]), exige `DATABASE_URL` (« Set DATABASE_URL (Supabase connection string) first. »), puis ouvre la base avec `openDb` de [[db.js]] **sans** nom d'environnement : le garde-fou d'environnement n'est pas vérifié, mais le schéma est rejoué ([[schema.sql]]). Stripe n'est créé que si `STRIPE_SECRET_KEY` est réglée ; le bot Discord ([[discord.js]]) que pour les commandes Discord.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `show <email>` | Compte, licence, PC, liaison Discord, 15 derniers événements, achats à cet e-mail que personne n'a rattachés. |
| `attach <email> [license-id]` | Rattache un achat non réclamé (onglet fermé, compte créé ailleurs ou après 48 h). Messages pour `already_claimed` et `already_has_license`. Un Lifetime rattaché à un abonné arrête l'abonnement remplacé (`stopReplacedSubscriptions`). |
| `claim-link <email>` | Nouveau lien « créer son compte » pour un achat non réclamé (l'ancien ne marche plus). |
| `reset-link <email>` | Lien « choisir un mot de passe » (1 h). |
| `reset-device <email>` | Libère le PC (audit `device.reset` par `support`). |
| `revoke <email> [raison]` / `restore <email>` | Révoque (raison `manual` par défaut) ou rétablit la licence, puis remet le rôle Discord à jour. |
| `grant <email> [note]` | Licence à vie créée à la main (par exemple acheteurs Discord du `.bat` Premium). |
| `grant-months <mois> <email…>` / `grant-days <jours> <email…>` | Premium pour 1 à 120 mois ou 1 à 3650 jours, puis il s'arrête seul. E-mails séparés par espaces, virgules ou points-virgules ; le nombre peut venir après ; e-mails déjà Premium ou avec une licence en attente sautés. |
| `affiliate <email>` | Code d'affiliation, filleuls et pourquoi chacun compte ou non ; relance `evaluateAffiliate` et signale `reward_failed` / `reward_at_risk` ([[affiliates.js]]). |
| `create-promo <CODE> <pct> [once\|forever]` | Code promo Stripe (coupon `rago-promo-<pct>-<durée>`, premiers achats seulement), dans le mode de la clé. |
| `popup` | État du pop-up du site et utilisations restantes ([[promo.js]]). |
| `popup <CODE> [pct] [clients]` / `popup title\|eyebrow\|text "…"` / `popup off\|on` | Change le code, les textes (`{percent}`, `{code}`, `{total}`, `{left}`) ou l'affichage. |
| `create-user <email> <mot de passe>` | Crée un compte (tests). |
| `delete-user <email>` | Effacement RGPD par `deleteAccount` ([[support.js]]). |
| `export-keys` | Affiche `LICENSE_SIGNING_KEY` (PEM en base64) et `SESSION_SECRET` lus dans [[Table server_secrets]], à garder dans un gestionnaire de mots de passe ; si les variables d'environnement sont réglées, dit seulement que ce sont elles qui servent. Voir [[Clés et secrets]]. |
| `reviews [n]` | Les derniers avis (30 par défaut) avec l'e-mail de l'auteur et leur état. |
| `hide-review <email>` / `show-review <email>` | Retire l'avis du site ou le remet. |
| `remove-photo <email>` | Supprime la photo de profil (exige Supabase, sinon la photo resterait dans le bucket). |
| `set-name <email> <nom>` | Change le nom public. |
| `discord [email]` | Avec e-mail : `checkRewards` (sans délai), `syncUser(force)` et liste des récompenses. Sans e-mail : `syncAll({all:true})` et statistiques (le serveur le fait toutes les 5 min). |
| `discord-unlink <email>` | Retire le rôle Pro et délie le Discord. |
| `growth [jours]` | Arrivées Discord des 30 derniers jours (ou `[jours]`) par source, comme `/growth` sur Discord, sans la mise en forme ([[community.js]]). |

Commande inconnue : la liste des commandes s'affiche.

Il n'y a **pas** de commande de bannissement : il se fait sur `/admin` ([[Tableau de bord admin]]).

## Données touchées

Selon la commande : [[Table users]], [[Table licenses]], [[Table devices]], [[Table audit]], [[Table reviews]], [[Table discord_links]], [[Table referrals]], [[Table server_secrets]], [[Table site_settings]] ; Stripe ; Supabase Storage ; Discord.

## Liens avec le reste

Utilise [[licensing.js]], [[affiliates.js]], [[profile.js]], [[reviews.js]], [[discord.js]], [[community.js]], [[support.js]], [[promo.js]], [[billing.js]]. Mode d'emploi pour Sofiene : `docs/MISE-EN-LIGNE.md` (« Au quotidien (support) »), voir [[Documentation et configuration du serveur]].

## Tests

Pas de test du script lui-même ; les fonctions qu'il appelle sont testées dans `flow.test.js` (par exemple « months given by the team (admin grant-months)… ») ([[Tests du serveur]]).

## À savoir avant de modifier

- Lancé avec les variables de prod, il agit sur la **vraie** base, le vrai Stripe et le vrai serveur Discord.
- Ne jamais coller la sortie d'`export-keys` ailleurs que dans le gestionnaire de mots de passe ([[Clés et secrets]]).
