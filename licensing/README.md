# Rago : paiement, comptes et licences

Serveur Node.js qui gère tout ce qui se passe après le clic sur « Get Premium » : paiement Stripe, création de compte, tableau de bord avec le téléchargement de Rago Optimizer, clé de licence et verrou sur un seul PC.

**Mettre en ligne : suivre [docs/MISE-EN-LIGNE.md](docs/MISE-EN-LIGNE.md), étape par étape.**

## Le parcours de l'acheteur

1. Bouton Premium du site → `https://account.<domaine>/buy?interval=month|year` → abonnement Stripe Checkout.
2. Paiement accepté → `/checkout/success` : « Payment confirmed. Create your account to get your license. » Il choisit son mot de passe, tape le code d'un affilié s'il en a un, la licence est rattachée à son compte. Un email lui envoie aussi un lien de création de compte, au cas où il ferme l'onglet.
3. Tableau de bord `/account` : bouton « Download Rago Optimizer », clé de licence, PC activé, abonnement (date de renouvellement, « Cancel or manage subscription » vers le portail Stripe).
4. Dans Rago Optimizer, il se connecte avec le même email et mot de passe, clique **Activate** : la licence est verrouillée sur ce PC. Sur un autre PC, la connexion est refusée.

Remboursement total ou litige Stripe : la licence est révoquée et l'abonnement annulé automatiquement. Abonnement terminé ou impayé : la licence s'arrête, et revient si le paiement repasse.

Programme d'affiliation `/affiliate` : chaque compte peut avoir un code ; 3 acheteurs comptés = Rago Optimizer Premium à vie (règles anti-triche dans `docs/MISE-EN-LIGNE.md`, fin du document).

## Choix faits

- **Abonnement** mensuel ou annuel (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`). Les licences offertes et celles gagnées par l'affiliation sont à vie. Sans les deux prix, `/buy` affiche « Checkout opens soon » (503) : plus rien n'est vendu en paiement unique.
- **Un seul PC par licence.** Le site reste accessible depuis n'importe quel navigateur ; c'est l'app qui est verrouillée. Réinstaller Windows ne bloque pas le joueur quand le numéro de carte mère est lisible (l'empreinte combine 3 identifiants et en tolère un qui change ; exception et détails dans `docs/API.md`).
- **Changement de PC par le support** (`npm run admin -- reset-device <email>`). `SELF_SERVICE_RESET_DAYS=30` l'ouvre en libre-service une fois par mois.
- **Supabase** : la base Postgres (tables dans `supabase/schema.sql`, créées automatiquement au démarrage, accès public bloqué par RLS) et l'installeur dans un bucket Storage privé, servi par lien signé de 5 minutes à tout le monde (l'app gratuite est la même que l'app Premium, c'est la licence qui débloque). Le serveur n'a donc besoin d'aucun disque.
- **Clés de licence** : sans `LICENSE_SIGNING_KEY`, le serveur génère sa paire Ed25519 au premier démarrage et la garde dans la base. La clé publique à compiler dans l'app se lit sur `/api/v1/public-key?format=pem`.
- Le plan gratuit, c'est l'app elle-même sans compte (9 réglages). L'ancien .bat reste en téléchargement libre sur le site, sans compte.

## Support

Avec `DATABASE_URL` réglé sur la base Supabase :

```bash
npm run admin -- show <email>            # compte, licence, appareil, derniers événements
npm run admin -- reset-device <email>    # libère le PC pour en activer un autre
npm run admin -- revoke <email> [raison]
npm run admin -- restore <email>
npm run admin -- grant <email> [note]    # licence offerte, ex. anciens acheteurs du .bat Premium
```

`grant` sur un email sans compte affiche un lien à envoyer à la personne pour qu'elle crée son compte.

## Développement

```bash
npm ci
npm test                                   # base Postgres en mémoire (PGlite)
TEST_DATABASE_URL=postgres://... npm test  # les mêmes sur un vrai Postgres
DEV_SEED=test@rago.dev:password123 npm run dev   # http://localhost:8787, compte Premium de test
```

Node 22 ou plus. Code : `src/app.js` (routes), `src/licensing.js` (comptes, licences, verrou), `src/db.js` (Postgres), `src/billing.js` (Stripe), `src/affiliates.js` (affiliation), `src/views.js` + `public/` (pages), `docs/API.md` (contrat avec l'app).
