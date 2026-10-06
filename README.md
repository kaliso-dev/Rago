# Rago

Tout le code de Rago dans un seul dépôt :

| Dossier | Quoi | Techno |
|---|---|---|
| `app/` | **Rago Optimizer**, l'app Windows payante (189 tweaks, 12 modules) | Tauri 2, React + TypeScript, Rust |
| `brand/` | Logo, tailles d'icônes, `.ico`, images d'installeur, favicons, couleurs et voix de la marque | SVG, PNG |
| `site/` | La page de vente publique (anglais), avec **Rago Free** (le .bat) en téléchargement libre | HTML statique, sans framework |
| `licensing/` | Le serveur : paiement Stripe, comptes, clés de licence, verrou sur un PC | Node 22, Hono, Supabase (Postgres + Storage) |
| `.github/workflows/app-windows.yml` | Fabrique le `setup.exe` de l'app sur un Windows de GitHub | GitHub Actions |
| `netlify.toml` / `Dockerfile` (racine) | Publication du site sur Netlify / variante qui sert site + serveur ensemble | Netlify / Docker |

Chaque dossier a son propre README avec le détail technique. Ce guide-ci explique comment les trois s'emboîtent et comment tout lancer, dans l'ordre.

---

## 1. Comment l'app et le site travaillent ensemble

```
   Joueur
     │
     ▼
 ┌──────────────────────────── ragohub.com  (Netlify) ─────────────────────────────────────┐
 │  /                 Page de vente (site/)                                                │
 │   ├─ « Download free »  → /downloads/rago-optimizer-v5.2.bat   (Rago Free, sans compte) │
 │   └─ « Get Premium »    → account.ragohub.com/buy ──► Stripe Checkout (paiement unique) │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
                                       │  webhook Stripe → /webhooks/stripe
                                       ▼
 ┌──────────────────────── account.ragohub.com  (Railway) ─────────────────────────────────┐
 │                         base de données et fichier de l'app dans Supabase               │
 │  /checkout/success  « Payment confirmed. Create your account to get your license. »    │
 │  /account           Tableau de bord : licence, « Download Rago Optimizer », PC activé   │
 │  /login /forgot     Connexion, mot de passe oublié                                      │
 │                                                                                         │
 │  /api/v1/...        API utilisée UNIQUEMENT par l'app                                   │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │  HTTPS
                          Rago Optimizer (app/) sur le PC du joueur
```

Le parcours d'un acheteur, de bout en bout :

1. Sur le site, il clique **Get Rago Optimizer Premium**. Le lien pointe vers `/buy`, que le serveur transforme en page de paiement Stripe.
2. Il paie. Stripe prévient le serveur (webhook), qui crée la licence. Le joueur revient sur `/checkout/success`, choisit un mot de passe : son compte est créé. Il reçoit aussi un email avec le lien, au cas où il ferme l'onglet.
3. Sur son tableau de bord `/account`, il voit sa clé de licence et télécharge `RagoHub-Setup.exe`. Le téléchargement est réservé aux comptes qui ont payé.
4. Il installe l'app, se connecte avec **le même email et mot de passe**, clique **Activate**. La licence est verrouillée sur ce PC.
5. Le serveur renvoie à l'app un **jeton de licence signé**, valable 30 jours. L'app le vérifie toute seule, sans réseau, avec la clé publique compilée dedans, et le renouvelle au démarrage et une fois par jour quand il y a du réseau. Pas de connexion internet pendant une partie ? Ça marche quand même.
6. S'il essaie de se connecter depuis un autre PC : refusé (« This license is already active on another PC »). Changer de PC passe par toi sur Discord : `npm run admin -- reset-device <email>`. Réinstaller Windows ne le bloque pas : l'empreinte du PC combine 3 identifiants et en tolère un qui change.
7. Remboursement ou litige Stripe : la licence est coupée automatiquement, l'app s'arrête à sa prochaine vérification.

Les deux seuls liens à régler entre l'app et le serveur, au moment de fabriquer l'exe :

- `RAGO_API_BASE` : l'adresse de l'API, ex. `https://account.ragohub.com/api/v1`.
- `RAGO_LICENSE_PUBKEY` : la clé **publique** du serveur. L'app ne fait confiance qu'aux jetons signés par la clé privée correspondante, que seul le serveur possède.

