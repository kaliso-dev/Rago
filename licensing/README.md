# Rago — paiement, comptes et licences

Serveur Node.js qui gère tout ce qui se passe après le clic sur « Get Rago Hub Premium » : paiement Stripe, création de compte, tableau de bord avec le téléchargement de Rago Hub, clé de licence et verrou sur un seul PC.

## Le parcours de l'acheteur

1. Bouton Premium du site → `https://<domaine>/buy` → page de paiement Stripe Checkout.
2. Paiement accepté → retour sur `/checkout/success` : « Payment confirmed. Create your account to get your license. » Il choisit son mot de passe, la licence est rattachée à son compte.
3. Il reçoit aussi un email avec un lien de création de compte, au cas où il ferme l'onglet.
4. Tableau de bord `/account` : bouton « Download Rago Hub », clé de licence, appareil activé.
5. Dans Rago Hub, il se connecte avec le même email et mot de passe, clique **Activate** : la licence est verrouillée sur ce PC. Sur un autre PC, la connexion est refusée.

Remboursement total ou litige Stripe : la licence est révoquée automatiquement, Rago Hub s'arrête à sa prochaine vérification.

## Choix faits

- **Paiement unique** (licence à vie), pas d'abonnement. Le prix vient du `STRIPE_PRICE_ID`.
- **Un seul PC par licence.** Le site reste accessible depuis n'importe quel navigateur ; c'est l'app qui est verrouillée.
- **Réinstaller Windows ne bloque pas le joueur** : l'empreinte combine 3 identifiants et en tolère un qui change (détails dans `docs/API.md`).
- **Changement de PC : par le support**, avec `npm run admin -- reset-device <email>`. Pour l'ouvrir en libre-service limité, mettre `SELF_SERVICE_RESET_DAYS=30` (un changement par mois depuis le tableau de bord).
- Le téléchargement de Rago Hub est réservé aux comptes avec une licence active. Rago Free (le .bat) reste en téléchargement libre sur le site.

## Mise en ligne

Il faut : un compte Stripe, un nom de domaine, un hébergeur Node avec disque persistant (Railway, Render ou Fly.io ; le `Dockerfile` marche sur les trois), et un compte Resend pour les emails (gratuit jusqu'à 3 000 emails par mois).

1. **Stripe** : créer le produit « Rago Hub Premium » avec un prix en paiement unique, noter son `price_...`. Dans Développeurs → Webhooks, ajouter l'endpoint `https://<domaine>/webhooks/stripe` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`, et noter le `whsec_...`.
2. **Clés** : `npm run keys` donne `LICENSE_SIGNING_KEY`, `SESSION_SECRET` et la clé publique à donner au thread de l'app pour qu'il la compile dans Rago Hub. Ne jamais partager la clé privée.
3. **Variables** : copier `.env.example`, remplir, déclarer chez l'hébergeur. Monter un volume sur `/data` (base SQLite et installeur).
4. **Installeur** : déposer `RagoHub-Setup.exe` dans `/data` (`INSTALLER_PATH`), mettre à jour `INSTALLER_VERSION` à chaque version.
5. Option : `SITE_DIR` sert aussi la page de vente depuis le même serveur, un seul déploiement pour tout.

Tester avant d'ouvrir : clés Stripe de test (`sk_test_...`), carte `4242 4242 4242 4242`, et `stripe listen --forward-to localhost:8787/webhooks/stripe` en local.

## Support

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
npm test         # parcours complet : paiement, compte, téléchargement, activation, refus 2e PC, remboursement
npm run dev      # http://localhost:8787 (sans Stripe : /buy affiche « Checkout is not open yet »)
```

Node 22 ou plus (SQLite intégré à Node, aucune dépendance native). Code : `src/app.js` (routes), `src/licensing.js` (comptes, licences, verrou), `src/billing.js` (Stripe), `src/views.js` + `public/` (pages), `docs/API.md` (contrat avec l'app).
