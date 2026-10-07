# Rago

Tout le code de Rago dans un seul dépôt :

| Dossier | Quoi | Techno |
|---|---|---|
| `app/` | **Rago Optimizer**, l'app Windows (226 réglages, 10 modules, 5 presets). Gratuite avec 9 réglages ouverts, tout le reste avec Premium | Tauri 2, React + TypeScript, Rust |
| `brand/` | Logo, tailles d'icônes, `.ico`, images d'installeur, favicons, couleurs et voix de la marque | SVG, PNG |
| `site/` | La page de vente publique (anglais) et les pages légales | HTML statique, sans framework |
| `licensing/` | Le serveur : abonnements Stripe, comptes, licences, verrou sur un PC, affiliation, téléchargement de l'app | Node 22, Hono, Supabase (Postgres + Storage) |
| `.github/workflows/` | `app-windows.yml` fabrique le `setup.exe` sur un Windows de GitHub ; `licensing-tests.yml` lance les tests du serveur ; `site-check.yml` vérifie que `site/index.html` a été régénérée | GitHub Actions |
| `netlify.toml` / `Dockerfile` (racine) | Publication du site sur Netlify / variante qui sert site + serveur ensemble | Netlify / Docker |

Chaque dossier a son propre README avec le détail technique. Ce guide-ci explique comment les trois s'emboîtent et comment tout lancer, dans l'ordre.

Adresses actuelles, en attendant ton nom de domaine :

- site : `https://rago-optimiser.netlify.app`
- serveur de comptes : `https://rago-production.up.railway.app`

Dans ce guide, `ragohub.com` et `account.ragohub.com` sont des exemples : remplace-les par ton domaine quand tu l'auras.

---

## 1. Comment l'app et le site travaillent ensemble

```
   Joueur
     │
     ▼
 ┌──────────────────────────── ragohub.com  (Netlify) ─────────────────────────────────────┐
 │  /                 Page de vente (site/)                                                │
 │   ├─ « Download free »  → account.ragohub.com/download  (l'app, plan gratuit, sans compte)
 │   ├─ « Get Premium »    → account.ragohub.com/buy?interval=month|year ──► Stripe        │
 │   └─ Affiliation        → account.ragohub.com/affiliate                                 │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
                                       │  webhook Stripe → /webhooks/stripe
                                       ▼
 ┌──────────────────────── account.ragohub.com  (Railway) ─────────────────────────────────┐
 │                         base de données et fichier de l'app dans Supabase               │
 │  /checkout/success  « Payment confirmed. » → création du compte (+ code d'affilié)      │
 │  /account           Tableau de bord : licence, téléchargement, PC activé, abonnement    │
 │  /affiliate         Code d'affilié et progression vers 6 mois de Premium                │
 │  /login /signup /forgot   Connexion, création de compte, mot de passe oublié            │
 │  /download          Installeur de l'app, public (30 par heure et par adresse IP)        │
 │                                                                                         │
 │  /api/v1/...        API utilisée UNIQUEMENT par l'app                                   │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │  HTTPS
                          Rago Optimizer (app/) sur le PC du joueur
```

### L'offre

