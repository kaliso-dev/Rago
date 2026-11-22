---
type: code
tags: [code, site, netlify, edge, javascript]
fichier: netlify/edge-functions/launch-gate/launch-gate.js
lignes: 132
maj: 2026-11-10
---
# launch-gate.js (avec countdown.js et launch-gate.test.mjs)

La fonction edge Netlify qui remplaçait tout le site par un compte à rebours avant le lancement du 10/10/2026, sauf pour l'équipe munie d'un lien d'accès ; depuis le lancement elle laisse tout passer. Cette note couvre aussi `netlify/edge-functions/launch-gate/countdown.js` (123 lignes, la page du compte à rebours) et `netlify/launch-gate.test.mjs` (131 lignes, les tests). Fiche parente : [[Code du site]]. Fonctionnalité : [[Netlify]], [[Site]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créée le 08/10 (PR #2, compte à rebours), assouplie le 08/10 (PR #3 : lien d'accès plus tolérant, raison d'un refus dans les journaux), puis le 09/10 (PR #12 et #13 : aperçu des liens partagés avant le lancement). Aucune modification depuis.

## Rôle et place dans l'ensemble
- Déclarée dans [[netlify.toml]] sur `/*` : elle s'exécute devant chaque requête du site, dans tous les contextes.
- **État actuel : inactive.** Comme `Date.now() >= LAUNCH_AT` depuis le 10/10/2026 à 13:00 UTC, la première vérification renvoie tout de suite `context.next()` (le site normal). Le commentaire de [[netlify.toml]] dit qu'on « pourra la retirer ». Elle coûte encore une invocation edge par requête.
- Le serveur de comptes appliquait le même verrou avec le même cookie (`previewPass()` dans `licensing/src/app.js`, voir [[Serveur de licences]]).

