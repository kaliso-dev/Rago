# Mettre Rago en ligne, étape par étape

À la fin, voici ce qui marche en vrai : le joueur clique sur « Get Rago Hub Premium » sur ton site, paie sur Stripe, crée son compte, arrive sur son tableau de bord avec sa clé de licence et le bouton de téléchargement, installe Rago Hub, se connecte et active sa licence sur son PC.

**Comment c'est organisé :**

| Quoi | Où | Adresse (exemple avec `ragohub.com`) |
|---|---|---|
| Page de vente + Rago Free | Netlify | `https://ragohub.com` |
| Paiement, comptes, tableau de bord, API de l'app | Railway | `https://account.ragohub.com` |
| Base de données + fichier d'installation de l'app | Supabase | (privé, seul le serveur y accède) |
| Paiements | Stripe | page de paiement hébergée par Stripe |
| Emails (achat, mot de passe oublié) | Resend | envoyés depuis `hello@ragohub.com` |

Dans tout le guide, remplace `ragohub.com` par ton vrai domaine.

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
4. **Le bucket pour l'app** : **Storage → New bucket**, nom `downloads`, **Public bucket désactivé** (privé). Tu y déposeras le fichier d'installation à l'étape 8.
5. **Les clés** : **Project Settings → API Keys**.
   - L'URL du projet (`https://abcd.supabase.co`) : **c'est `SUPABASE_URL`.**
   - La clé secrète (`service_role` dans l'onglet *Legacy API keys*, ou une *Secret key* `sb_secret_...`) : **c'est `SUPABASE_SERVICE_ROLE_KEY`.** Elle donne tous les droits : uniquement dans Railway.

## Étape 3 : Stripe (paiement)

1. Crée un compte sur [stripe.com](https://stripe.com). En haut à droite, active le **mode test**.
2. **Catalogue de produits → Ajouter un produit** :
   - Nom : `Rago Hub Premium`. Description : `Rago Hub for Windows, one PC per license.`
   - Prix : **Paiement unique**, ton montant, en EUR ou USD.
   - Enregistre, ouvre le prix et copie son identifiant `price_...` : **c'est `STRIPE_PRICE_ID`.**
3. **Développeurs → Clés API** : copie la **clé secrète** `sk_test_...` : **c'est `STRIPE_SECRET_KEY`.**
4. **Paramètres → Image de marque** : logo `brand/logo/png/rago-icon-512.png`, couleur `#FF3347`. La page de paiement aura l'air de la tienne.
5. **Paramètres → E-mails clients** : coche les reçus pour les paiements réussis.

Le webhook se fait à l'étape 6, une fois le serveur en ligne.

## Étape 4 : Resend (emails)

1. Crée un compte sur [resend.com](https://resend.com) → **Domains → Add domain** → ton domaine.
2. Resend te montre 3 ou 4 enregistrements DNS (TXT et MX). Ajoute-les chez ton registrar, puis **Verify**. Ça peut prendre de quelques minutes à quelques heures.
3. **API Keys → Create API key**, permission *Sending access* : **c'est `RESEND_API_KEY`.**

Sans Resend, tout marche sauf les emails : pas de lien de secours après achat, pas de « mot de passe oublié ». Tu peux le faire en dernier.

## Étape 5 : Railway (le serveur)

1. Crée un compte sur [railway.com](https://railway.com) avec ton GitHub. Le plan Hobby coûte environ 5 $ par mois.
2. **New Project → Deploy from GitHub repo → kaliso-dev/Rago**.
3. Clique sur le service créé → **Settings → Source → Root Directory** : `licensing`. Railway utilise alors `licensing/Dockerfile`. Pas besoin de volume : tout est dans Supabase.
4. **Variables → Raw Editor**, colle ceci en remplaçant les valeurs :

   ```
   NODE_ENV=production
   TRUST_PROXY=1
   PUBLIC_URL=https://account.ragohub.com
   SITE_URL=https://ragohub.com
   DATABASE_URL=postgresql://postgres.abcd:TON_MOT_DE_PASSE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://abcd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   INSTALLER_OBJECT=downloads/RagoHub-Setup.exe
   INSTALLER_VERSION=1.0.0
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_a_remplir_a_l_etape_6
   RESEND_API_KEY=re_...
   MAIL_FROM=Rago <hello@ragohub.com>
   SUPPORT_URL=https://discord.gg/ton-invitation
   ```

   Tu n'as **pas** de clé de licence à générer : au premier démarrage, le serveur crée sa paire de clés et la garde dans Supabase.
5. **Settings → Networking → Custom Domain** : `account.ragohub.com`. Railway affiche un enregistrement **CNAME** : ajoute-le chez ton registrar (nom `account`, valeur donnée par Railway). Le HTTPS se met en place tout seul.
6. **Vérifie** dans ton navigateur :
   - `https://account.ragohub.com/healthz` affiche `{"ok":true}` ;
   - `https://account.ragohub.com/signup` affiche la page « Create your account » aux couleurs de Rago.

   Si le déploiement échoue, l'onglet **Deployments → View logs** dit quelle variable manque.

## Étape 6 : le webhook Stripe

C'est ce qui prévient le serveur qu'un paiement est passé.

1. Stripe (mode test) → **Développeurs → Webhooks → Ajouter une destination**.
2. Événements à cocher :
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`.
3. URL : `https://account.ragohub.com/webhooks/stripe`.
4. Copie le **secret de signature** `whsec_...` → Railway → Variables → remplace `STRIPE_WEBHOOK_SECRET`. Railway redéploie tout seul.

## Étape 7 : le site sur Netlify

1. Sur [netlify.com](https://netlify.com) : **Add new site → Import from GitHub → kaliso-dev/Rago**. Le `netlify.toml` du dépôt publie déjà le dossier `site/`.
2. **Domain management → Add a domain** : `ragohub.com`, puis ajoute chez ton registrar les enregistrements DNS que Netlify indique.
3. Dans `site/index.html`, l'objet `CONFIG` doit contenir `accountBase: "https://account.ragohub.com"`. **Donne-moi ton domaine et je le fais régler.** Les boutons « Get Rago Hub Premium », « Sign in » et « Create account » pointeront alors vers ton serveur.
4. Vérifie : sur `https://ragohub.com`, le bouton Premium t'emmène sur la page de paiement Stripe (mode test).

## Étape 8 : l'app Windows et son fichier d'installation

1. Ouvre `https://account.ragohub.com/api/v1/public-key?format=pem` et copie tout le bloc, lignes `BEGIN` et `END` comprises. C'est la **clé publique** que l'app embarque pour vérifier les licences.
2. GitHub → **kaliso-dev/Rago → Settings → Secrets and variables → Actions** :
   - Secret `RAGO_API_BASE` = `https://account.ragohub.com/api/v1`
   - Secret `RAGO_LICENSE_PUBKEY` = le bloc copié ci-dessus
   - Variable `SITE_URL` = `https://account.ragohub.com`
3. **Actions → app-windows → Run workflow**. À la fin, télécharge l'artefact `rago-hub-setup` et décompresse-le.
4. Supabase → **Storage → downloads → Upload file** : dépose l'exe, renommé exactement `RagoHub-Setup.exe`.
5. À chaque nouvelle version : remplace le fichier dans le bucket et mets à jour `INSTALLER_VERSION` dans Railway.

## Étape 9 : le test complet (toujours en mode test)

Fais-le de bout en bout, comme un vrai client, dans une fenêtre de navigation privée :

1. `https://ragohub.com` → **Get Rago Hub Premium**.
2. Sur Stripe, paie avec la carte `4242 4242 4242 4242`, une date future, n'importe quel CVC.
3. Tu arrives sur « Payment confirmed. » → crée ton compte.
4. Tableau de bord : la clé de licence s'affiche, le bouton **Download Rago Hub** télécharge l'exe.
5. Installe, ouvre Rago Hub, connecte-toi avec le même email et mot de passe, clique **Activate** → « License active. Rago Hub is ready. »
6. Recharge le tableau de bord : la carte **Device** montre ton PC.
7. Sur un 2e PC (celui de ton pote) : la connexion doit être refusée avec « This license is already active on another PC. »
8. Dans Stripe, rembourse ce paiement test : la licence passe en « Refunded » sur le tableau de bord, et Rago Hub s'arrête à sa prochaine vérification.

Si une étape coince, envoie-moi une capture et l'heure : je trouve la cause.

## Étape 10 : passer en vrai

1. Stripe → **Activer les paiements** : informations sur toi ou ta société, et ton IBAN. Stripe demande une pièce d'identité.
2. Repasse en **mode live**, puis refais en live les étapes 3.2, 3.3 et 6 : nouveau `price_...`, nouvelle clé `sk_live_...`, nouveau webhook `whsec_...`.
3. Remplace ces trois variables dans Railway.
4. Fais un vrai achat avec ta carte, puis rembourse-le depuis Stripe : la boucle complète est vérifiée.

---

## Ce que tu me donnes

| Quoi | Pourquoi |
|---|---|
| Ton **nom de domaine** | Pour régler `accountBase` du site et vérifier les adresses |
| Ton **lien d'invitation Discord** | Lien support des pages compte et de l'app |
| Le **prix** affiché (ex. 14,99 €) | Pour que le site affiche le même prix que Stripe |
| « Étape 6 faite » | Je vérifie que ton serveur répond bien depuis l'extérieur |
| Une capture si quelque chose coince | Pour trouver la cause |

**Jamais** : `sk_live`/`sk_test`, `whsec`, `SUPABASE_SERVICE_ROLE_KEY`, mot de passe de base de données, `RESEND_API_KEY`. Ils vont uniquement dans Railway.

## Récapitulatif des variables Railway

| Variable | D'où elle vient |
|---|---|
| `DATABASE_URL` | Supabase → Connect → Session pooler (étape 2.2) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys (étape 2.5) |
| `STRIPE_PRICE_ID`, `STRIPE_SECRET_KEY` | Stripe (étapes 3.2 et 3.3) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (étape 6) |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend (étape 4) |
| `PUBLIC_URL`, `SITE_URL` | Ton domaine (étape 1) |
| `SUPPORT_URL` | Ton invitation Discord |
| `INSTALLER_OBJECT`, `INSTALLER_VERSION` | Fixes : `downloads/RagoHub-Setup.exe`, version de l'exe |

## Au quotidien (support)

Depuis ton PC, avec Node 22 installé, dans le dossier `licensing` du dépôt :

```bash
npm ci
export DATABASE_URL="la même que dans Railway"
npm run admin -- show joueur@mail.com           # sa licence, son PC, ce qui s'est passé
npm run admin -- reset-device joueur@mail.com   # il a changé de PC : libère l'ancien
npm run admin -- grant ami@mail.com             # licence offerte (ex. anciens acheteurs du .bat)
```

Tu peux aussi voir les tables directement dans Supabase → **Table Editor**.
