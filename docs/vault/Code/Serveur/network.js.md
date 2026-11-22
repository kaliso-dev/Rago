---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/network.js
lignes: 123
maj: 2026-11-10
---
# network.js

Reçoit, vérifie, stocke et résume les tests réseau envoyés par l'app (ping, gigue, pertes vers chaque serveur + ville et fournisseur du joueur). Sert à choisir où des proxys aideraient (RAG-50). Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Test réseau]], [[Infrastructure Rago Route]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Après chaque test réseau, l'app envoie `POST /api/v1/network/report` ([[app.js]]). Le serveur lit la ville, la région, le pays et le fournisseur de l'adresse IP avec [[geo.js]], puis **oublie l'IP** : elle n'est jamais stockée. La page `/admin/reseau` ([[admin.js (serveur)]], [[admin-views.js]]) affiche les résultats par ville et par fournisseur, avec un export CSV. Étape 0 du plan des proxys (voir [[Infrastructure Rago Route]]).

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `KEEP_DAYS` | 365 : durée de conservation. |
| `TARGETS` | `hypixel`, `minemen`, `paris`, `frankfurt`, `london`, `stockholm`, `madrid`, `virginia`, `internet` : les serveurs du test de l'app (`app/src-tauri/src/nettest.rs`, `TARGETS`), dans l'ordre d'affichage de `/admin/reseau`. |
| `parseReport(body, device)` | Vérifie le rapport de l'app et l'en-tête `X-Rago-Device` ; renvoie `{app, device, results}` ou `null`. |
| `saveReport(db, report, place, at)` | Écrit le rapport et ses résultats dans une transaction ; renvoie l'id. |
| `purgeNetworkReports(db, now)` | Supprime les rapports de plus de 365 jours (les résultats suivent par `ON DELETE CASCADE`). |
| `networkSummary(db, {days})` | Ce qu'affiche `/admin/reseau`. |
| `networkCsv(db, {days})` | Export CSV, une ligne par serveur testé. |

## Fonctionnement détaillé

**Entrée attendue** : `{app, results: [{id, method, ping, median, best, worst, jitter, loss, samples, spikes, error}]}`.

`parseReport` :
- au plus **16** résultats lus ; `id` doit correspondre à `^[a-z0-9-]{1,24}$` et ne pas être en double. Un serveur inconnu est **gardé** (une app plus récente peut tester plus de serveurs) ;
- `loss` obligatoire, nombre de 0 à 1 (arrondi au millième), sinon le résultat est ignoré ;
- `method` parmi `mc`, `tcp`, `icmp`, sinon `null` ;
- `ping`, `median`, `best`, `worst`, `jitter` : nombres de 0 à 60 000 ms, arrondis au dixième, sinon `null` ;
- `samples`, `spikes` : entiers de 0 à 10 000, sinon `null` ;
- `error` : mot de 1 à 16 lettres minuscules (`dns`, `timeout`…), sinon `null` ;
- aucun résultat valable → `null` (la route répond `400 invalid_request`) ;
- `app` : version `x.y.z` avec suffixe facultatif, sinon `null` ; `device` : 16 à 64 caractères hexadécimaux (le hash du PC envoyé par l'app), sinon `null`.

**Route** (dans [[app.js]]) : limite `network:<ip>` à **30 par heure**, `geo.ready()` (attend les bases au plus 15 s), `saveReport` avec `geo.lookup(ip)`, réponse **204**.

**Stockage** : l'id du rapport est `randomToken(12)` ([[crypto.js]]). `country` coupé à 2 caractères, `region` et `city` à 80, `isp` à 120, `asn` entier ou `null`.

**Résumé (`networkSummary`, 90 jours par défaut)** :
- totaux : tests, joueurs (PC distincts), villes distinctes, tests localisés, date du dernier ;
- `cities` : groupes (pays, région, ville), **200** au plus ; `isps` : groupes (pays, fournisseur), **100** au plus ; triés par joueurs puis tests ;
- pour chaque groupe et chaque serveur : **médiane** des médianes (`percentile_cont(0.5)`), perte moyenne et nombre de mesures.

**CSV (`networkCsv`, 365 jours, 200 000 lignes au plus)** : colonnes `date, pc, app, country, region, city, asn, isp, server, method, ping_ms, median_ms, best_ms, worst_ms, jitter_ms, loss, samples, spikes, error`. Une cellule qui commence par `=`, `+`, `-`, `@`, tabulation ou retour chariot (et qui n'est pas un nombre) est précédée d'une apostrophe : protection contre les formules dans un tableur.

## Données touchées

[[Table network_reports]] et [[Table network_results]].

## Liens avec le reste

- Appelé par [[app.js]] (route), [[server.js]] (purge horaire), [[admin.js (serveur)]] (`/admin/reseau`, `/admin/reseau.csv`).
- Localisation : [[geo.js]]. Côté app : [[Test réseau]].

## Tests

`network.test.js` : stockage sans IP, vérification de l'entrée, limite par adresse, stockage sans ville quand les bases manquent ou sont coupées, page `/admin/reseau` + CSV + suppression après 12 mois ([[Tests du serveur]]).

## À savoir avant de modifier

- Ne jamais stocker l'adresse IP : c'est une promesse de la politique de confidentialité ([[Conformité juridique]]).
- Garder `TARGETS` aligné sur la liste de l'app : un serveur absent ici est stocké mais pas affiché dans l'ordre voulu.
