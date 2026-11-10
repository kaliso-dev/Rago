---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/tokens.js
lignes: 39
maj: 2026-11-10
---
# tokens.js

Petit module qui fabrique et vérifie les jetons JWT signés en Ed25519 (`alg: EdDSA`) : jeton de licence, jeton d'accès et jeton Rago Route. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Licence dans l'app]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Le serveur signe tous ses jetons avec **une seule clé privée Ed25519** (`LICENSE_SIGNING_KEY`, ou la clé générée en base par [[db.js]] au premier démarrage). La clé publique correspondante est **compilée dans l'app Windows** : l'app vérifie le jeton de licence hors ligne, sans jamais appeler le serveur. La sortie Rago Route vérifie aussi les jetons `route` avec cette clé publique (voir [[Infrastructure Rago Route]]). Ce fichier n'a aucune dépendance en dehors de `node:crypto`.

## Ce que le fichier expose

| Nom | Paramètres | Retour | Rôle |
|---|---|---|---|
| `loadKeys(privatePem)` | PEM PKCS#8 de la clé privée | `{privateKey, publicKey, publicPem, kid}` | Charge la clé, en déduit la clé publique (PEM `spki`) et calcule le `kid`. |
| `signToken(payload, keys)` | objet JSON, clés de `loadKeys` | chaîne `tête.corps.signature` | Signe un JWT compact. |
| `verifyToken(token, keys, {typ, allowExpired, now})` | jeton, clés, options | le contenu (`payload`) ou `null` | Vérifie un jeton. |

## Fonctionnement détaillé

- **`kid`** : SHA-256 du PEM public (`spki`), encodé en base64url, coupé à **16 caractères**. Il change seulement si la clé change. L'app peut ainsi voir quelle clé a signé.
- **En-tête** toujours `{"alg":"EdDSA","typ":"JWT","kid":"<kid>"}`, encodé en base64url (JSON). Le corps est le `payload` en JSON base64url. La signature Ed25519 porte sur la chaîne `tête.corps` (`crypto.sign(null, …)`), encodée en base64url.
- **`verifyToken`**, dans l'ordre :
  1. le jeton doit être une chaîne en 3 parties ;
  2. en-tête et corps doivent se décoder en JSON (sinon `null`) ;
  3. `header.alg` doit valoir `EdDSA` (aucun autre algorithme accepté : pas d'attaque `alg: none`) ;
  4. signature vérifiée avec la clé publique ;
  5. si `typ` est demandé, `payload.typ` doit être identique (`license`, `access` ou `route`) ;
  6. sauf `allowExpired: true`, `payload.exp * 1000` doit être **strictement** supérieur à `now` (`exp` est en secondes).
- Aucun contrôle de `iat`, `iss` ou `nbf` ici : c'est [[app.js]] qui lit `lic`, `did`, `tv` et décide.

## Types de jetons signés avec ce module

| `typ` | Fabriqué par | Durée | Contenu |
|---|---|---|---|
| `license` | `tokenReply` dans [[app.js]] | `tokenExp` : 30 j au plus (`LICENSE_TOKEN_DAYS`), moins pour un abonnement ou une récompense | `iss`, `sub`, `email`, `plan:'premium'`, `lic`, `did`, `tv`, `fp`, `iat`, `exp` |
| `access` | `appSignIn` dans [[app.js]] | 900 s (15 min) | permet seulement `POST /licenses/activate` |
| `route` | `POST /api/v1/route/token` dans [[app.js]] | 6 h au plus | `lic`, `iat`, `exp` seulement (aucune donnée personnelle) |

## Liens avec le reste

- Appelé par [[server.js]] (`loadKeys` au démarrage), [[app.js]] (signature et vérification de tous les jetons), et les tests ([[Tests du serveur]]).
- La clé vient de [[db.js]] (`ensureKeys`) ou de [[config.js]] (`signingKeyPem`). Règles sur la clé : [[Clés et secrets]].
- Côté app, la vérification hors ligne est décrite dans [[Licence dans l'app]] et [[API du serveur]].

## Tests

`flow.test.js` vérifie les jetons de licence (refresh, `tv`, appareil libéré), le jeton Rago Route (« checked offline », 6 h, pas de données personnelles) et la clé publique servie en PEM. Voir [[Tests du serveur]].

## À savoir avant de modifier

- **Ne jamais changer la clé de signature** : toutes les apps installées ont la clé publique compilée et refuseraient les nouveaux jetons (règle de Sofiene, [[Clés et secrets]]).
- Changer le format de l'en-tête ou du `kid` casse la vérification côté app (Rust) et côté sortie Rago Route : tout changement passe par une nouvelle version du contrat (`/api/v2`, voir [[API du serveur]]).
