# Développer sans toucher à la version en ligne

Rago est en ligne depuis le 10 octobre 2026. Ce guide explique comment continuer à modifier l'app et le site sans que les joueurs le voient avant que tu le décides : sur ton Mac d'abord, puis sur un serveur de test en ligne (« staging »).

## Ce qui change la version en ligne, et rien d'autre

| Quoi | Ce qui le met à jour |
|---|---|
| Le site `rago-optimizer.com` (Netlify) | Une pull request **fusionnée** dans la branche principale |
| Le serveur de comptes `account.rago-optimizer.com` (Railway) | Une pull request **fusionnée** dans la branche principale (si elle touche `licensing/`) |
| L'app chez les joueurs | Un nouvel exe **déposé par toi** dans le bucket `downloads` du Supabase de production |

Tout le reste ne touche pas la production : ton Mac, les branches, les pull requests ouvertes, les aperçus Netlify, l'exe fabriqué par GitHub, le serveur de staging. Donc la règle est simple : **toute modification passe par une pull request, et on ne la fusionne qu'après l'avoir vue** (sur le Mac, sur l'aperçu Netlify ou sur staging).

La branche principale s'appelle encore `claude/rago-monorepo-initial-eyj6pq` (voir « Renommer la branche en main » dans le README).

---

## 1. Installer une fois sur le Mac