## Ce que les fichiers exposent
### `launch-gate.js`
| Export ou constante | Valeur / rôle |
|---|---|
| `DEFAULT_LAUNCH` (export) | `"2026-10-10T13:00:00Z"` = samedi 10 octobre 2026, 15 h à Paris |
| `COOKIE` (export) | `"rago_preview"` |
| `COOKIE_MAX_AGE` | 30 jours |
| `MIN_KEY_LENGTH` | 16 : une `PREVIEW_KEY` plus courte est ignorée (personne n'entre) |
| `DOMAIN`, `OLD_HOST` | `rago-optimizer.com`, `rago-optimiser.netlify.app` |
| `PUBLIC_FILES` | fichiers servis même avant le lancement : `/favicon.svg`, `/favicon.ico`, `/favicon-32.png`, `/apple-touch-icon.png`, `/rago-wordmark.svg`, `/robots.txt`, `/og-image.png`, `/og-launch.png`, les deux polices de `/fonts/` |
| `launchTime()` (export) | `LAUNCH_AT` (variable Netlify) ou `DEFAULT_LAUNCH` ; une date illisible retombe sur la valeur par défaut |
| `passFor(key)` (export) | valeur du cookie : `base64url(HMAC-SHA256(PREVIEW_KEY, "rago-preview-v1"))`, identique à `previewPass()` du serveur |
| `default launchGate(request, context)` | le gestionnaire Netlify |

Fonctions internes : `env(name)` (lit `Netlify.env` ou `Deno.env`), `sameString` (comparaison à temps constant), `sha256`, `readCookie`, `passCookie(host, value, maxAge)` (`HttpOnly; Secure; SameSite=Lax`, avec `Domain=rago-optimizer.com` sur le domaine pour couvrir aussi `account.rago-optimizer.com`), `redirect`, `shareTags(context)`.

### `countdown.js`
`countdownPage({ launchAt, now, origin, share })` : renvoie une page HTML autonome : titre « Rago Optimizer opens <jour> », `noindex`, date formatée en anglais dans le fuseau `Europe/Paris`, quatre cases Days / Hours / Minutes / Seconds, ligne « That's … where you are. » si le fuseau du visiteur n'est pas Paris, horloge corrigée du décalage entre serveur et navigateur, et **rechargement automatique** 1 à 3 s après zéro (« Opening now… »). Si `share` est vide, elle met ses propres balises de partage avec l'image `og-launch.png`.

## Fonctionnement détaillé (`launchGate`)
1. Hôte `rago-optimiser.netlify.app` → 301 vers `https://rago-optimizer.com<chemin><requête>` (même règle que [[netlify.toml]]).
2. Si l'heure de lancement est passée **ou** si le chemin est dans `PUBLIC_FILES` → `context.next()`. (Aujourd'hui, on s'arrête toujours ici.)
3. Sinon, `PREVIEW_KEY` (variable Netlify) est utilisable si elle fait au moins 16 caractères.
4. Chemin `/acces/<x>` ou `/accès/<x>` (barre finale tolérée, chemin décodé) :
   - `x = "sortir"` → cookie effacé, redirection 302 vers `/` ;
   - `x` = la clé (comparaison à temps constant des SHA-256) → cookie `rago_preview` de 30 jours, 302 vers `/` ;
   - sinon, ligne de journal Netlify sans la clé : clé absente (« add it with the Functions scope, then redeploy »), trop courte, ou mauvaise (longueurs données / attendues).
5. Cookie `rago_preview` valide → `context.next()`.
6. Sinon : page du compte à rebours (200, `no-store`, `X-Robots-Tag: noindex`, `Content-Security-Policy` stricte, en-têtes de sécurité). Pour une requête `GET`, la fonction lit le début de la vraie page jusqu'à `</head>` et n'en garde **que** les balises `og:` et `twitter:` : un lien partagé avant le lancement montrait donc déjà l'aperçu du site. Une requête `HEAD` reçoit un corps vide.

## Tests (`netlify/launch-gate.test.mjs`)
Commande : `node --test netlify/launch-gate.test.mjs` (la fonction n'utilise que des API web, Node la fait tourner comme le Deno de Netlify). Huit tests : compte à rebours partout avant le lancement ; balises de partage du site seulement ; image `og-launch.png` en secours ; date par défaut ; lien d'équipe qui pose le cookie et `/acces/sortir` qui le retire ; pas de clé ou clé trop courte = personne n'entre ; après le lancement le site pour tous, sans `noindex` ; ancienne adresse redirigée.

Exécution du 10/11 : **7 réussis, 1 échoué** : « the default launch is Saturday, October 10, 2026, 3:00 PM Paris time ». Ce test appelle la fonction sans fixer `LAUNCH_AT` et attend la page du compte à rebours ; comme la date par défaut est passée, il reçoit le vrai site. Le test dépend de l'heure ; il n'est lancé par **aucune** CI ([[Code de la CI et du dépôt]]).

## Données touchées
- Variables Netlify : `PREVIEW_KEY`, `LAUNCH_AT` (noms seulement ; inutiles depuis le lancement).
- Cookie `rago_preview` (domaine `rago-optimizer.com`), cité dans la politique de confidentialité ([[make_legal.py]]).
- Journaux Netlify (Edge Functions) en cas de refus.

## Liens avec le reste
- Déclarée par [[netlify.toml]] ; même secret et même cookie que le serveur ([[Serveur de licences]], [[Clés et secrets]] pour la règle sur les secrets).
- Images de partage : [[export-logo.js]] (génère `og-image.png` et `og-launch.png`).
- Contexte du lancement du 10/10 : [[Historique des versions]].

## À savoir avant de modifier
- Plus rien à modifier tant qu'elle reste : elle est inerte. Pour la retirer (décision à prendre, À VÉRIFIER) : supprimer le bloc `[[edge_functions]]` de [[netlify.toml]], le dossier `netlify/edge-functions/launch-gate/`, `netlify/launch-gate.test.mjs`, et côté serveur le verrou `rago_preview` / `previewPass`, puis retirer `rago_preview` de la politique de confidentialité et les variables `PREVIEW_KEY` / `LAUNCH_AT` de Netlify et Railway.
- Si on la garde, corriger le test daté (fixer `LAUNCH_AT` dans le futur pour ce test).
