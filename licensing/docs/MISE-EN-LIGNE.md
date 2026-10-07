# Mettre Rago Optimizer en ligne, étape par étape

À la fin, voici ce qui marche en vrai : le joueur choisit mensuel ou annuel sur ton site, s'abonne sur Stripe, crée son compte (avec le code d'un affilié s'il en a un), arrive sur son tableau de bord avec sa clé de licence et le bouton de téléchargement, installe Rago Optimizer, se connecte et active sa licence sur son PC.

**Comment c'est organisé :**

| Quoi | Où | Adresse (exemple avec `ragohub.com`) |
|---|---|---|
| Page de vente (et l'ancien .bat gratuit) | Netlify | `https://ragohub.com` |
| Paiement, comptes, tableau de bord, API de l'app | Railway | `https://account.ragohub.com` |
| Base de données + fichier d'installation de l'app | Supabase | (privé, seul le serveur y accède) |
| Paiements | Stripe | page de paiement hébergée par Stripe |
| Emails (achat, mot de passe oublié) | Resend | envoyés depuis `hello@ragohub.com` |

Dans tout le guide, remplace `ragohub.com` par ton vrai domaine.

> **Sans domaine (ta situation actuelle)**
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
> **Le jour où tu as un domaine** : Railway Custom Domain puis `PUBLIC_URL` et `SITE_URL` ; nouvelle URL du webhook Stripe ; Netlify domaine ; `CONFIG.accountBase`, `og:url` et `SITE` de `site/tools/build.py` (dis-le-moi, je le fais) ; secrets GitHub `RAGO_API_BASE` et variable `SITE_URL`, puis une nouvelle version de l'app. **Garde l'adresse `rago-production.up.railway.app` active** : les apps déjà installées l'ont en dur et l'utilisent pour renouveler leurs licences. Le serveur accepte les deux adresses : connexion, inscription et « Forgot » marchent sur l'une comme sur l'autre (les anciens liens d'achat aussi). Chaque adresse a ses propres cookies, donc un joueur connecté sur l'une devra se reconnecter sur l'autre.

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
5. **Les clés** : **Project Settings → API Keys**.
   - L'URL du projet (`https://abcd.supabase.co`) : **c'est `SUPABASE_URL`.**
   - La clé secrète (`service_role` dans l'onglet *Legacy API keys*, ou une *Secret key* `sb_secret_...`) : **c'est `SUPABASE_SERVICE_ROLE_KEY`.** Elle donne tous les droits : uniquement dans Railway.

## Étape 3 : Stripe (paiement)

1. Crée un compte sur [stripe.com](https://stripe.com). En haut à droite, active le **mode test**.
2. **Catalogue de produits → Ajouter un produit**, un seul produit avec **deux prix** :
   - Nom : `Rago Optimizer Premium`. Description : `Rago Optimizer for Windows, one PC per license.`
   - **Devise** : choisis-la une fois pour toutes (EUR si tes joueurs sont surtout en Europe, USD si le site affiche des $). Les deux prix doivent avoir la même devise que celle affichée sur le site ; Stripe ne convertit pas.
   - Prix 1 : **Récurrent**, période **Mensuelle**, ton prix par mois (ex. 4,99).
   - **Ajouter un autre prix** → Prix 2 : **Récurrent**, période **Annuelle**, ton prix par an. Par défaut on part sur 10 fois le mensuel (2 mois offerts, ex. 49,90), comme l'annonce le site.
   - Enregistre. Ouvre chaque prix et copie son identifiant `price_...` : le mensuel **c'est `STRIPE_PRICE_MONTHLY`**, l'annuel **c'est `STRIPE_PRICE_YEARLY`**.
3. **Développeurs → Clés API** : copie la **clé secrète** `sk_test_...` : **c'est `STRIPE_SECRET_KEY`.**
4. **Paramètres → Facturation → Portail client** : clique **Activer le lien de test** (ou Enregistrer), coche « Annuler les abonnements » (à la fin de la période), « Changer de formule » avec tes deux prix, et « Mettre à jour le moyen de paiement ». C'est la page qu'ouvre le bouton **Cancel or manage subscription** du tableau de bord.
   Sur la même page, copie le **lien de connexion au portail** (`https://billing.stripe.com/p/login/...`) : **c'est `STRIPE_PORTAL_LOGIN_URL`**. Il permet de résilier avec son seul email, même sans compte Rago Optimizer (obligatoire en France : résiliation « en trois clics »). Il apparaît en bas de toutes les pages compte (« Cancel subscription ») ; donne-le aussi au thread site pour le pied de page et la page Refunds.
5. **Paramètres → Facturation → Abonnements et e-mails** : coche les relances automatiques en cas d'échec de paiement (Smart Retries) et, à la fin des relances, **Annuler l'abonnement**. Pendant les relances le joueur garde Premium ; à l'annulation la licence s'arrête toute seule.
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
   Toujours dans **Settings** : **Watch Paths** = `licensing/**` (un push qui ne touche que l'app ou le site ne redéploie pas le serveur), et active **Wait for CI** (Railway attend que les vérifications GitHub soient vertes avant de déployer).
4. **Variables → Raw Editor**, colle ceci en remplaçant les valeurs :

   ```
   NODE_ENV=production
   TRUST_PROXY=1
   PUBLIC_URL=https://account.ragohub.com
   SITE_URL=https://ragohub.com
   DATABASE_URL=postgresql://postgres.abcd:TON_MOT_DE_PASSE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://abcd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   INSTALLER_VERSION=1.1.1
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_YEARLY=price_...
   STRIPE_WEBHOOK_SECRET=whsec_a_remplir_a_l_etape_6
   STRIPE_PORTAL_LOGIN_URL=https://billing.stripe.com/p/login/...
   RESEND_API_KEY=re_...
   MAIL_FROM=Rago Optimizer <hello@ragohub.com>
   SUPPORT_URL=https://discord.gg/ton-invitation
   PRICE_LABEL=$4.99 a month or $49.90 a year
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

1. Ouvre `https://account.ragohub.com/api/v1/public-key?format=pem` et copie tout le bloc, lignes `BEGIN` et `END` comprises. C'est la **clé publique** que l'app embarque pour vérifier les licences.
2. GitHub → **kaliso-dev/Rago → Settings → Secrets and variables → Actions** :
   - Secret `RAGO_API_BASE` = `https://account.ragohub.com/api/v1`
   - Secret `RAGO_LICENSE_PUBKEY` = le bloc copié ci-dessus
   - Variable `SITE_URL` = `https://ragohub.com`
3. **Actions → app-windows → Run workflow**. Ouvre ensuite **le run le plus récent avec une coche verte** → **Artifacts** → `rago-optimizer-setup` → décompresse : le fichier est `Rago Optimizer_<version>_x64-setup.exe`. Les anciens artefacts `rago-hub-setup` contiennent l'ancienne app « Rago Hub » : supprime-les (icône corbeille dans chaque ancien run) pour ne pas te tromper.
4. Supabase → **Storage → downloads → Upload file** : dépose le fichier `.exe` qui est **dans** le zip (pas le zip lui-même). Son nom n'a pas d'importance : le serveur sert toujours le `.exe` le plus récent du bucket.
5. **Vérifie** : ouvre `https://account.ragohub.com/download/status`. Tu dois voir `"ok":true` et le nom de ton fichier. Sinon la ligne `error` dit quoi corriger (clé Supabase refusée, bucket vide, mauvais nom de bucket).
6. À chaque nouvelle version : dépose le nouvel exe (tu peux supprimer l'ancien) et mets à jour `INSTALLER_VERSION` dans Railway. Vérifie sur `/download/status` que `file` donne bien le nouveau nom (cette page relit le bucket à chaque fois ; le bouton de téléchargement suit dans la minute).

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
10. Affiliation : avec un 2e compte, va sur `/affiliate` → **Get my referral code**. Fais un achat test avec un autre email et tape ce code à la création du compte : il apparaît dans la liste « Players who used your code », compté 14 jours après l'achat si le joueur a activé Rago Optimizer sur son PC.

Si une étape coince, envoie-moi une capture et l'heure : je trouve la cause.

## Étape 10 : passer en vrai

1. Stripe → **Activer les paiements** : informations sur toi ou ta société, et ton IBAN. Stripe demande une pièce d'identité.
2. Repasse en **mode live**, puis refais en live les étapes 3.2 à 3.5 et 6 : deux nouveaux `price_...`, nouvelle clé `sk_live_...`, portail client, nouveau webhook `whsec_...`.
3. Remplace ces quatre variables dans Railway.
4. Fais un vrai achat avec ta carte, puis rembourse-le depuis Stripe : la boucle complète est vérifiée.

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
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys (étape 2.5) |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_SECRET_KEY` | Stripe (étapes 3.2 et 3.3) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (étape 6) |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend (étape 4) |
| `PUBLIC_URL`, `SITE_URL` | Ton domaine (étape 1) |
| `SUPPORT_URL` | Ton invitation Discord |
| `STRIPE_PORTAL_LOGIN_URL` | Stripe → Portail client → lien de connexion (étape 3.4) |
| `PRICE_LABEL` | Le prix affiché aux comptes gratuits, ex. `$4.99 a month or $49.90 a year`, dans la même devise que Stripe et le site |
| `LICENSE_SIGNING_KEY`, `SESSION_SECRET` | `npm run admin -- export-keys` (étape 5.7) |
| `INSTALLER_VERSION` | La version de l'exe déposé (ex. `1.1.1`). `INSTALLER_OBJECT` est facultatif (il donne le bucket et le dossier) : le `.exe` le plus récent du dossier est toujours servi |

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
npm run admin -- affiliate affilie@mail.com     # son code, ses filleuls et pourquoi chacun compte ou non
npm run admin -- delete-user joueur@mail.com    # demande de suppression (RGPD) : résilie, supprime le compte et le PC, anonymise la licence
npm run admin -- export-keys                    # la clé qui signe les licences, à garder dans ton gestionnaire de mots de passe
```

- **« J'ai payé mais mon compte n'a pas de licence »** (onglet fermé après le paiement, compte créé sur un autre appareil ou plus de 48 h après) : `show son@email.com` affiche l'achat sous « Not on any account yet ». S'il a déjà un compte avec cet email : `attach son@email.com`. S'il n'a pas de compte : `claim-link son@email.com` et envoie-lui le lien. S'il a payé avec un autre email : `show email-de-paiement`, puis `attach email-du-compte <id de la licence>`.
- **Rôle Premium sur Discord** : le joueur ouvre un ticket avec l'email de son compte (son tableau de bord le lui dit). Vérifie avec `npm run admin -- show son@email.com` : `status: 'active'` → donne-lui le rôle Premium. Si sa licence s'arrête (fin d'abonnement, remboursement), retire le rôle.

- **Un joueur qui a déjà Premium paie une deuxième fois** (souvent déconnecté du site) : son compte garde sa licence, l'abonnement en trop est annulé et la licence en double désactivée automatiquement, aucun email d'achat ne part, et son tableau de bord lui dit de te contacter. Rembourse ce deuxième paiement dans Stripe → Paiements (`npm run admin -- show` montre les deux licences dans l'historique).
- **Mot de passe** : le joueur le change lui-même depuis son compte (lien « Change password » en bas du tableau de bord), ou avec « Forgot your password? » s'il l'a oublié.

### Programme d'affiliation, ce qui est vérifié

- Le code vient avec l'achat : le lien de l'affilié (`?ref=CODE`) le met dans le paiement Stripe, et il est rempli tout seul juste après, même si le joueur crée son compte plus tard sur un autre appareil. Sinon le joueur le tape juste après le paiement (création du compte, ou connexion si l'email a déjà un compte). Un client = un code, pour toujours.
- Refusé tout de suite : code inexistant, ou code de l'affilié lui-même (même email que le compte affilié ou que l'email de paiement).
- Un filleul compte **14 jours après son achat** (`AFFILIATE_HOLD_DAYS`), si sa licence marche encore à ce moment-là (ni remboursée, ni contestée, ni abonnement déjà terminé), et s'il a **activé Rago Optimizer sur un PC** qui n'est ni un PC de l'affilié (y compris un PC où l'affilié s'est seulement connecté à l'app gratuite) ni celui d'un autre filleul déjà compté. Même client Stripe que l'affilié : refusé aussi.
- À 3 filleuls comptés (`AFFILIATE_GOAL`), l'affilié reçoit Rago Optimizer Premium **à vie**, verrouillé sur un PC comme les autres. S'il était abonné, c'est sa licence actuelle qui devient à vie (même clé, même PC) et Stripe arrête de le prélever à la fin de la période.
- Le calcul se fait quand l'affilié ouvre son compte ou se connecte dans l'app, et toutes les heures sur le serveur.
- Une fois la récompense obtenue, elle reste, même si un filleul est remboursé après coup. Le serveur le note : `npm run admin -- affiliate affilie@mail.com` affiche un avertissement, et tu décides (`revoke affilie@mail.com affiliate_fraud` reprend la licence).
- Limite connue : quelqu'un qui paie 3 abonnements avec 3 emails et 3 PC différents passera, **même avec une seule carte** (chaque paiement sans compte crée un nouveau client Stripe). Ça lui coûte 3 mois d'abonnement minimum ; si tu veux plus strict, monte `AFFILIATE_HOLD_DAYS` à 30 ou 45.

Tu peux aussi voir les tables directement dans Supabase → **Table Editor**.
