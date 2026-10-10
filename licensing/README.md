# Rago : paiement, comptes et licences

Serveur Node.js qui gère tout ce qui se passe après le clic sur « Get Premium » : paiement Stripe, création de compte, tableau de bord avec le téléchargement de Rago Optimizer, clé de licence et verrou sur un seul PC.

**Mettre en ligne : suivre [docs/MISE-EN-LIGNE.md](docs/MISE-EN-LIGNE.md), étape par étape.**

## Le parcours de l'acheteur

1. Bouton Premium du site → `https://account.<domaine>/buy?interval=month|year` → abonnement Stripe Checkout.
2. Paiement accepté → `/checkout/success` : « Payment confirmed. Create your account to get your license. » Il choisit son mot de passe, tape le code d'un affilié s'il en a un, la licence est rattachée à son compte. Une fois Resend configuré, un email lui envoie aussi un lien de création de compte, au cas où il ferme l'onglet (sans Resend, le support le rattache avec `npm run admin -- attach`).
3. Tableau de bord `/account` : bouton « Download Rago Optimizer », clé de licence, PC activé, abonnement (date de renouvellement, « Cancel or manage subscription » vers le portail Stripe).
4. Dans Rago Optimizer, il se connecte avec le même email et mot de passe, clique **Activate** : la licence est verrouillée sur ce PC. Sur un autre PC, la connexion est refusée.

Remboursement total ou litige Stripe : la licence est révoquée et l'abonnement annulé automatiquement. Abonnement terminé ou impayé : la licence s'arrête, et revient si le paiement repasse.

Rôle Pro sur Discord (avec les cinq variables `DISCORD_`) : **Link Discord** sur `/account` ajoute le joueur au serveur avec le rôle, et un bot le lui retire quand la licence s'arrête, puis le rend si elle revient (`src/discord.js`, réglages dans `docs/MISE-EN-LIGNE.md`, « Le rôle Pro sur Discord »). Sans elles, la page compte dit d'ouvrir un ticket. Avec `DISCORD_VIP_ROLE_ID` et `DISCORD_MVP_ROLE_ID`, les rôles VIP et MVP (donnés par un bot d'invitations) rapportent une fois au compte lié 2 semaines ou 1 mois de Premium et un code de 10 % ou 30 % à usage unique (« Les récompenses d'invitation »).

Programme d'affiliation `/affiliate` : chaque compte peut avoir un code, qui est aussi un code promo Stripe à −5 % ; un code sert à 3 joueurs ; 3 acheteurs comptés (à l'activation de leur PC) = 6 mois de Rago Optimizer Premium, une fois (règles anti-triche dans `docs/MISE-EN-LIGNE.md`, fin du document). `/buy?promo=CODE` applique un code promo Stripe (celui du pop-up du site, réglé sur `/admin` avec `ADMIN_KEY` ou `npm run admin -- popup`).

## Choix faits

- **Abonnement** mensuel ou annuel (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`). Les licences offertes sont à vie ; l'affiliation donne 6 mois. Sans les deux prix, `/buy` affiche « Checkout opens soon » (503) : plus rien n'est vendu en paiement unique.
- **Un seul PC par licence.** Le site reste accessible depuis n'importe quel navigateur ; c'est l'app qui est verrouillée. Réinstaller Windows ne bloque pas le joueur quand le numéro de carte mère est lisible (l'empreinte combine 3 identifiants et en tolère un qui change ; exception et détails dans `docs/API.md`).
- **Changement de PC par le support** (`npm run admin -- reset-device <email>`). `SELF_SERVICE_RESET_DAYS=30` l'ouvre en libre-service une fois par mois.
- **Supabase** : la base Postgres (tables dans `supabase/schema.sql`, créées automatiquement au démarrage, accès public bloqué par RLS) et l'installeur dans un bucket Storage privé, servi par lien signé de 5 minutes à tout le monde (l'app gratuite est la même que l'app Premium, c'est la licence qui débloque). Le serveur n'a donc besoin d'aucun disque.
- **Clés de licence** : sans `LICENSE_SIGNING_KEY`, le serveur génère sa paire Ed25519 au premier démarrage et la garde dans la base. La clé publique à compiler dans l'app se lit sur `/api/v1/public-key?format=pem`.
- Le plan gratuit, c'est l'app elle-même sans compte (9 réglages).

## Support

Avec `DATABASE_URL` réglé sur la base Supabase :

```bash
npm run admin -- show <email>            # compte, licence, appareil, derniers événements
npm run admin -- reset-device <email>    # libère le PC pour en activer un autre
npm run admin -- revoke <email> [raison]
npm run admin -- restore <email>
npm run admin -- grant <email> [note]    # licence offerte, ex. anciens acheteurs du .bat Premium
npm run admin -- grant-months 6 <email> [email…]  # Premium offert 6 mois, puis il s'arrête tout seul (plusieurs emails possibles)
npm run admin -- reviews                 # derniers avis ; hide-review / show-review <email> pour la modération
npm run admin -- popup                   # le pop-up du site et ses places restantes ; popup RAGO50 50 15 pour une offre (aussi sur /admin)
npm run admin -- remove-photo <email>    # retire une photo de profil (avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY)
npm run admin -- discord <email>         # son Discord lié, son rôle Pro remis d'aplomb et ses récompenses VIP / MVP (avec les DISCORD_ de Railway)
```

`grant` sur un email sans compte affiche un lien à envoyer à la personne pour qu'elle crée son compte.

## Développement

```bash
npm ci
npm test                                   # base Postgres en mémoire (PGlite)
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test  # les mêmes sur un Postgres local JETABLE (voir ci-dessous)
DEV_SEED=test@rago.dev:password123 npm run dev   # http://localhost:8787, compte Premium de test
```

> **Attention : `TEST_DATABASE_URL` efface toute la base visée** à chaque test (tables, comptes, licences, et la clé de signature de `server_secrets`). Ne mets **jamais** l'adresse Supabase de production : les tests refusent d'ailleurs de tourner si l'adresse n'est pas `localhost` (ou une base dont le nom contient « test »). Utilise un Postgres local créé pour l'occasion.

Node 22 ou plus. Code : `src/app.js` (routes), `src/licensing.js` (comptes, licences, verrou), `src/db.js` (Postgres), `src/billing.js` (Stripe), `src/affiliates.js` (affiliation), `src/discord.js` (rôle Pro sur Discord), `src/views.js` + `public/` (pages), `docs/API.md` (contrat avec l'app).
