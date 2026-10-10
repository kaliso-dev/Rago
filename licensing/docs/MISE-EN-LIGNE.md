# Mettre Rago Optimizer en ligne, étape par étape

À la fin, voici ce qui marche en vrai : le joueur choisit mensuel ou annuel sur ton site, s'abonne sur Stripe, crée son compte (avec le code d'un affilié s'il en a un), arrive sur son tableau de bord avec sa clé de licence et le bouton de téléchargement, installe Rago Optimizer, se connecte et active sa licence sur son PC.

**Comment c'est organisé :**

| Quoi | Où | Adresse (exemple avec `ragohub.com`) |
|---|---|---|
| Page de vente | Netlify | `https://ragohub.com` |
| Paiement, comptes, tableau de bord, API de l'app | Railway | `https://account.ragohub.com` |
| Base de données + fichier d'installation de l'app | Supabase | (privé, seul le serveur y accède) |
| Paiements | Stripe | page de paiement hébergée par Stripe |
| Emails (achat, mot de passe oublié) | Resend | envoyés depuis `hello@ragohub.com` |

Dans tout le guide, remplace `ragohub.com` par ton vrai domaine.

> **Domaine** : `rago-optimizer.com` est acheté chez OVH. Le pas-à-pas pour le brancher (site, `account.rago-optimizer.com`, Zimbra, Resend) est dans le guide `DOMAINE-EMAIL.md` du projet. L'encadré suivant vaut jusqu'à ce que ce soit fait.