1. **Node.js** : sur [nodejs.org](https://nodejs.org), l'installeur macOS de la version **LTS** (22 ou plus).
2. **GitHub Desktop** : [desktop.github.com](https://desktop.github.com), connecte-toi avec le compte `kaliso-dev`, puis **File → Clone repository → kaliso-dev/rago**. C'est lui qui récupère les branches et les modifications.
3. **Google Chrome** : il a le même moteur que la fenêtre de l'app sur Windows (WebView2), donc le rendu le plus proche de ce que voient les joueurs.
4. Pour ouvrir un Terminal dans le dossier du projet : GitHub Desktop → **Repository → Open in Terminal**. La première fois, macOS peut proposer d'installer les « outils de ligne de commande » : accepte.

Astuce : Réglages Système → Apparence → **Afficher les barres de défilement : Toujours**, pour les voir comme sur Windows.

## 2. Voir l'app sur le Mac

```bash
cd app
npm install        # la première fois, puis quand package.json change
npm run window
```

Une fenêtre Chrome de 1280 × 820 s'ouvre, la taille de l'app sur Windows, sans barre d'adresse. Le bandeau « Web demo, tweaks are simulated » rappelle que rien ne touche ton Mac : les réglages, les infos du PC et la connexion sont simulés.

- **Tes modifications s'affichent tout de suite** : enregistre un fichier de `app/src`, la fenêtre se met à jour seule.
- **Premium ou gratuit** : clique **Sign in**, tape n'importe quel email et un mot de passe de 4 caractères ou plus, puis **Activate** : tout se débloque. Un email qui commence par `free` donne un compte sans Premium, un email qui commence par `other` donne « already active on another PC ». **Settings → Sign out** repasse en gratuit.
- **Arrêter** : `Ctrl + C` dans le Terminal, puis ferme la fenêtre.
- Sans Chrome : `npm run dev` puis ouvre `http://localhost:1420` dans n'importe quel navigateur (Edge et Brave font pareil que Chrome ; Safari affiche quelques petites différences).

Ce que le Mac ne peut pas montrer : les vrais réglages Windows, le point de restauration, la vraie licence. Pour ça, il faut l'exe sur un PC Windows : ton ancien PC, ou une machine virtuelle Windows 11 sur le Mac (UTM, Parallels ou VMware Fusion). Une machine virtuelle est même idéale pour tester des réglages : on revient en arrière en un clic avec un instantané.

## 3. Voir le site et les pages de compte sur le Mac

```bash
cd licensing
npm install        # la première fois, puis quand package.json change
npm run local
```

- `http://localhost:8787` : le site.
- `http://localhost:8787/login` : les pages de compte. Le compte `test@rago.dev`, mot de passe `password123`, a Premium. Tu peux en créer d'autres.
- Tout est en mémoire et repart de zéro à chaque redémarrage. Les emails s'affichent dans le Terminal au lieu de partir. Le paiement n'est pas branché (« Checkout opens soon ») : il se teste sur staging.
- Les boutons du site (Sign in, Get Premium, Download) vont vers ce serveur local, **jamais vers le vrai**. Même si ton Terminal a encore le `DATABASE_URL` de production (pour `npm run admin`), `npm run local` l'ignore, comme les clés Stripe live, Resend et Discord.
- L'app et le serveur ensemble : lance `npm run local` dans un Terminal et `npm run window` dans un autre ; les liens de compte de l'app ouvrent alors ce serveur local.

La page publiée `site/index.html` est fabriquée à partir de `site/src/page.html` (et `site/reviews.html` à partir de `site/src/reviews.html`, `site/tweaks.html` à partir de `site/src/tweaks.html`). Pendant une modification, `http://localhost:8787/src/page.html` montre la source ; `index.html`, `reviews.html` et `tweaks.html` sont refaites par `python3 site/tools/build.py` (Claude le fait dans la pull request).

## 4. Le chemin d'une modification

1. **Demande la modification sur le projet.** Claude travaille sur une branche et ouvre une pull request (ou fais-la toi-même dans GitHub Desktop : **Branch → New branch**, puis **Push** et **Create Pull Request**).
2. **Regarde-la avant de fusionner :**
   - **App** : dans GitHub Desktop, **Current branch** → la branche de la pull request, puis `npm run window`. Pour un vrai test sur Windows, l'exe est dans l'onglet **Actions** de GitHub → `app-windows` → le run de la branche → **Artifacts**.
   - **Site** : sur la pull request, le lien **Deploy Preview** de Netlify. C'est le site modifié, en ligne mais à une adresse à part.
   - **Pages de compte et paiements** : `npm run local`, ou staging (section 5).
3. **Fusionne** (Merge pull request) quand tout est bon : c'est le seul moment où le site et le serveur en ligne changent. Pour l'app, dépose le nouvel exe dans Supabase comme d'habitude (README, section 4.1).

Conseil Railway, s'il n'est pas déjà en place : service → **Settings** → **Wait for CI** activé, **Watch Paths** = `licensing/**`, et **Healthcheck Path** = `/healthz`. Un serveur qui ne démarre pas ne remplace alors jamais celui qui marche.

---

## 5. Le serveur de test en ligne (staging)

Une copie complète, en ligne, avec sa propre base de données et Stripe en mode test : pour essayer un paiement, un email, une page de compte ou l'exe contre un vrai serveur, sans toucher aux vrais comptes. À mettre en place une fois (compte une demi-heure), **après la fusion de la pull request qui ajoute ce guide** : c'est elle qui ajoute les garde-fous.

| | Production | Staging |
|---|---|---|
| Serveur de comptes | `https://account.rago-optimizer.com` | l'adresse Railway de l'environnement `staging` (par exemple `https://rago-staging.up.railway.app`) |
| Site | `https://rago-optimizer.com` | `https://staging--rago-optimiser.netlify.app` |
| Branche | la branche principale | `staging` |
| Base de données | le projet Supabase actuel | un 2e projet Supabase |
| Stripe | live | mode test (carte `4242 4242 4242 4242`) |

Les garde-fous : un serveur de staging **refuse de démarrer** avec une clé Stripe live ou avec la base de données de production. Chaque base retient le serveur qui l'a ouverte en premier, et un autre environnement la refuse (un serveur local aussi). Sur staging, chaque page a un bandeau jaune « Test server (staging) » et chaque email commence par `[Test]`.

### a. GitHub : la branche staging

Sur github.com/kaliso-dev/rago, menu des branches → tape `staging` → **Create branch staging from** la branche principale.

### b. Supabase : un 2e projet

1. **New project** → nom `rago-staging`, même région que la production, un mot de passe (garde-le).
2. **Connect → Session pooler** → copie l'adresse (remplace `[YOUR-PASSWORD]`) : c'est le `DATABASE_URL` de staging. Les tables se créent seules au premier démarrage.
3. Facultatif, pour tester « Download » : **Storage → New bucket** `downloads` (privé), dépose-y un exe ; **Project Settings → API keys** donne `SUPABASE_SERVICE_ROLE_KEY`, et l'adresse du projet `SUPABASE_URL`.

Ne copie jamais la base de production dans ce projet : staging doit rester vide de vrais joueurs.

### c. Stripe en mode test

Tout se fait avec **Mode test** activé (en haut à droite), comme avant le lancement :

- **Prix** : Catalogue de produits → Rago Optimizer Premium → les deux prix **test** (5,99 et 29,99 USD) créés avant le lancement. Copie les deux `price_...`.
- **Clé** : Développeurs → Clés API → clé secrète `sk_test_...`.
- **Webhook** : Développeurs → Webhooks → **Ajouter une destination**, URL `<adresse staging>/webhooks/stripe`, les 10 événements de l'étape 6 de [`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md). Copie son secret `whsec_...`. (Il te faudra l'adresse staging de l'étape d : tu peux revenir ici après.)
- **Portail client** (mode test) enregistré, comme à l'étape 3.5 du même guide.

### d. Railway : l'environnement staging

1. En haut du projet Railway, le menu **production** → **New Environment** → nom **`staging`** (exactement) → **Duplicate** l'environnement production.
2. Service → **Settings → Source → Branch** : `staging`. **Settings → Networking → Generate Domain** : note l'adresse (c'est l'« adresse staging »). Pas de domaine personnalisé.
3. **Variables** de l'environnement staging, à changer :

   | Variable | Valeur staging |
   |---|---|
   | `DATABASE_URL` | l'adresse du projet Supabase `rago-staging` |
   | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET` | les valeurs **test** de l'étape c |
   | `STRIPE_PORTAL_LOGIN_URL` | le lien du portail **test**, ou supprime-la |
   | `PUBLIC_URL` | l'adresse staging |
   | `SITE_URL` | `https://staging--rago-optimiser.netlify.app` |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | celles de `rago-staging`, ou supprime-les |
   | `APP_ENV` (à ajouter) | `staging` |

   À **supprimer** si elles existent : `LICENSE_SIGNING_KEY`, `SESSION_SECRET` (staging fabrique les siennes), toutes les `DISCORD_` (sinon le bot de staging donne et retire des rôles sur le vrai Discord), `INSTALLER_OBJECT`.
   À garder telles quelles : `NODE_ENV`, `TRUST_PROXY`, `SCRIPTS_SECRET`, `ADMIN_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `INSTALLER_VERSION`.
4. **Deploy**. Vérifie `<adresse staging>/healthz`, puis `<adresse staging>/admin` (même `ADMIN_KEY`) : « Clé de test : aucun paiement n'est réel », prix, webhook et portail en « OK ».

Si tu as oublié une variable, ce n'est pas grave : avec la clé Stripe live ou la base de production, le serveur de staging s'arrête au démarrage et ses logs Railway disent quoi changer.

### e. Netlify : le site de staging et les aperçus

1. **Site configuration → Build & deploy → Continuous deployment → Branches and deploy contexts → Configure** → Branch deploys : **Let me add individual branches** → `staging`. Laisse les Deploy Previews activées.
2. **Site configuration → Environment variables → Add a variable** : `STAGING_ACCOUNT_URL` = l'adresse staging (sans `/` à la fin).
3. Le site de staging est `https://staging--rago-optimiser.netlify.app`. Les aperçus des pull requests utilisent aussi le serveur de staging. Sans la variable, leurs boutons de compte sont simplement coupés : un aperçu n'envoie jamais vers le vrai serveur ni vers le vrai Stripe.

### f. GitHub : l'exe de test (facultatif)

Pour essayer l'app Windows contre staging. GitHub → **Settings → Secrets and variables → Actions** :

- Secret `STAGING_RAGO_API_BASE` = `<adresse staging>/api/v1`
- Secret `STAGING_RAGO_LICENSE_PUBKEY` = le bloc affiché par `<adresse staging>/api/v1/public-key?format=pem`, lignes `BEGIN` et `END` comprises
- Variable `STAGING_SITE_URL` = `https://staging--rago-optimiser.netlify.app`

Ensuite, chaque modification de `app/` poussée sur `staging` fabrique l'exe de test ; ou **Actions → app-windows → Run workflow**, choisis la branche et « staging ». L'artefact s'appelle `rago-optimizer-setup-STAGING` et contient `Rago Optimizer Staging_<version>_x64-setup.exe` : il s'installe à côté du vrai Rago et sa barre de titre affiche « Test server (staging) ».

- **Ne dépose jamais cet exe dans le Supabase de production.**
- Sur un même PC, les deux apps partagent la connexion au compte : après un test, reconnecte-toi dans le vrai Rago.

### g. Mettre une modification sur staging

La branche `staging` est ce que montrent le serveur et le site de staging. Pour y essayer une pull request, demande sur le projet « mets la PR <numéro> sur staging », ou dans GitHub Desktop : **Current branch** → `staging`, **Branch → Merge into current branch** → la branche de la pull request, puis **Push origin**. Railway et Netlify redéploient staging tout seuls.

Paiement test : `4242 4242 4242 4242`, une date future, n'importe quel CVC. Le support sur staging : `DATABASE_URL=<adresse Supabase staging> npm run admin -- show <email>` depuis `licensing/`.
