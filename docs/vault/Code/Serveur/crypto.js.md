---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/crypto.js
lignes: 56
maj: 2026-11-10
---
# crypto.js

Boîte à outils cryptographique du serveur : mots de passe en scrypt, identifiants aléatoires, signature des cookies, clés de licence `RAGO-…`. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Licence dans l'app]], [[Connexion Google et Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Toutes les opérations sensibles du serveur passent par ce fichier : hachage des mots de passe ([[licensing.js]]), hachage des jetons de session et des liens ([[licensing.js]], [[app.js]]), signature HMAC des cookies ([[app.js]], [[admin.js (serveur)]]), génération des clés de licence. Il n'utilise que `node:crypto`.

## Ce que le fichier expose

| Nom | Ce que ça fait |
|---|---|
| `randomToken(bytes = 32)` | `bytes` octets aléatoires en base64url (43 caractères pour 32 octets). Sert aux jetons de session, aux liens de mot de passe et de rattachement. |
| `sha256(s)` | SHA-256 en hexadécimal minuscule. Les jetons sont stockés hachés avec cette fonction. |
| `newId(prefix)` | `<prefix>_` + 12 octets aléatoires en base64url (16 caractères). Préfixes utilisés : `usr` (compte), `lic` (licence), `dev` (PC lié), `sgn` (inscription en attente), `ref` (parrainage), `drw` (récompense Discord). |
| `safeEqual(a, b)` | Comparaison à temps constant (`timingSafeEqual`), fausse si les longueurs diffèrent. |
| `hashPassword(password)` | Hache en scrypt. Format stocké : `scrypt$N$r$p$<sel base64url>$<hash base64url>`. |
| `verifyPassword(password, stored)` | Relit les paramètres dans la chaîne stockée et compare à temps constant. Faux si le préfixe n'est pas `scrypt`. |
| `DUMMY_HASH` | Hash calculé au chargement du module sur un mot de passe aléatoire. |
| `signValue(value, secret)` | `valeur.HMAC-SHA256(secret, valeur)` en base64url. |
| `unsignValue(signed, secret)` | Renvoie la valeur si la signature est bonne, sinon `null`. Coupe au **dernier** point. |
| `newLicenseKey()` | `RAGO-XXXXX-XXXXX-XXXXX-XXXXX`. |
| `maskLicenseKey(key)` | `RAGO-XXXXX-•••••-•••••-XXXXX` (10 premiers caractères, 5 derniers). |

## Fonctionnement détaillé

- **scrypt** : `N = 2^15` (32 768), `r = 8`, `p = 1`, `maxmem` 64 Mo, sel de 16 octets, clé de 32 octets. Le mot de passe est normalisé en **NFKC** avant hachage (un même mot de passe tapé avec des caractères Unicode équivalents donne le même hash).
- **`DUMMY_HASH`** : quand l'e-mail est inconnu, [[app.js]] compare quand même le mot de passe à ce hash. La réponse prend alors le même temps qu'avec un compte existant : on ne peut pas deviner quels e-mails ont un compte.
- **Clé de licence** : 20 octets aléatoires, chacun réduit à 5 bits (`& 31`) et traduit dans l'alphabet de Crockford `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (sans I, L, O, U). 20 caractères × 5 bits = **100 bits** d'entropie, en 4 groupes de 5.
- **Cookies signés** : la valeur n'est pas chiffrée, seulement signée. Ne jamais y mettre de donnée secrète.

## Données touchées

Aucune : fonctions pures. Les mots de passe hachés vont dans `users.password_hash` ([[Table users]]) et `signup_codes.password_hash` ([[Table signup_codes]]).

## Liens avec le reste

- Appelé par [[licensing.js]] (mots de passe, sessions, liens, clés de licence), [[app.js]] (cookies, `DUMMY_HASH`, identifiants), [[admin.js (serveur)]] (cookie `rago_admin`), [[affiliates.js]], [[network.js]], [[discord.js]], [[profile.js]].
- Le secret des cookies est `SESSION_SECRET` (voir [[Clés et secrets]] et [[config.js]]).

## À savoir avant de modifier

- Changer les paramètres scrypt est sans risque pour les comptes existants : chaque hash garde ses propres `N`, `r`, `p`. En revanche, retirer le préfixe `scrypt$` casserait `hasPassword` de [[licensing.js]], qui s'en sert pour savoir si un compte Google/Discord a un mot de passe (valeur `none` sinon).
- Changer `SESSION_SECRET` invalide tous les cookies signés (sessions en cours d'achat, inscription, OAuth).