> **Sans domaine (avant le branchement du domaine)**
>
> Tu tournes sur `https://rago-optimiser.netlify.app` (site) et `https://rago-production.up.railway.app` (serveur). Saute pour l'instant les étapes **1**, **4** (Resend demande un domaine), **5.5** (Custom Domain) et **7.2**. Partout où le guide écrit `account.ragohub.com`, mets `rago-production.up.railway.app`, et `rago-optimiser.netlify.app` à la place de `ragohub.com`. Les valeurs exactes :
>
> | Où | Valeur |
> |---|---|
> | Railway `PUBLIC_URL` | `https://rago-production.up.railway.app` |
> | Railway `SITE_URL` | `https://rago-optimiser.netlify.app` |
> | Webhook Stripe (étape 6) | `https://rago-production.up.railway.app/webhooks/stripe` |
> | GitHub secret `RAGO_API_BASE` | `https://rago-production.up.railway.app/api/v1` |
> | GitHub variable `SITE_URL` | `https://rago-optimiser.netlify.app` |
> | Site, `CONFIG.accountBase` | `https://rago-production.up.railway.app` (déjà fait) |
>
> Sans Resend, les emails ne partent pas : les pages le savent et disent au joueur de te demander sur Discord (mot de passe oublié, lien d'achat).
>
> **Le jour où tu as un domaine** : Railway Custom Domain puis `PUBLIC_URL` et `SITE_URL` ; nouvelle URL du webhook Stripe ; Netlify domaine ; `CONFIG.accountBase`, `og:url` et `SITE` de `site/tools/build.py`, `site/robots.txt` et `site/sitemap.xml` (ils contiennent l'adresse netlify.app), et les 7 redirections de `netlify.toml` vers `rago-production.up.railway.app` (la 8e, `/downloads/*` vers l'accueil, ne dépend pas du domaine) (dis-le-moi, je le fais) ; dans Stripe, les URL des conditions et de la confidentialité (Informations publiques **et** liens du portail client) ; secrets GitHub `RAGO_API_BASE` et variable `SITE_URL`, puis une nouvelle version de l'app. **Garde l'adresse `rago-production.up.railway.app` active** : les apps déjà installées l'ont en dur et l'utilisent pour renouveler leurs licences. Le serveur accepte les deux adresses : connexion, inscription et « Forgot » marchent sur l'une comme sur l'autre (les anciens liens d'achat aussi). Chaque adresse a ses propres cookies, donc un joueur connecté sur l'une devra se reconnecter sur l'autre.

**Règle d'or : tu ne m'envoies aucune clé secrète.** Tu les colles directement dans Railway (étape 5). Ce que tu me donnes est listé à la fin.

Commence tout en **mode test** Stripe : rien n'est vraiment débité tant que tu n'as pas fait l'étape 10.

---

## Étape 1 : le nom de domaine

1. Achète ton domaine chez un registrar (Cloudflare, OVH, Namecheap…). Compte environ 10 € par an.
2. Garde l'onglet de gestion DNS ouvert : tu y ajouteras des enregistrements aux étapes 5, 7 et 8.

## Étape 2 : Supabase (base de données et fichier de l'app)

1. Crée un compte sur [supabase.com](https://supabase.com), puis **New project**.
   - Nom : `rago`. Région : **West EU (Paris)** ou Frankfurt, proche de tes joueurs.
   - Choisis un **mot de passe de base de données** fort et garde-le : il entre dans `DATABASE_URL`.
2. **La connexion à la base** : en haut du projet, bouton **Connect** → section **Session pooler** → copie l'URI. Elle ressemble à :
   `postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`
   Remplace `[YOUR-PASSWORD]` par ton mot de passe. **C'est `DATABASE_URL`.**
3. **Les tables** : rien à faire, le serveur les crée tout seul au premier démarrage. Si tu veux les voir avant, tu peux coller le contenu de `licensing/supabase/schema.sql` dans **SQL Editor → Run**. L'accès public (clé `anon`) est bloqué sur toutes ces tables.
   **Ne supprime jamais la table `server_secrets` ni le projet Supabase** : elle contient la clé qui signe les licences, et chaque app installée ne connaît que celle-là. Une nouvelle clé = toutes les apps refusent les licences jusqu'à une nouvelle version. Sauvegarde-la une fois (étape 5, point 7).
4. **Le bucket pour l'app** : **Storage → New bucket**, nom `downloads`, **Public bucket désactivé** (privé). Tu y déposeras le fichier d'installation à l'étape 8.
   Les photos de profil vont dans un second bucket privé, `avatars` : **rien à faire**, le serveur le crée tout seul à la première photo (avec la clé de l'étape 2.5). Il n'y garde que des images de 256 × 256 au format WebP (quelques Ko) ; la base ne garde que leur nom.
5. **Les clés** : **Project Settings → API Keys**.
   - L'URL du projet (`https://abcd.supabase.co`) : **c'est `SUPABASE_URL`.**
   - La clé secrète (`service_role` dans l'onglet *Legacy API keys*, ou une *Secret key* `sb_secret_...`) : **c'est `SUPABASE_SERVICE_ROLE_KEY`.** Elle donne tous les droits : uniquement dans Railway.

## Étape 3 : Stripe (paiement)

1. Crée un compte sur [stripe.com](https://stripe.com). En haut à droite, active le **mode test**.
2. **Catalogue de produits → Ajouter un produit**, un seul produit avec **deux prix** :
   - Nom : `Rago Optimizer Premium`. Description : `Rago Optimizer for Windows, one PC per license.`
   - **Devise : USD** (choix du 7 octobre 2026, le site affiche des $). Les deux prix doivent être en USD ; Stripe ne convertit pas.
   - Prix 1 : **Récurrent**, période **Mensuelle**, **5,99 $**.
   - **Ajouter un autre prix** → Prix 2 : **Récurrent**, période **Annuelle**, **29,99 $** (5 mois payés au lieu de 12, comme l'annonce le site).
   - Fais-le une fois en mode test, puis une fois en live (étape 10) : chaque mode a ses propres `price_...`.
   - Enregistre. Ouvre chaque prix et copie son identifiant `price_...` : le mensuel **c'est `STRIPE_PRICE_MONTHLY`**, l'annuel **c'est `STRIPE_PRICE_YEARLY`**.
3. **Développeurs → Clés API** : copie la **clé secrète** `sk_test_...` : **c'est `STRIPE_SECRET_KEY`.**
4. **PayPal** (beaucoup de jeunes joueurs n'ont pas de carte) : **Paramètres → Moyens de paiement** → active **PayPal**. Pour les abonnements, Stripe doit d'abord valider ton compte pour le paiement récurrent PayPal (demande depuis la même page). Rien à changer côté serveur : la page de paiement propose tout seul les moyens activés.
5. **Paramètres → Facturation → Portail client** : clique **Activer le lien de test** (ou Enregistrer), coche « Annuler les abonnements » (à la fin de la période), « Changer de formule » avec tes deux prix, et « Mettre à jour le moyen de paiement ». C'est la page qu'ouvre le bouton **Cancel or manage subscription** du tableau de bord.
   Sur la même page, copie le **lien de connexion au portail** (`https://billing.stripe.com/p/login/...`) : **c'est `STRIPE_PORTAL_LOGIN_URL`**. Il permet de résilier avec son seul email, même sans compte Rago Optimizer (obligatoire en France : résiliation « en trois clics »). Il apparaît en bas de toutes les pages compte (« Cancel subscription ») ; donne-le aussi au thread site pour le pied de page et la page Refunds.
6. **Paramètres → Facturation → Abonnements et e-mails** : coche les relances automatiques en cas d'échec de paiement (Smart Retries) et, à la fin des relances, **Annuler l'abonnement**. Pendant les relances le joueur garde Premium ; à l'annulation la licence s'arrête toute seule.
   Sur la même page, active **l'e-mail de renouvellement à venir** (« Envoyer un rappel avant le renouvellement », 7 jours avant au moins) pour les abonnements **annuels** : la loi l'impose dans plusieurs pays de l'UE et ça évite les contestations bancaires au renouvellement.
6. **Paramètres → Image de marque** : logo `brand/logo/png/rago-icon-512.png`, couleur `#FF3B30`. La page de paiement aura l'air de la tienne.
7. **Paramètres → E-mails clients** : coche les reçus pour les paiements réussis et les factures.
8. **Paramètres → Informations publiques** (Public details) : renseigne **Conditions d'utilisation** = `https://<ton site>/terms.html` et **Politique de confidentialité** = `https://<ton site>/privacy.html`. Sans l'URL des conditions, Stripe refuse la case « J'accepte les conditions et je renonce à mon droit de rétractation de 14 jours » : la page de paiement s'ouvre quand même, sans la case, et les logs Railway affichent `[stripe] Terms checkbox refused`. Avec la case, la renonciation au délai de rétractation est valable dans l'UE.
   Sur la même page : **Libellé de relevé bancaire** (statement descriptor) = `RAGO OPTIMIZER` (c'est ce que le joueur lit sur son relevé ; un libellé qu'il ne reconnaît pas finit en contestation), et **E-mail du service client** = une adresse que tu lis vraiment (elle apparaît sur les reçus Stripe).
9. Dans le **Portail client** (point 4), ajoute aussi les liens **Conditions** et **Confidentialité** vers ces deux mêmes pages.

Tu avais déjà créé un prix « Paiement unique » (`STRIPE_PRICE_ID`) ? Il ne sert plus : **retire `STRIPE_PRICE_ID` de Railway**. Premium se vend uniquement en abonnement : tant que `STRIPE_PRICE_MONTHLY` et `STRIPE_PRICE_YEARLY` ne sont pas renseignés, le bouton d'achat affiche « Checkout opens soon » et rien n'est vendu (avant, il vendait l'ancien prix unique comme licence à vie, contrairement au site).

Le webhook se fait à l'étape 6, une fois le serveur en ligne.

## Étape 4 : Resend (emails)

1. Crée un compte sur [resend.com](https://resend.com) → **Domains → Add domain** → ton domaine.
2. Resend te montre 3 ou 4 enregistrements DNS (TXT et MX). Ajoute-les chez ton registrar, puis **Verify**. Ça peut prendre de quelques minutes à quelques heures.
3. **API Keys → Create API key**, permission *Sending access* : **c'est `RESEND_API_KEY`.**
4. `MAIL_FROM` = `Rago Optimizer <hello@ragohub.com>` (ton domaine vérifié au point 2 ; Resend refuse les autres).

Sans Resend, tout marche sauf les emails : pas de lien de secours après achat, pas de « mot de passe oublié ». Les pages le savent et renvoient le joueur vers Discord, et les logs Railway le rappellent au démarrage. Tu peux le faire en dernier.

## Étape 5 : Railway (le serveur)

1. Crée un compte sur [railway.com](https://railway.com) avec ton GitHub. Le plan Hobby coûte environ 5 $ par mois.
2. **New Project → Deploy from GitHub repo → kaliso-dev/Rago**.
3. Clique sur le service créé → **Settings → Source → Root Directory** : `licensing`. Railway utilise alors `licensing/Dockerfile`. Pas besoin de volume : tout est dans Supabase.
   Toujours dans **Settings** : **Watch Paths** = `licensing/**` (un push qui ne touche que l'app ou le site ne redéploie pas le serveur), et active **Wait for CI** (Railway attend que les vérifications GitHub du commit, dont `licensing-tests`, soient vertes avant de déployer). Dans **Deploy**, mets **Healthcheck Path** = `/healthz` : un nouveau déploiement qui ne répond pas (par exemple base injoignable) ne remplace pas celui qui marche. Attention : si une autre vérification du même commit échoue (par exemple le build de l'app), Railway peut sauter le déploiement, et le commit qui répare ne le relance pas s'il ne touche pas `licensing/`. Après un tel échec, ouvre Railway → **Deployments** : si le dernier est marqué **Skipped**, clique **Redeploy**.
4. **Variables → Raw Editor**, colle ceci en remplaçant les valeurs :

   ```
   NODE_ENV=production
   TRUST_PROXY=1
   PUBLIC_URL=https://account.ragohub.com
   SITE_URL=https://ragohub.com
   DATABASE_URL=postgresql://postgres.abcd:TON_MOT_DE_PASSE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://abcd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   INSTALLER_VERSION=1.1.5
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_YEARLY=price_...
   STRIPE_WEBHOOK_SECRET=whsec_a_remplir_a_l_etape_6
   STRIPE_PORTAL_LOGIN_URL=https://billing.stripe.com/p/login/...
   RESEND_API_KEY=re_...
   MAIL_FROM=Rago Optimizer <hello@ragohub.com>
   SUPPORT_URL=https://discord.gg/ton-invitation
   PRICE_LABEL=$5.99 a month or $29.99 a year
   ```

   `PRICE_LABEL` est le prix affiché aux comptes gratuits sur leur tableau de bord (mêmes montants et devise que Stripe et le site ; laisse vide pour ne rien afficher).
   Tu n'as **pas** de clé de licence à générer : au premier démarrage, le serveur crée sa paire de clés et la garde dans Supabase (table `server_secrets`). Sauvegarde-la au point 7.
5. **Settings → Networking → Custom Domain** : `account.ragohub.com`. Railway affiche un enregistrement **CNAME** : ajoute-le chez ton registrar (nom `account`, valeur donnée par Railway). Le HTTPS se met en place tout seul.
6. **Vérifie** dans ton navigateur :
   - `https://account.ragohub.com/healthz` affiche `{"ok":true}` ;
   - `https://account.ragohub.com/signup` affiche la page « Create your account » aux couleurs de Rago.

   Si le déploiement échoue, l'onglet **Deployments → View logs** dit quelle variable manque. Les lignes `[warn]` au démarrage listent aussi ce qui ne marchera pas encore (emails, prix…).
7. **Sauvegarde la clé des licences** (une seule fois, depuis ton PC, voir « Au quotidien ») : `npm run admin -- export-keys`. Copie les deux lignes `LICENSE_SIGNING_KEY=…` et `SESSION_SECRET=…` dans ton gestionnaire de mots de passe, **et** colle-les dans les variables Railway : le serveur ne dépendra plus de la base pour sa clé.
8. **Surveillance** : crée un moniteur gratuit (UptimeRobot, Better Stack) sur `https://account.ragohub.com/healthz`. Il répond `{"ok":true}` seulement si la base répond aussi ; sinon il t'envoie une alerte.
9. **Sauvegarde de la base** : l'offre gratuite de Supabase n'a pas de sauvegarde automatique. Dès les premiers revenus, passe Supabase en **Pro** (sauvegardes quotidiennes) ; d'ici là, fais une fois par semaine **Database → Backups** ou `pg_dump "$DATABASE_URL" > rago-AAAA-MM-JJ.sql` depuis ton PC.

## Étape 6 : le webhook Stripe

C'est ce qui prévient le serveur qu'un paiement est passé.

1. Stripe (mode test) → **Développeurs → Webhooks → Ajouter une destination**.
2. Événements à cocher :
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `charge.refunded`, `charge.dispute.created`.
   Si ton webhook existe déjà, ouvre-le → **Modifier la destination** → ajoute les six nouveaux événements. Le secret `whsec_...` ne change pas.
3. URL : `https://account.ragohub.com/webhooks/stripe`.
4. Copie le **secret de signature** `whsec_...` → Railway → Variables → remplace `STRIPE_WEBHOOK_SECRET`. Railway redéploie tout seul.

## Étape 7 : le site sur Netlify

1. Sur [netlify.com](https://netlify.com) : **Add new site → Import from GitHub → kaliso-dev/Rago**. Le `netlify.toml` du dépôt publie déjà le dossier `site/`.
2. **Domain management → Add a domain** : `ragohub.com`, puis ajoute chez ton registrar les enregistrements DNS que Netlify indique.
3. Dans `site/index.html`, l'objet `CONFIG` doit contenir `accountBase: "https://account.ragohub.com"`. **Donne-moi ton domaine et je le fais régler.** Les boutons « Get Premium », « Sign in » et « Create account » pointeront alors vers ton serveur.
4. Vérifie : sur `https://ragohub.com`, le bouton Premium t'emmène sur la page de paiement Stripe (mode test).

## Étape 8 : l'app Windows et son fichier d'installation

**Depuis la 1.1.6, les commandes Premium sont chiffrées dans l'exe** : sans licence active, personne ne peut les lire ni les lancer. Le serveur donne la clé de déchiffrement à l'app seulement quand la licence est active sur ce PC. Une seule fois :

- Génère **une** valeur longue et aléatoire, par exemple sur [1password.com/password-generator](https://1password.com/password-generator) (64 caractères, lettres et chiffres) ou `openssl rand -hex 32`.
- Mets-la dans Railway → Variables → `SCRIPTS_SECRET`, **et** dans GitHub → Secrets → `RAGO_SCRIPTS_SECRET` (la même, au caractère près).
- **Déploie le serveur avant de distribuer la 1.1.6** : sinon l'app affiche « Premium scripts unavailable, update needed » aux joueurs Premium. Ne change jamais cette valeur ensuite : les versions déjà installées ne déverrouilleraient plus leurs commandes Premium.

1. Ouvre `https://account.ragohub.com/api/v1/public-key?format=pem` et copie tout le bloc, lignes `BEGIN` et `END` comprises. C'est la **clé publique** que l'app embarque pour vérifier les licences.
2. GitHub → **kaliso-dev/Rago → Settings → Secrets and variables → Actions** :
   - Secret `RAGO_API_BASE` = `https://account.ragohub.com/api/v1`
   - Secret `RAGO_LICENSE_PUBKEY` = le bloc copié ci-dessus
   - Secret `RAGO_SCRIPTS_SECRET` = la même valeur que `SCRIPTS_SECRET` dans Railway (voir ci-dessous)
   - Variable `SITE_URL` = `https://ragohub.com`
3. **Actions → app-windows → Run workflow**. Ouvre ensuite **le run le plus récent avec une coche verte** → **Artifacts** → `rago-optimizer-setup` → décompresse : le fichier est `Rago Optimizer_<version>_x64-setup.exe`. Les anciens artefacts `rago-hub-setup` contiennent l'ancienne app « Rago Hub » : supprime-les (icône corbeille dans chaque ancien run) pour ne pas te tromper.
4. Supabase → **Storage → downloads → Upload file** : dépose le fichier `.exe` qui est **dans** le zip (pas le zip lui-même). Son nom n'a pas d'importance : le serveur sert toujours le `.exe` le plus récent du bucket.
5. **Vérifie** : ouvre `https://account.ragohub.com/download/status`. Tu dois voir `"ok":true` et le nom de ton fichier. Sinon la ligne `error` dit quoi corriger (clé Supabase refusée, bucket vide, mauvais nom de bucket).
6. À chaque nouvelle version : dépose le nouvel exe (tu peux supprimer l'ancien) et mets dans `INSTALLER_VERSION` (Railway) le numéro de son nom. Vérifie sur `/download/status` que `file` donne bien le nouveau nom (cette page relit le bucket à chaque fois ; le bouton de téléchargement suit dans la minute).

Le bouton **Download** marche pour tous les comptes, avec ou sans Premium : sans licence, l'app tourne en version gratuite. Le lien public `https://account.ragohub.com/download` sert au bouton gratuit du site.

## Étape 9 : le test complet (toujours en mode test)

Fais-le de bout en bout, comme un vrai client, dans une fenêtre de navigation privée :

1. `https://ragohub.com` → **Get Premium**.
2. Sur Stripe, paie avec la carte `4242 4242 4242 4242`, une date future, n'importe quel CVC.
3. Tu arrives sur « Payment confirmed. » → crée ton compte.
4. Tableau de bord : la clé de licence s'affiche, le bouton **Download Rago Optimizer** télécharge l'exe.
5. Installe, ouvre Rago Optimizer, connecte-toi avec le même email et mot de passe, clique **Activate** → « License active. Rago Optimizer is ready. »
6. Recharge le tableau de bord : la carte **Device** montre ton PC.
7. Sur un 2e PC (celui de ton pote) : la connexion doit être refusée avec « This license is already active on another PC. »
8. Tableau de bord → **Cancel or manage subscription** : le portail Stripe s'ouvre. Annule : la carte Subscription affiche « Ends … » et un bouton **Keep Premium**.
9. Dans Stripe, rembourse ce paiement test : la licence passe en « Refunded » sur le tableau de bord, l'abonnement est annulé, et Rago Optimizer s'arrête à sa prochaine vérification.
10. Affiliation : avec un 2e compte, va sur `/affiliate` → **Get my referral code**. Fais un achat test avec un autre email en tapant ce code dans **Add promotion code** sur la page Stripe (−5 %) : il est rempli tout seul à la création du compte et apparaît dans « Players who used your code » en « Not activated yet ». Connecte-toi avec ce compte dans Rago Optimizer et clique **Activate** : recharge `/affiliate`, le joueur est « Counted » et le cercle passe à 1/3. Il faut un PC qui n'est pas celui de l'affilié (sinon « Same PC as yours »).
11. Code du pop-up du site : règle-le sur `/admin` (voir « Le pop-up du site » plus bas). Sur le site, attends le pop-up → **Claim my discount** → **Get Premium** : la page Stripe affiche la réduction.

Si une étape coince, envoie-moi une capture et l'heure : je trouve la cause.

## Étape 10 : passer en vrai

Ce qui dépend du mode Stripe : la clé, les deux prix, le webhook et son secret, le portail client et son lien, les codes promo. Un objet Stripe n'existe que dans le mode où il a été créé : tout ce qui suit est à refaire **mode test éteint**. Rien ne change sur Netlify ni dans l'app (aucune clé Stripe n'y est).

1. **Compte** : Stripe → **Activer les paiements** (identité, IBAN). Tant que Stripe ne l'a pas validé, `/admin` affiche « Compte : à corriger ».
2. **Produit et prix** : Catalogue de produits → **Rago Optimizer Premium** avec deux prix **récurrents en USD** : 5,99 mensuel et 29,99 annuel (les montants du site). Copie les deux `price_...`.
3. **Clé secrète** : Développeurs → Clés API → clé secrète `sk_live_...`. Stripe ne montre une clé live qu'une fois : colle-la directement dans Railway (étape 6 ci-dessous) et garde-la dans ton gestionnaire de mots de passe.
4. **Webhook** : Développeurs → Webhooks → **Ajouter une destination**, URL `https://account.rago-optimizer.com/webhooks/stripe`, les 10 événements de l'étape 6. Copie son secret `whsec_...`.
5. **Portail client** : Paramètres → Facturation → Portail client, comme à l'étape 3.5 (résiliation, changement de formule avec les deux prix **live**, moyen de paiement, liens Conditions et Confidentialité), puis **Enregistrer**. Copie le lien de connexion au portail (il ne contient pas `test_`).
   Vérifie aussi en live : Moyens de paiement (PayPal), Abonnements et e-mails (relances, rappel avant renouvellement annuel), E-mails clients (reçus). Les Informations publiques (URL des conditions, libellé `RAGO OPTIMIZER`) sont communes aux deux modes.
6. **Railway → Variables** : remplace `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET` et `STRIPE_PORTAL_LOGIN_URL` par les valeurs live, retire `STRIPE_PRICE_ID` s'il est encore là, puis **Deploy** une seule fois. Garde les valeurs test dans ton gestionnaire de mots de passe (« Revenir en mode test »).
7. **Stripe, mode test** : Développeurs → Webhooks → la destination test vers `account.rago-optimizer.com` → **Désactiver**. Sinon ses événements arrivent avec le mauvais secret, sont refusés, et `/admin` le signale.
8. **Vérifie sur `/admin`**, section **Paiements Stripe** : clé, compte, prix, webhook, portail et lien doivent être « OK ». Chaque ligne « À corriger » dit quoi changer (un prix du mode test, un événement manquant, le portail pas enregistré…). « Secret du webhook » reste « À vérifier » jusqu'au premier achat : le secret ne se lit pas dans Stripe, seul un événement reçu le confirme.
9. **Achats de test** : les licences achetées en mode test sont dans la même base. Elles donnent encore Premium, comptent pour les affiliés et empêchent ces comptes d'acheter. Sur `/admin`, **Arrêter les licences de test** les passe en « Test purchase » (rien d'autre n'est touché : licences offertes, achats live, comptes, avis). Une licence offerte se redonne avec `npm run admin -- grant`.
10. **Code du pop-up** : le code créé en test n'existe pas en live. Sur `/admin`, tape `RAGO50`, `50` et `15`, puis **Enregistrer** : « Code créé dans Stripe ». Les codes d'affiliation sont recréés en live tout seuls dans l'heure (ou dès que l'affilié ouvre `/affiliate`).
11. **Un vrai achat, puis remboursé**, dans une fenêtre de navigation privée. Avant le lancement, ouvre d'abord ton lien `https://account.rago-optimizer.com/acces/<PREVIEW_KEY>`.
    - Prends le **mensuel**, avec un email qui n'a jamais acheté, **sans** le code du pop-up : chaque utilisation de `RAGO50` prend une des 15 places, et un remboursement ne la rend pas.
    - La page Stripe ne doit plus afficher « Mode test ». Paie avec ta carte : « Payment confirmed », crée le compte, la licence s'affiche, l'email d'achat arrive. Sur `/admin`, « Secret du webhook » passe à « OK » avec `checkout.session.completed`.
    - Stripe → Paiements → ce paiement → **Rembourser** (en entier). Le tableau de bord affiche « Refunded » et l'abonnement est annulé dans Stripe. Stripe garde ses frais (quelques dizaines de centimes).

## Revenir en mode test

Pour refaire des essais sans vrai paiement, remets les valeurs **test** dans Railway → Variables (garde les valeurs live dans ton gestionnaire de mots de passe pour revenir ensuite). Toutes viennent de Stripe avec le bouton **Mode test** activé (en haut à droite) :

| Variable | Valeur test |
|---|---|
| `STRIPE_SECRET_KEY` | Développeurs → Clés API → **Clé secrète** `sk_test_...` |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Catalogue de produits → Rago Optimizer Premium → les deux prix **test** `price_...` (créés à l'étape 3.2 ; s'ils n'existent pas en test, recrée-les) |
| `STRIPE_WEBHOOK_SECRET` | Développeurs → Webhooks → la destination **test** vers `/webhooks/stripe` → **Secret de signature** `whsec_...` (sinon crée-la comme à l'étape 6) |
| `STRIPE_PORTAL_LOGIN_URL` | Paramètres → Facturation → Portail client (mode test) → lien de connexion |

Réactive aussi la destination webhook test (étape 10.7). **Après le lancement, ne le fais plus sur ce serveur** : avec les valeurs test, les renouvellements, remboursements et résiliations des vrais abonnés ne sont plus reçus.

Railway redéploie tout seul. Paie ensuite avec `4242 4242 4242 4242`, une date future, n'importe quel CVC. Les achats test et les achats live ne se mélangent pas dans Stripe, mais ils vont dans la même base : un compte créé avec un achat test garde sa licence test. Au passage en live, le bouton **Arrêter les licences de test** de `/admin` les arrête (étape 10.9) ; `npm run admin -- delete-user` supprime un compte de test.

## Codes promo

- **Codes d'affiliation** : chaque code devient tout seul un code promo Stripe à −5 % (`AFFILIATE_DISCOUNT_PERCENT`), sur le premier paiement seulement (`AFFILIATE_DISCOUNT_DURATION=once` ; `forever` = sur chaque renouvellement), réservé aux nouveaux clients. Le lien de l'affilié l'applique d'office ; sinon le joueur le tape dans **Add promotion code** sur la page Stripe. Rien à faire dans Stripe : le coupon `rago-referral-5-once` et les codes sont créés par le serveur, en test comme en live.
- **Code du pop-up du site** (−50 % pour les 15 premiers clients au lancement, `RAGO15` avant) : il se règle sans toucher au code, sur **`https://account.rago-optimizer.com/admin`** (voir « Le pop-up du site » ci-dessous) ou avec `npm run admin -- popup`. Le site envoie `/buy?promo=CODE` : le serveur applique ce code d'office ; un code inconnu ou épuisé est ignoré (la page Stripe garde alors le champ pour en taper un).
- Un seul code par paiement : un visiteur venu par un lien d'affilié n'a pas le pop-up, et garde ses −5 %.

### Le pop-up du site

Le site lit à chaque visite ce que le pop-up propose (`/api/v1/promo` du serveur de comptes) : le code, la réduction, le petit titre, le titre, le texte et le nombre de places restantes. La réduction et le nombre d'utilisations viennent de Stripe, donc le pop-up ne promet jamais plus que ce que Stripe accorde.

**Une fois pour toutes** : dans Railway → Variables, ajoute `ADMIN_KEY` = une clé d'au moins 16 lettres et chiffres (différente de `PREVIEW_KEY`, à garder dans ton gestionnaire de mots de passe). Railway redéploie tout seul.

**Changer le pop-up** : ouvre `https://account.rago-optimizer.com/admin`, entre la clé (l'accès dure 7 jours sur ce navigateur ; **Quitter l'admin** le retire, changer la clé coupe tous les accès), modifie, **Enregistrer**. Le site suit en moins d'une minute.

- **Nouvelle offre** (ex. le lancement) : tape un nouveau code (`RAGO50`), la réduction (`50`) et le nombre de clients (`15`). Le serveur crée le code dans Stripe, dans le mode de `STRIPE_SECRET_KEY` (test ou live) : −50 % sur le premier paiement (mensuel ou annuel), réservé aux nouveaux clients, utilisable 15 fois. Nombre de clients vide : sans limite.
- **Texte** : à écrire en anglais, comme le site. `{percent}`, `{code}`, `{total}` et `{left}` sont remplacés par la réduction, le code, le nombre de clients et les places restantes. Sous le code, le pop-up ajoute tout seul « Limited to the first 15 players · 7 left » quand le code a une limite.
- **Les 15 places prises** : le pop-up disparaît du site tout seul, et `/buy` n'applique plus le code. La page admin affiche « Les 15 utilisations de RAGO50 sont prises ». Pour une nouvelle offre, tape un nouveau code.
- Stripe ne permet pas de changer la réduction ni la limite d'un code existant : pour 40 % ou 20 clients, il faut un nouveau code (la page te le dit).
- **Masquer** : décoche **Afficher la pop-up sur le site**.

La même chose en ligne de commande, depuis ton PC (voir « Au quotidien », avec `DATABASE_URL` **et** `STRIPE_SECRET_KEY` de Railway) :

```bash
npm run admin -- popup                                  # ce que le pop-up affiche et les places restantes
npm run admin -- popup RAGO50 50 15                     # code, % de réduction, nombre de clients (créé dans Stripe s'il est nouveau)
npm run admin -- popup title "Get {percent}% off now!"  # aussi : eyebrow (petit titre), text
npm run admin -- popup off                              # masque le pop-up ; popup on le remet
```

**À la main dans Stripe** (si tu préfères, avant de taper le code dans `/admin`) : Catalogue de produits → **Coupons → Créer un coupon** : type **Pourcentage**, `50`, durée **Une fois**. Dans le coupon, **Ajouter un code promotionnel** : code `RAGO50`, coche **Limiter aux premières commandes** (un client qui a déjà payé ne peut pas l'utiliser) et **Limiter le nombre d'utilisations de ce code**, `15`. Enregistre, puis mets `RAGO50` dans `/admin` en laissant la réduction et le nombre de clients tels que Stripe les a. Le suivi est dans Stripe → Coupons → le coupon → **Utilisations**.

## Le rôle Pro sur Discord

Un bot donne le rôle Pro aux joueurs Premium et le leur retire quand Premium s'arrête, comme chez les concurrents. Le joueur clique **Link Discord** sur sa page compte, autorise sur Discord, et il rejoint le serveur avec le rôle (s'il n'y était pas déjà). Ensuite le rôle suit sa licence, sans rien faire :

- **Retiré** à la fin de l'abonnement (résilié, impayé), au remboursement, au litige, à `revoke`, à la fin des 6 mois d'affiliation.
- **Rendu** au renouvellement, quand la carte repasse, à `restore`.
- Le changement part juste après l'événement Stripe ; tout le reste (commande admin, récompense terminée) est rattrapé toutes les 5 minutes. Une fois par jour (et à chaque redémarrage), le bot redonne le rôle à tous les comptes Premium liés : un joueur qui a quitté le serveur et qui revient le récupère.
- Un compte Rago = un compte Discord. Lier le même Discord depuis un autre compte le déplace (le rôle suit le nouveau compte). Délier retire le rôle.
- Les rôles donnés à la main avant (tickets) ne sont pas touchés : le bot ne gère que les comptes liés. Annonce sur Discord que chacun lie son compte, puis retire les anciens rôles à la main.

Sans les cinq variables ci-dessous, rien ne change : la page compte dit d'ouvrir un ticket, comme avant.

**Une fois pour toutes** (10 minutes) :

1. Ouvre **https://discord.com/developers/applications** → **New Application**, nom `Rago Optimizer` (c'est ce que le joueur voit sur la page d'autorisation), accepte les conditions.
2. **General Information** : copie l'**Application ID** → variable `DISCORD_CLIENT_ID`. Tu peux mettre le logo Rago en icône.
3. **OAuth2** : **Reset Secret**, copie-le → `DISCORD_CLIENT_SECRET`. Dans **Redirects**, **Add Redirect** : `https://account.rago-optimizer.com/account/discord/callback` (ton `PUBLIC_URL` suivi de `/account/discord/callback`, à l'identique), puis **Save Changes**.
4. **Bot** : **Reset Token**, copie-le → `DISCORD_BOT_TOKEN`. Aucun « Privileged Gateway Intent » n'est nécessaire.
5. **OAuth2 → URL Generator** : coche le scope `bot`, puis les permissions **Manage Roles** et **Create Instant Invite**. Ouvre l'URL générée en bas, choisis le serveur Rago, **Autoriser**. (La page `/admin` donne aussi ce lien tant que le bot n'est pas sur le serveur.)
6. Sur Discord : **Paramètres du serveur → Rôles**, glisse le rôle du bot (il porte son nom) **au-dessus** du rôle Pro. Discord interdit à un bot de donner un rôle placé au-dessus du sien : c'est l'oubli le plus courant.
7. Active le mode développeur : **Paramètres utilisateur → Avancés → Mode développeur**. Clic droit sur l'icône du serveur → **Copier l'identifiant du serveur** → `DISCORD_GUILD_ID`. Paramètres du serveur → Rôles → clic droit sur **Pro** → **Copier l'identifiant du rôle** → `DISCORD_ROLE_ID`.
8. Railway → Variables : ajoute les cinq (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID`). Railway redéploie tout seul.
9. Ouvre `/admin` : la section **Rôle Pro sur Discord** vérifie le bot, l'adresse de retour, le serveur, le rôle, les permissions et l'ordre des rôles, et dit quoi corriger. Tout doit être « OK ».
10. Teste avec ton compte Premium : **Link Discord** sur la page compte. Le badge « Role given » s'affiche et tu as le rôle sur le serveur.

La page compte dit « Premium role » (le mot de la charte) ; le bot donne le rôle dont tu as mis l'identifiant, quel que soit son nom sur le serveur.

---

## Ce que tu me donnes

| Quoi | Pourquoi |
|---|---|
| Ton **nom de domaine** | Pour régler `accountBase` du site et vérifier les adresses |
| Ton **lien d'invitation Discord** | Lien support des pages compte et de l'app, et accès au canal Premium |
| Tes **deux prix** (mensuel et annuel) | Pour que le site affiche les mêmes prix que Stripe |
| « Étape 6 faite » | Je vérifie que ton serveur répond bien depuis l'extérieur |
| Une capture si quelque chose coince | Pour trouver la cause |

**Jamais** : `sk_live`/`sk_test`, `whsec`, `SUPABASE_SERVICE_ROLE_KEY`, mot de passe de base de données, `RESEND_API_KEY`. Ils vont uniquement dans Railway.

## Récapitulatif des variables Railway

| Variable | D'où elle vient |
|---|---|
| `DATABASE_URL` | Supabase → Connect → Session pooler (étape 2.2) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys (étape 2.5). Servent aussi aux photos de profil (bucket `avatars`, créé tout seul ; `AVATAR_BUCKET` change son nom, facultatif) |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_SECRET_KEY` | Stripe (étapes 3.2 et 3.3) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (étape 6) |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend (étape 4) |
| `PUBLIC_URL`, `SITE_URL` | Ton domaine (étape 1) |
| `SUPPORT_URL` | Ton invitation Discord |
| `STRIPE_PORTAL_LOGIN_URL` | Stripe → Portail client → lien de connexion (étape 3.5) |
| `PRICE_LABEL` | Le prix affiché aux comptes gratuits : `$5.99 a month or $29.99 a year`, mêmes montants que Stripe et le site |
| `LICENSE_SIGNING_KEY`, `SESSION_SECRET` | `npm run admin -- export-keys` (étape 5.7) |
| `SCRIPTS_SECRET` | Une valeur aléatoire que tu génères une fois (étape 8), identique au secret GitHub `RAGO_SCRIPTS_SECRET`. Ne la change jamais |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID` | Discord Developer Portal et ton serveur (« Le rôle Pro sur Discord »). Facultatives : sans elles, le rôle se donne à la main |
| `ADMIN_KEY` | Une clé d'au moins 16 lettres et chiffres que tu choisis : elle ouvre `/admin`, où se règle le pop-up du site (« Le pop-up du site »). Sans elle, `/admin` n'existe pas |
| `INSTALLER_VERSION` | Le numéro de l'exe déposé dans le bucket, lu dans son nom `Rago Optimizer_<numéro>_x64-setup.exe` (ex. `1.1.5`). Affiché à côté du bouton de téléchargement. `INSTALLER_OBJECT` est facultatif (il donne le bucket et le dossier) : le `.exe` le plus récent du dossier est toujours servi |

À retirer s'il est encore là : `STRIPE_PRICE_ID` (ancien prix unique, plus vendu).

## Au quotidien (support)

Depuis ton PC, avec Node 22 installé, dans le dossier `licensing` du dépôt :

```bash
npm ci
export DATABASE_URL="la même que dans Railway"
export PUBLIC_URL="https://rago-production.up.railway.app"   # pour les liens que le support envoie (ton domaine plus tard)
npm run admin -- show joueur@mail.com           # sa licence, son PC, ce qui s'est passé, et ses achats pas encore rattachés
npm run admin -- attach joueur@mail.com         # rattache à son compte l'achat qu'il ne retrouve pas
npm run admin -- claim-link joueur@mail.com     # nouveau lien « Create your account » pour son achat (l'ancien ne marche plus)
npm run admin -- reset-link joueur@mail.com     # lien « Choose a new password » (1 h), si l'email n'arrive pas
npm run admin -- reset-device joueur@mail.com   # il a changé de PC : libère l'ancien
npm run admin -- grant ami@mail.com             # licence à vie offerte (ex. anciens acheteurs du .bat)
npm run admin -- grant-months 6 ami@mail.com    # Premium offert 6 mois à partir d'aujourd'hui, puis il s'arrête tout seul ; plusieurs emails à la suite possibles, ceux qui ont déjà Premium sont sautés
npm run admin -- affiliate affilie@mail.com     # son code, ses filleuls, pourquoi chacun compte ou non, ses récompenses
npm run admin -- create-promo RAGO15 15         # code promo Stripe (ici −15 % sur le premier paiement), voir « Codes promo »
npm run admin -- popup                          # le pop-up du site et ses places restantes ; popup RAGO50 50 15 pour une offre (voir « Le pop-up du site »)
npm run admin -- reviews                        # les derniers avis laissés dans l'app (note, nom public, email, affiché ou masqué)
npm run admin -- hide-review joueur@mail.com    # masque son avis du site (spam, insulte) ; show-review le remet
npm run admin -- remove-photo joueur@mail.com   # retire sa photo de profil (image inappropriée) ; demande aussi SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
npm run admin -- set-name joueur@mail.com "Nom" # change son nom public
npm run admin -- delete-user joueur@mail.com    # demande de suppression (RGPD) : résilie, supprime le compte, sa photo, son avis et le PC, anonymise la licence (avec une photo : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY aussi)
npm run admin -- export-keys                    # la clé qui signe les licences, à garder dans ton gestionnaire de mots de passe
npm run admin -- discord joueur@mail.com        # son Discord lié et son rôle Pro, remis d'aplomb tout de suite (demande les cinq DISCORD_ de Railway)
npm run admin -- discord-unlink joueur@mail.com # retire le rôle et délie son Discord
```

- **« J'ai payé mais mon compte n'a pas de licence »** (onglet fermé après le paiement, compte créé sur un autre appareil ou plus de 48 h après) : `show son@email.com` affiche l'achat sous « Not on any account yet ». S'il a déjà un compte avec cet email : `attach son@email.com`. S'il n'a pas de compte : `claim-link son@email.com` et envoie-lui le lien. S'il a payé avec un autre email : `show email-de-paiement`, puis `attach email-du-compte <id de la licence>`.
- **Rôle Pro sur Discord** : avec le bot (« Le rôle Pro sur Discord »), le joueur clique **Link Discord** sur sa page compte et le rôle suit sa licence tout seul. « Je n'ai pas le rôle » : `show son@email.com` affiche la ligne `discord` (compte lié, rôle donné ou non, et pourquoi : `not_member` = il n'est pas sur le serveur, son tableau de bord lui propose **Join with Discord**). `discord son@email.com` le remet d'aplomb tout de suite. Sans le bot : le joueur ouvre un ticket avec l'email de son compte, vérifie `status: 'active'` avec `show`, donne le rôle, et retire-le quand sa licence s'arrête.

- **Un joueur qui a déjà Premium paie une deuxième fois** (souvent déconnecté du site) : son compte garde sa licence, l'abonnement en trop est annulé et la licence en double désactivée automatiquement, aucun email d'achat ne part, et son tableau de bord lui dit de te contacter. Rembourse ce deuxième paiement dans Stripe → Paiements (`npm run admin -- show` montre les deux licences dans l'historique).
- **Avis** : un joueur laisse son avis depuis Rago Optimizer (1.1.8 et après), connecté à son compte ; il apparaît sur le site dans la minute, avec son nom public et sa photo. Un avis par compte : il le modifie au lieu d'en créer un autre, et peut le supprimer (dans l'app ou dans l'onglet **Profile** du compte). La section des avis du site reste masquée tant qu'il n'y en a aucun. Un avis gênant : `hide-review son@email.com`.
- **Photo de profil** : proposée juste après l'inscription (on peut passer), puis modifiable dans l'onglet **Profile** du compte ou dans les réglages de l'app. Le serveur vérifie l'image (JPG, PNG, WebP ou GIF, 5 Mo au plus), la recadre en 256 × 256, retire les données EXIF (position GPS comprise) et supprime l'ancienne quand elle est remplacée.
- **Mot de passe** : le joueur le change lui-même depuis son compte (lien « Change password » en bas du tableau de bord), ou avec « Forgot your password? » s'il l'a oublié.

### Programme d'affiliation, ce qui est vérifié

- Le code vient avec l'achat : le lien de l'affilié (`?ref=CODE`) le met dans le paiement Stripe avec −5 %, ou le joueur le tape lui-même sur la page Stripe (code promo). Il est rempli tout seul juste après, même si le joueur crée son compte plus tard sur un autre appareil. Sinon le joueur le tape juste après le paiement (création du compte, ou connexion si l'email a déjà un compte). Un client = un code, pour toujours.
- Refusé tout de suite : code inexistant, ou code de l'affilié lui-même (même email que le compte affilié ou que l'email de paiement).
- Un filleul compte **dès qu'il active Rago Optimizer sur son PC** (`AFFILIATE_HOLD_DAYS=0`, choix du 7 octobre 2026 ; un nombre de jours remet un délai après l'achat), si sa licence marche encore (ni remboursée, ni contestée, ni abonnement terminé) et si ce PC n'est ni un PC de l'affilié (y compris un PC où l'affilié s'est seulement connecté à l'app gratuite) ni celui d'un autre filleul déjà compté. Même client Stripe que l'affilié : refusé aussi. Dans la base, `referrals.status` passe de `pending` à `counted` (ou `void` avec la raison).
- **Un code sert à 3 joueurs maximum** (`AFFILIATE_MAX_REFERRALS`, choix de Sofiene du 7 octobre 2026) : un 4e joueur voit « This referral code was already used by 3 players » et le code promo Stripe est désactivé tout seul (plus de −5 %). Un joueur remboursé, contesté ou activé sur un PC de l'affilié libère sa place, et le code se rouvre.
- À 3 filleuls comptés (`AFFILIATE_GOAL`), l'affilié reçoit **6 mois de Premium** (`AFFILIATE_REWARD_MONTHS`), **une seule fois** (`AFFILIATE_REWARD_MAX=1` ; avec `0` et plus de places, ce serait 6 mois tous les 3 joueurs). Ensuite le code est fermé. Abonné : Stripe ne le prélève pas pendant 6 mois (essai gratuit ajouté à son abonnement, même clé, même PC), puis l'abonnement reprend. Sans abonnement : une licence de 6 mois, ou 6 mois de plus sur celle qu'il a déjà ; à la date de fin, l'app repasse en gratuit. Pendant ces 6 mois, il peut s'abonner (bouton « Subscribe now » de son compte) : Stripe ne le prélève qu'à la fin de la récompense, son PC passe sur la nouvelle licence sans nouvelle activation. Licence à vie offerte : rien à ajouter.
- Le calcul se fait quand un filleul active son PC, quand l'affilié ouvre son compte ou se connecte dans l'app, et toutes les heures sur le serveur. Si Stripe refuse la pause des paiements, rien n'est affiché comme donné et la récompense est retentée toutes les heures (`npm run admin -- affiliate` affiche l'erreur). Un code plein ou fermé n'est plus repris du lien de l'affilié : pas de −5 %, rien de pré-rempli.
- Une récompense donnée reste, même si un filleul est remboursé après coup. Le serveur le note : `npm run admin -- affiliate affilie@mail.com` affiche un avertissement, et tu décides.
- Limite connue : quelqu'un qui paie 3 abonnements avec 3 emails et 3 PC différents passera, **même avec une seule carte** (chaque paiement sans compte crée un nouveau client Stripe). Ça lui coûte 3 premiers mois à −5 % pour gagner 6 mois, une seule fois par compte ; si tu veux plus strict, mets `AFFILIATE_HOLD_DAYS` à 14 (un filleul ne compte alors que 14 jours après son achat, s'il n'a pas été remboursé).

Tu peux aussi voir les tables directement dans Supabase → **Table Editor**.
