---
type: code
tags: [code, site, netlify, config]
fichier: netlify.toml
lignes: 82
maj: 2026-11-10
---
# netlify.toml

Le fichier de configuration de [[Netlify]] à la racine du dépôt : ce qui est publié, la commande lancée selon le contexte (production, branche `staging`, aperçus de PR), la fonction edge, les en-têtes de sécurité et les redirections. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Branches et environnements]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11). Les commentaires du fichier sont en français.

## Rôle et place dans l'ensemble
Netlify lit ce fichier à chaque déploiement. Il ne construit **rien** : les pages sont déjà générées et commitées par [[build.py]] et [[make_legal.py]]. La « commande de build » ne fait que retirer ce qui ne doit pas être publié, et, sur les aperçus, rediriger les liens de compte vers le serveur de staging avec [[preview.sh]].

## Contenu, bloc par bloc
### `[build]` (contexte production, branche de prod)
- `publish = "site"` : tout le dossier `site/` est publié.
- `command = "rm -rf site/src site/tools && rm -f site/*.md"` : les sources (`site/src/`), les outils (`site/tools/`) et les notes internes (`site/CLAUDE.md`, `site/recherche-conversion.md`) ne sont jamais publiés.

### `[context.deploy-preview]` et `[context.branch-deploy]`
`command = "sh netlify/preview.sh"` pour les aperçus de pull request et pour les déploiements de branche (dans la pratique la branche `staging`, à l'adresse `staging--rago-optimiser.netlify.app`). Le commentaire explique : leurs liens de compte, les avis et le pop-up passent par le serveur de comptes de **staging** (variable Netlify `STAGING_ACCOUNT_URL`), jamais par le vrai ; sans la variable, ces liens sont coupés. Détails : [[preview.sh]].

### `[[edge_functions]]`
`function = "launch-gate"`, `path = "/*"` : la fonction [[launch-gate.js]] passe devant **toutes** les requêtes. Commentaire : avant `LAUNCH_AT` (par défaut le samedi 10 octobre 2026 à 15 h, heure de Paris) tout le site était remplacé par un compte à rebours, sauf pour l'équipe (`/acces/<PREVIEW_KEY>` pose un cookie, `/acces/sortir` le retire) ; « Après le lancement la fonction laisse tout passer ; on pourra la retirer ». Elle est donc inactive depuis le 10/10.

### `[[headers]]` sur `/*`
| En-tête | Valeur |
|---|---|
| `X-Frame-Options` | `DENY` (le site ne peut pas être affiché dans un cadre) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |

Pas de `Content-Security-Policy` pour le site lui-même (seule la page du compte à rebours en avait une).

### `[[redirects]]`, dans l'ordre
| De | Vers | Code | `force` | Pourquoi (commentaire) |
|---|---|---|---|---|
| `https://rago-optimiser.netlify.app/*` | `https://rago-optimizer.com/:splat` | 301 | oui | ancienne adresse Netlify : anciens liens partagés et apps 1.1.7 et avant dont le bouton Premium ouvre `rago-optimiser.netlify.app/#pricing` |
| `/refunds.html` | `/terms.html#cancel` | 301 | oui | page des remboursements supprimée le 10/11 (plus de remboursement) : les anciens liens (e-mails, Stripe) ouvrent les conditions d'annulation |
| `/buy` | `https://account.rago-optimizer.com/buy` | 302 | non | pages de compte sur le serveur de comptes (navigateurs sans JavaScript, anciens liens) |
| `/login` | `…/login` | 302 | non | idem |
| `/signup` | `…/signup` | 302 | non | idem |
| `/affiliate` | `…/affiliate` | 302 | non | idem |
| `/download` | `…/download` | 302 | non | idem (installateur de l'app) |
| `/account` | `…/account` | 302 | non | idem |
| `/account/*` | `…/account/:splat` | 302 | non | idem |
| `/downloads/*` | `/` | 301 | oui | l'ancien `.bat` gratuit n'est plus proposé |

Le commentaire rappelle que `rago-production.up.railway.app` (l'adresse Railway d'origine du serveur) reste active pour les apps déjà installées ([[Railway]]).

## Erreurs et cas limites
- Les redirections 302 sans `force` ne jouent que si aucun fichier du même nom n'existe dans `site/` (règle de Netlify) ; c'est le cas aujourd'hui.
- **Les 302 visent le serveur de prod dans tous les contextes**, y compris sur `staging` et les aperçus : une adresse tapée à la main comme `staging--rago-optimiser.netlify.app/buy` mène au vrai serveur. Les liens des pages, eux, sont réécrits par [[preview.sh]]. CONFIRMÉ dans le fichier ; impact jugé faible (personne ne tape ces adresses), à garder en tête.
- La redirection `/refunds.html` n'existe que sur `staging` tant que la 1.3.0 n'est pas en prod (la branche de prod a encore `site/refunds.html`).

## Liens avec le reste
- Commandes lancées : [[preview.sh]] ; fonction edge : [[launch-gate.js]].
- Pages publiées : [[Fichiers publiés du site]] ; génération : [[build.py]], [[make_legal.py]].
- Hébergement, contextes et variables : [[Netlify]], [[Variables d'environnement]] ; adresses du serveur de comptes : [[Serveur de licences]], [[Railway]].
- Pendant de ce fichier côté Docker (jamais utilisé) : `Dockerfile` de la racine ([[Fichiers de la racine du dépôt]]).

## À savoir avant de modifier
- Toute nouvelle page ou ressource publique doit être dans `site/` ; tout fichier de `site/` hors `src/`, `tools/` et `*.md` est public.
- Supprimer la fonction edge : retirer le bloc `[[edge_functions]]` **et** le dossier `netlify/edge-functions/launch-gate/` (et, côté serveur, le verrou équivalent de `licensing/src/app.js`). Pas encore fait (À VÉRIFIER : décision de Sofiene).
- Une redirection ajoutée ici n'agit qu'après fusion dans la branche du contexte voulu (staging ou prod).