- **Gratuit** : l'app elle-même, sans compte ni licence. 9 réglages sont ouverts (souris, Game Mode, Game DVR, effets visuels, plein écran et les 4 réglages de Restore, liste dans `app/src/data/free.json`). Tout le reste est sous cadenas, presets compris ; un clic sur un cadenas propose « Unlock », qui ouvre la section Pricing du site. Le moteur Rust refuse aussi les réglages verrouillés : on ne contourne pas le cadenas en bricolant l'interface.
- **Premium** : abonnement Stripe **5,99 $ par mois ou 29,99 $ par an** (prix choisis le 7 octobre 2026). Tout est débloqué tant que l'abonnement est payé.
- **L'ancien .bat n'est plus proposé** : la seule offre gratuite, c'est l'app. Les anciens liens `/downloads/...` renvoient vers l'accueil du site.
- **Affiliation** : chaque affilié a un code, qui donne aussi −5 % au client sur son premier paiement Stripe (lien de l'affilié, ou code tapé dans **Add promotion code**). Un client n'utilise qu'un code, pour toujours. À 3 clients valides, l'affilié reçoit 6 mois de Premium, une seule fois, pour 3 filleuls (3 filleuls au maximum par affilié). Un client compte dès qu'il active l'app sur son PC (pas celui de l'affilié), tant qu'il n'est ni remboursé ni contesté.
- **Code promo du site** : le pop-up de la page de vente propose `RAGO15`, −15 % sur le premier paiement (à créer dans Stripe, section 8). Le détail des règles est à la fin de [`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md).

### Le parcours d'un acheteur, de bout en bout

1. Sur le site, il choisit mensuel ou annuel et clique **Get Premium**. Le lien pointe vers `/buy?interval=month` ou `year` (avec `&ref=CODE` s'il est arrivé par le lien d'un affilié, ou `&promo=RAGO15` s'il a pris le code du pop-up) ; le serveur le transforme en page de paiement Stripe.
2. Il paie. Stripe prévient le serveur (webhook), qui crée la licence. Le joueur revient sur `/checkout/success`, choisit un mot de passe (et tape le code d'un affilié s'il en a un) : son compte est créé. Il reçoit aussi un email avec le lien, au cas où il ferme l'onglet.
3. Sur son tableau de bord `/account`, il voit sa licence, son renouvellement, le bouton **Cancel or manage subscription** (portail Stripe) et télécharge `RagoOptimizer-Setup.exe`. S'il avait déjà installé l'app gratuite, il n'a rien à retélécharger.
4. Dans l'app, il se connecte avec **le même email et mot de passe**, clique **Activate**. La licence est verrouillée sur ce PC.
5. Le serveur renvoie à l'app un **jeton de licence signé**, valable 30 jours. L'app le vérifie toute seule, sans réseau, avec la clé publique compilée dedans, et le renouvelle quand il y a du réseau. Pas de connexion internet pendant une partie ? Ça marche quand même.
6. S'il essaie de se connecter depuis un autre PC : refusé (« This license is already active on another PC »). Changer de PC passe par toi sur Discord : `npm run admin -- reset-device <email>`. Réinstaller Windows ne le bloque pas en général : l'empreinte du PC combine 3 identifiants et reconnaît le même PC si 2 sur 3 sont identiques. Exception : si Windows ne lit plus le numéro de la carte mère après la réinstallation (ou un changement de pièce), il peut ne plus rester assez d'identifiants communs, et c'est alors à toi de libérer l'ancien PC avec `reset-device`.
7. Abonnement annulé ou impayé, remboursement, litige Stripe : la licence est coupée automatiquement et l'app repasse en gratuit à sa prochaine vérification.

Les deux seuls liens à régler entre l'app et le serveur, au moment de fabriquer l'exe :

- `RAGO_API_BASE` : l'adresse de l'API, ex. `https://account.ragohub.com/api/v1`.
- `RAGO_LICENSE_PUBKEY` : la clé **publique** du serveur. L'app ne fait confiance qu'aux jetons signés par la clé privée correspondante, que seul le serveur possède.

Le contrat précis entre les deux (requêtes, réponses, codes d'erreur) est dans `licensing/docs/API.md`.

---

## 2. Ce qu'il te faut

| Quoi | Pourquoi | Coût |
|---|---|---|
| Compte **Stripe** | Encaisser les abonnements | Commission par paiement |
| Compte **Supabase** | Base de données et fichier d'installation de l'app | Gratuit au départ |
| Compte **Railway** | Héberger le serveur de licences | ~5 $/mois |
| Compte **Netlify** | Héberger la page de vente | Gratuit |
| Un **nom de domaine** | Adresse du site et de l'API, compilée dans l'app | ~10 €/an |
| Compte **Resend** | Emails d'achat et de mot de passe oublié | Gratuit jusqu'à 3 000/mois |
| Lien d'invitation **Discord** | Lien support affiché sur le site, les pages de compte et dans l'app | Gratuit |
| Certificat de signature de code (optionnel au début) | Voir la section 4.2 sur SmartScreen | 200 à 400 €/an |

Rien à installer sur ton PC pour la mise en ligne : tout se fait dans les interfaces web.

---

## 3. Mettre le serveur et le site en ligne

Le pas-à-pas qui fait foi est **[`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md)** : domaine, Supabase, Stripe, Resend, Railway (Root Directory = `licensing`), webhook Stripe, Netlify, puis l'exe et le test complet. Suis-le dans l'ordre.

À retenir :

- **Aucune clé à générer sur ton PC.** Le serveur crée sa paire de clés de licence au premier démarrage et la garde dans Supabase. La clé publique, à donner à l'app, se lit sur `https://account.<ton-domaine>/api/v1/public-key?format=pem`.
- **Stripe → Paramètres → Informations publiques** : renseigne les URL de `terms.html` et `privacy.html` du site. Sans l'URL des conditions, la case « J'accepte les conditions et je renonce à mon droit de rétractation » n'apparaît pas sur la page de paiement (étape 3 de `MISE-EN-LIGNE.md`).
- **La devise des prix Stripe doit être celle du site.** Le site et les conditions de vente affichent aujourd'hui des dollars (`currency: "$"`). Un compte Stripe français propose l'euro par défaut : choisis la même devise des deux côtés.
- **Pas de volume Railway** : la base est Supabase Postgres (`DATABASE_URL`) et l'installeur est dans un bucket Storage privé.

### Régler la page de vente

Tout se règle dans l'objet `CONFIG`, en bas de `site/src/page.html` :

```js
const CONFIG = {
  accountBase: "https://rago-production.up.railway.app", // le serveur de comptes, sans / à la fin
  checkoutPath: "/buy",                 // ne pas toucher
  loginPath: "/login",                  // ne pas toucher
  signupPath: "/signup",                // ne pas toucher
  affiliatePath: "/affiliate",          // ne pas toucher
  freeAppPath: "/download",             // l'app gratuite, servie par le serveur de comptes
  discord: "",                          // ton invitation, ex. "https://discord.gg/tonInvite"
  currency: "$",
  priceMonth: 5.99,                     // prix mensuel Stripe
  priceYear: 29.99                      // prix annuel Stripe
};
```

- `priceMonth` et `priceYear` doivent être **exactement** les prix des deux `price_...` Stripe, dans la même devise que `currency`.
- Tant que `discord` est vide, les liens Discord du site sont masqués.
- Les avis clients sont écrits directement dans la section `#reviews` de la page : de vrais avis uniquement.
- `site/index.html` (la page publiée) est fabriquée à partir de `site/src/page.html`. Ne la modifie pas à la main : demande la modification sur le projet, elle est refaite par `site/tools/build.py`.

### Variante : site et serveur sur un seul domaine

Le `Dockerfile` à la racine sert la page de vente **et** le serveur depuis Railway, sans Netlify ni sous-domaine. Pour l'utiliser : Root Directory vide sur Railway, mêmes variables que dans `MISE-EN-LIGNE.md` (dont `DATABASE_URL`), `PUBLIC_URL` et `SITE_URL` sur le même domaine, et `accountBase: ""` dans le `CONFIG` du site. Ce n'est pas le chemin recommandé.

---

## 4. Fabriquer le setup.exe de l'app

L'app Windows ne peut être compilée que sur Windows. GitHub le fait pour toi, gratuitement.

1. Sur GitHub : **Settings → Secrets and variables → Actions**.
   - Onglet **Secrets**, **New repository secret** :
     - `RAGO_API_BASE` = `https://account.<ton-domaine>/api/v1`
     - `RAGO_LICENSE_PUBKEY` = le bloc affiché par `https://account.<ton-domaine>/api/v1/public-key?format=pem`, lignes `BEGIN` et `END` comprises
     - `RAGO_SCRIPTS_SECRET` = la même valeur que `SCRIPTS_SECRET` dans Railway (voir section 8, à faire avant la 1.1.6)
   - Onglet **Variables**, **New repository variable** :
     - `SITE_URL` = l'adresse du **site de vente** : `https://rago-optimiser.netlify.app` aujourd'hui, `https://<ton-domaine>` ensuite (le bouton Premium de l'app ouvre `SITE_URL/#pricing`). C'est la même adresse que la variable `SITE_URL` de Railway. Aujourd'hui la variable GitHub vaut encore l'adresse Railway : ça marche (le serveur renvoie vers le site), mais passe-la sur l'adresse Netlify puis relance une fabrication.
     - `SUPPORT_URL` (optionnelle) = ton lien d'invitation Discord, affiché comme lien support dans l'app
2. La fabrication se lance d'elle-même à chaque push qui touche `app/`. Tu peux aussi la lancer à la main : **Actions → app-windows → Run workflow**.
3. Compte environ 5 minutes (15 à 20 la première fois). À la fin, connecté avec le compte kaliso-dev : ouvre le run, section **Artifacts**, télécharge `rago-optimizer-setup`. C'est un zip qui contient `Rago Optimizer_<version>_x64-setup.exe` (aujourd'hui `Rago Optimizer_1.1.5_x64-setup.exe`, version 1.1.5). L'artefact est effacé au bout de 90 jours.

**Sans les deux secrets, la fabrication s'arrête en erreur** (étape « Vérifier les secrets »). C'est voulu : un exe fabriqué sans eux ne peut jamais passer en Premium et ses boutons de compte ouvrent `localhost`. Ne distribue jamais un tel exe.

### 4.1 Mettre l'exe à disposition des joueurs

Le bouton « Download free » du site et le bouton « Download Rago Optimizer » du tableau de bord servent le même fichier, déposé dans le bucket privé `downloads` de Supabase. Le téléchargement est public : sans licence, l'app tourne en gratuit. Le serveur le sert sous le nom `RagoOptimizer-Setup.exe`.

1. Décompresse l'artefact et dépose le **`.exe`** (pas le zip) dans Supabase → **Storage → downloads**. Le serveur prend le `.exe` le plus récent du bucket.
2. Vérifie sur `https://account.<ton-domaine>/download/status` : tu dois voir `"ok":true` et le nom de ton fichier.

Pour chaque nouvelle version : dans `app/`, lance `npm run bump 1.2.0` (avec le nouveau numéro ; il met à jour `package.json` et `Cargo.toml`, ne modifie pas `tauri.conf.json` à la main), pousse, laisse la fabrication tourner, dépose le nouvel exe et mets à jour `INSTALLER_VERSION` dans Railway. Le détail est à l'étape 8 de [`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md).

### 4.2 L'alerte SmartScreen

Sans certificat de signature, Windows affiche « Windows a protégé votre ordinateur » au premier lancement : il faut cliquer **Informations complémentaires → Exécuter quand même**. L'app demande aussi les droits administrateur, c'est voulu (elle modifie des réglages système).

Un certificat ne fait pas disparaître l'alerte du jour au lendemain : un certificat neuf doit d'abord gagner de la réputation auprès de Microsoft, au fil des téléchargements. Pour aider à chaque version : passe l'exe sur [VirusTotal](https://www.virustotal.com) et, s'il est signalé à tort, soumets-le à Microsoft (Microsoft Security Intelligence → *Submit a file*).

---

## 5. Tester tout le parcours avant d'ouvrir

Le test complet est l'étape 9 de `licensing/docs/MISE-EN-LIGNE.md`. En résumé, avec les clés Stripe de **test**, dans une fenêtre de navigation privée :

0. Si tu avais installé l'ancienne version de test **« Rago Hub »**, désinstalle-la d'abord : Paramètres Windows → **Applications → Applications installées** → Rago Hub → **Désinstaller**. Elle a un autre identifiant que Rago Optimizer, donc les deux s'installeraient côte à côte.
1. Sur le site, **Download free** : l'app s'installe et tourne en gratuit, 9 réglages ouverts.
2. **Get Premium** (mensuel), paie avec `4242 4242 4242 4242`.
3. Crée ton compte, vérifie que le tableau de bord montre la licence et que l'exe se télécharge.
4. Dans l'app, connecte-toi, clique **Activate** : tout se débloque.
5. Sur un deuxième PC (ou une machine virtuelle), connecte-toi avec le même compte : ça doit être refusé.
6. Tableau de bord → **Cancel or manage subscription** : le portail Stripe s'ouvre.
7. Dans Stripe, rembourse le paiement : l'app repasse en gratuit à sa prochaine vérification.
8. `npm run admin -- reset-device <email>` puis reconnecte-toi depuis le deuxième PC : ça doit passer.
9. Affiliation : avec un 2e compte, `/affiliate` → **Get my referral code**, puis un achat test avec un autre email qui tape ce code dans **Add promotion code** (−5 %). Après **Activate** dans l'app sur un autre PC, le cercle de `/affiliate` passe à 1/3.
10. Pop-up du site : **Claim my discount** puis **Get Premium** : la page Stripe affiche −15 % (`RAGO15` doit exister, section 8).

Quand tout est bon : refais en **live** les prix, la clé `sk_live_`, le portail et le webhook `whsec_`, puis remplace-les dans Railway (étape 10 de `MISE-EN-LIGNE.md`).

---

## 6. Le support au quotidien

Depuis ton PC avec Node 22, dans le dossier `licensing`, avec le même `DATABASE_URL` que Railway :

```bash
npm run admin -- show <email>            # compte, licence, PC, derniers événements
npm run admin -- reset-device <email>    # le joueur a changé de PC
npm run admin -- revoke <email> [raison]
npm run admin -- restore <email>
npm run admin -- grant <email> [note]    # licence à vie offerte, ex. anciens acheteurs du .bat Premium
npm run admin -- affiliate <email>       # son code, ses filleuls, pourquoi chacun compte ou non, ses récompenses
npm run admin -- create-promo RAGO15 15  # code promo Stripe à −15 % (une fois en test, une fois en live)
```

Changement de PC en libre-service (une fois tous les 30 jours depuis le tableau de bord) : mets `SELF_SERVICE_RESET_DAYS=30` dans Railway.

**Rôle Premium sur Discord** : après l'achat, le tableau de bord et l'email d'achat disent au joueur d'ouvrir un ticket sur ton Discord avec l'email de son compte. Vérifie avec `npm run admin -- show <son email>` : si la licence est `active`, donne-lui le rôle Premium. Si elle s'arrête (fin d'abonnement, remboursement, litige), retire le rôle. Le détail est dans [`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md), section « Au quotidien ».

---

## 7. Développer en local

```bash
# Serveur + site, sur http://localhost:8787 (sans DATABASE_URL : base en mémoire, effacée à l'arrêt)
cd licensing && npm ci && SITE_DIR=../site npm run dev
npm test                                  # parcours complet (aussi lancé par GitHub à chaque push sur licensing/)

# Le build debug de l'app vise localhost:8787 avec la clé de test de licensing/docs/test/
# App, sur un PC Windows dans un terminal administrateur
cd app && npm ci && npm run tauri dev
```

---

## 8. Ce qui manque encore

- **À faire avant la 1.1.6** : génère **une seule** valeur secrète (par exemple `openssl rand -hex 32`, ou 64 lettres et chiffres d'un générateur de mots de passe). Mets-la dans Railway → Variables → `SCRIPTS_SECRET` **et** dans le secret GitHub `RAGO_SCRIPTS_SECRET`, identique au caractère près, et ne la change **jamais** ensuite : les versions déjà installées ne pourraient plus déverrouiller leurs commandes Premium. Laisse Railway redéployer le serveur avant de distribuer la 1.1.6 (détail : `licensing/docs/MISE-EN-LIGNE.md`, étape 8).
- **Les prix de Premium dans Stripe** : 5,99 $ par mois et 29,99 $ par an, en dollars comme le site. Crée dans Stripe les deux prix récurrents, le portail client et les événements du webhook, puis mets `STRIPE_PRICE_MONTHLY` et `STRIPE_PRICE_YEARLY` dans Railway (et `PRICE_LABEL`, par exemple `$5.99 a month`).
- **Affiliation et code promo** : dans Railway → Variables, supprime `AFFILIATE_HOLD_DAYS` (l'ancienne valeur 14 ; sans elle, un filleul compte dès l'activation), puis crée le code du pop-up avec `npm run admin -- create-promo RAGO15 15`, une fois avec la clé Stripe test et une fois avec la clé live.
- **L'exe dans le bucket** `downloads` de Supabase, vérifié sur `/download/status` (section 4.1).
- **Désactiver GitHub Pages** : Settings → Pages → Source « None » (ou « Unpublish site »). Rien du dépôt n'y est plus publié, mais Pages n'a aucune utilité ici.
- **Le nom de domaine.** Le jour où il marche, il faut changer l'adresse partout où elle est écrite :
  - Railway : `PUBLIC_URL` (adresse du serveur de comptes, sert aussi à vérifier l'origine des formulaires) et `SITE_URL` (adresse du site) ;
  - GitHub : le secret `RAGO_API_BASE` et la variable `SITE_URL` (adresse du site), puis une nouvelle fabrication de l'exe ;
  - site : `accountBase` dans le `CONFIG` de `site/src/page.html`, la constante `SITE` de `site/tools/build.py`, `site/robots.txt` et `site/sitemap.xml` (qui contiennent l'adresse netlify.app), puis régénérer `index.html` ;
  - `netlify.toml` : les 7 redirections vers `rago-production.up.railway.app` ;
  - Stripe : les URL des conditions et de la confidentialité (Informations publiques **et** liens du portail client) et l'adresse du webhook.
- **Le lien d'invitation Discord** (dans `CONFIG.discord` du site, `SUPPORT_URL` sur Railway et la variable `SUPPORT_URL` sur GitHub) et la **clé Resend**.
- **`LowLatency.pow` et `smartctl.exe`** : utilisés par l'app (à déposer dans `app/src-tauri/resources/`) mais pas fournis. Sans `LowLatency.pow`, le réglage « Rago Low Latency power plan » reste grisé ; sans `smartctl.exe`, « Disk power management » ne règle pas l'APM et l'AAM des disques.
- **La variable GitHub `SITE_URL`** : la passer sur `https://rago-optimiser.netlify.app` (section 4), puis relancer une fabrication.
- **Protéger la branche de production** : Settings → Branches → règle sur la branche par défaut qui interdit le force-push et la suppression.
- **Railway, attendre les tests** : dans le service → **Settings**, active **Wait for CI** (Railway attend que les vérifications GitHub du commit, dont `licensing-tests`, soient vertes avant de redéployer), mets **Watch Paths** = `licensing/**` (un changement du site ou de l'app ne redéploie plus le serveur) et, dans **Deploy**, **Healthcheck Path** = `/healthz` (un nouveau déploiement qui ne répond pas, par exemple parce que la base est injoignable, ne remplace pas celui qui marche). Revers de Wait for CI : si une autre vérification du même commit échoue (par exemple la fabrication de l'app ou `site-check`), Railway peut sauter le déploiement du serveur, et le commit qui répare la vérification ne le relance pas s'il ne touche pas `licensing/`. Après chaque envoi qui modifie `licensing/`, regarde donc l'onglet **Deployments** de Railway : si le déploiement est marqué sauté (*skipped*), relance-le avec **Redeploy** une fois toutes les vérifications vertes.
- **Les pages légales** (`terms.html`, `privacy.html`, `refunds.html`) sont des brouillons avec un bandeau « Draft » et des champs en jaune. Il faut ton identité de vendeur (nom ou société, adresse, pays, email de contact, numéro d'immatriculation et TVA s'il y en a) : donne-les sur le projet et elles sont remplies dans `site/tools/make_legal.py`, puis régénérées sans le bandeau. Vérifie ensuite que « Draft » a disparu des trois pages. **À faire avant d'ouvrir les paiements** : Stripe fait accepter ces conditions au client.
- **Certificat de signature de code** (section 4.2).

### Plus tard, au calme : renommer la branche en `main`

La branche par défaut porte encore un nom technique (`claude/rago-monorepo-initial-eyj6pq`). Pour la renommer sans rien casser, dans cet ordre :

1. GitHub → **Branches** → renommer la branche par défaut en `main`.
2. Netlify → **Site configuration → Build & deploy → Branches** : Production branch = `main`.
3. Railway → service → **Settings → Source** : Branch = `main`.
4. Pousse une petite modification et vérifie que Netlify et Railway redéploient tous les deux.

Sans les étapes 2 et 3, le site et le serveur arrêtent de se mettre à jour sans prévenir.