Le contrat précis entre les deux (requêtes, réponses, codes d'erreur) est dans `licensing/docs/API.md`.

---

## 2. Ce qu'il te faut avant de commencer

| Quoi | Pourquoi | Coût |
|---|---|---|
| Compte **Stripe** | Encaisser les paiements | Commission par vente |
| Un **nom de domaine** | Adresse du site et de l'API, compilée dans l'app | ~10 €/an |
| Compte **Supabase** | Base de données et fichier d'installation de l'app | Gratuit au départ |
| Compte **Railway** | Héberger le serveur de licences | ~5 $/mois |
| Compte **Netlify** | Héberger la page de vente | Gratuit |
| Compte **Resend** | Emails d'achat et de mot de passe oublié | Gratuit jusqu'à 3 000/mois |
| Lien d'invitation **Discord** | Lien support affiché partout | Gratuit |
| Certificat de signature de code (optionnel au début) | Sans lui, Windows SmartScreen affiche « Windows a protégé votre ordinateur » au premier lancement | 200 à 400 €/an |

Rien à installer sur ton PC pour la mise en ligne : tout se fait dans les interfaces web.

---

## 3. Mettre le serveur et le site en ligne

Le pas-à-pas qui fait foi est **[`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md)** : domaine, Supabase, Stripe, Resend, Railway (Root Directory = `licensing`), webhook Stripe, Netlify, puis l'exe et le test complet. Suis-le dans l'ordre.

À retenir :

- **Aucune clé à générer sur ton PC.** Le serveur crée sa paire de clés de licence au premier démarrage et la garde dans Supabase. La clé publique, à donner à l'app, se lit sur `https://account.<ton-domaine>/api/v1/public-key?format=pem`.
- **Pas de volume Railway** : la base est Supabase Postgres (`DATABASE_URL`) et l'installeur est dans un bucket Storage privé.
- **Page de vente** : en plus de `accountBase`, tout se règle dans l'objet `CONFIG` en bas de `site/src/page.html` (et de `site/index.html`, la version déployée) :

  ```js
  const CONFIG = {
    accountBase: "https://account.ragohub.com",   // le serveur de licences, sans / à la fin
    checkoutPath: "/buy",      // ne pas toucher
    loginPath: "/login",       // ne pas toucher
    signupPath: "/signup",     // ne pas toucher
    freeDownloadUrl: "downloads/rago-optimizer-v5.2.bat",
    discord: "https://discord.gg/tonInvite",
    price: "$14.99",
    priceNote: "one-time payment",
    stats: [{ value: "4,200", label: "members on Discord" }],
    reviews: [{ text: "…", author: "Pseudo", detail: "Ranked BedWars" }]   // de vrais avis uniquement
  };
  ```

  Le prix affiché doit être le même que celui du `price_...` Stripe.

### Variante : site et serveur sur un seul domaine

Le `Dockerfile` à la racine sert la page de vente **et** le serveur depuis Railway, sans Netlify ni sous-domaine. Pour l'utiliser : Root Directory vide sur Railway, mêmes variables que dans `MISE-EN-LIGNE.md` (dont `DATABASE_URL`), `PUBLIC_URL` et `SITE_URL` sur le même domaine, et `accountBase: ""` dans le `CONFIG` du site. Ce n'est pas le chemin recommandé.

---

## 4. Fabriquer le setup.exe de l'app

L'app Windows ne peut être compilée que sur Windows. GitHub le fait pour toi, gratuitement.

1. Sur GitHub : **Settings → Secrets and variables → Actions**.
   - Onglet **Secrets**, **New repository secret** :
     - `RAGO_API_BASE` = `https://account.<ton-domaine>/api/v1`
     - `RAGO_LICENSE_PUBKEY` = le bloc affiché par `https://account.<ton-domaine>/api/v1/public-key?format=pem`, lignes `BEGIN` et `END` comprises
   - Onglet **Variables**, **New repository variable** :
     - `SITE_URL` = `https://account.<ton-domaine>` (le serveur, qui sert les pages de compte que l'app ouvre)
2. Lance la fabrication, au choix :
   - **Actions → app-windows → Run workflow** ;
   - ou pousse un tag de version : `git tag app-v1.0.0 && git push origin app-v1.0.0`.

   Elle se lance aussi d'elle-même à chaque push ou pull request qui touche `app/`.
3. Compte environ 15 à 20 minutes la première fois. À la fin :
   - l'exe est dans l'onglet du run, section **Artifacts** (`rago-optimizer-setup`) ;
   - avec un tag, il est aussi joint à un **brouillon de release** dans **Releases**.

Sans les deux secrets, l'exe sort quand même, mais **sans écran de connexion** : n'importe qui pourrait s'en servir sans payer. Ne distribue jamais un exe fabriqué sans eux.

### 4.1 Mettre l'exe à disposition des acheteurs

Le bouton « Download Rago Optimizer » du tableau de bord sert le fichier d'installation déposé dans le bucket privé `downloads` de Supabase, par un lien temporaire réservé aux comptes payés. Le dépôt du fichier et la mise à jour de `INSTALLER_VERSION` sont décrits à l'étape 8 de [`licensing/docs/MISE-EN-LIGNE.md`](licensing/docs/MISE-EN-LIGNE.md).

Pour chaque nouvelle version : monte `version` dans `app/src-tauri/tauri.conf.json` et `app/package.json`, relance la fabrication, remplace le fichier dans le bucket, mets à jour `INSTALLER_VERSION`.

---

## 5. Tester tout le parcours avant d'ouvrir

Le test complet est l'étape 9 de `licensing/docs/MISE-EN-LIGNE.md`. En résumé, avec les clés Stripe de **test** :

1. Ouvre ton site, clique **Get Rago Optimizer Premium**, paie avec `4242 4242 4242 4242`.
2. Crée ton compte, vérifie que le tableau de bord montre la clé et que l'exe se télécharge.
3. Installe l'app, connecte-toi, clique **Activate**.
4. Sur un deuxième PC (ou une machine virtuelle), connecte-toi avec le même compte : ça doit être refusé.
5. Dans Stripe, rembourse le paiement : au prochain démarrage, l'app doit refuser l'accès.
6. `npm run admin -- reset-device <email>` puis reconnecte-toi depuis le deuxième PC : ça doit passer.

Quand tout est bon : remplace `sk_test_`, `whsec_` et `price_` par leurs versions **live** dans Railway, et recrée le webhook en mode live.

---

## 6. Le support au quotidien

Depuis Railway (`railway ssh`, puis `cd /app`) ou en local avec le même `DATABASE_URL` :

```bash
npm run admin -- show <email>            # compte, licence, PC, derniers événements
npm run admin -- reset-device <email>    # le joueur a changé de PC
npm run admin -- revoke <email> [raison]
npm run admin -- restore <email>
npm run admin -- grant <email> [note]    # licence offerte, ex. anciens acheteurs du .bat Premium
```

Changement de PC en libre-service (une fois tous les 30 jours depuis le tableau de bord) : mets `SELF_SERVICE_RESET_DAYS=30` dans Railway.

---

## 7. Développer en local

```bash
# Serveur + site, sur http://localhost:8787 (sans DATABASE_URL : base en mémoire, effacée à l'arrêt)
cd licensing && npm ci && SITE_DIR=../site npm run dev
npm test                                  # parcours complet

# Le build debug de l'app vise localhost:8787 avec la clé de test de licensing/docs/test/
# App, sur un PC Windows dans un terminal administrateur
cd app && npm ci && npm run tauri dev
```

---

## 8. Ce qui manque encore

- **Choix à faire** : prix, nom de domaine, comptes Stripe, Supabase, Railway, Netlify, Resend, invitation Discord.
- **`LowLatency.pow` et `smartctl.exe`** : utilisés par le .bat mais pas fournis. À déposer dans `app/src-tauri/resources/` ; sans eux le tweak « plan d'alimentation » reste grisé.
- **Certificat de signature de code** : sans lui, avertissement SmartScreen au premier lancement.
- **Avis et chiffres réels** pour la page de vente (`CONFIG.reviews`, `CONFIG.stats`).
