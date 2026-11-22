---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/geo.js
lignes: 108
maj: 2026-11-10
---
# geo.js

Trouve la ville, la région, le pays et le fournisseur d'accès d'une adresse IP avec les bases gratuites DB-IP, gardées en mémoire. Utilisé seulement pour les tests réseau. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Test réseau]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté pour RAG-50 (29/10/2026). [[server.js]] crée l'objet avec `createGeo(cfg)` et lance `geo.load()` au démarrage. [[app.js]] l'utilise dans `POST /api/v1/network/report` ([[network.js]]). Les bases sont **IP to City Lite** et **IP to ASN Lite** de DB-IP (licence CC BY 4.0, citée dans la politique de confidentialité). Elles pèsent environ 150 Mo en mémoire. L'adresse est seulement cherchée, jamais stockée.

## Ce que le fichier expose

- `dbipUrl(kind, date)` → `https://download.db-ip.com/free/dbip-<kind>-AAAA-MM.mmdb.gz` (`kind` = `city-lite` ou `asn-lite`).
- `createGeo(cfg, {fetchImpl, log, now})` → objet avec :
  - `load()` : télécharge les deux bases ; renvoie une promesse (vrai si chargées) ;
  - `ready(ms = 15000)` : attend les bases au plus `ms` ;
  - `lookup(ip)` → `{country, region, city, asn, isp}` (`null` pour ce qui est inconnu) ;
  - `state()` → `{on, loaded, month, error}` pour `/admin/reseau` et la page Services.

## Fonctionnement détaillé

- **Réglages** ([[config.js]]) : `GEOIP` = `0`, `off`, `false` ou `no` coupe tout (`cfg.geoip.on` faux). `GEOIP_CITY_URL` / `GEOIP_ASN_URL` remplacent l'adresse DB-IP (un miroir, par exemple).
- **Téléchargement (`open`)** : essaie le fichier du mois en cours, puis celui du mois précédent (le fichier du mois sort le 1er ou un peu après). Le corps est décompressé s'il commence par les octets gzip `1f 8b`, puis lu par `mmdb-lib` (`Reader`). Échec des deux → erreur avec la dernière adresse et son statut HTTP.
- **`load`** : une seule exécution à la fois (`loading`). Les anciennes bases restent utilisées jusqu'à ce que les nouvelles soient lues. Succès : log `[geo] bases DB-IP chargées (AAAA-MM)`. Échec : log `[geo] bases DB-IP introuvables, tests réseau gardés sans ville : …` et `error` rempli.
- **`ready`** :
  - bases présentes : si le mois a changé, rechargement **en arrière-plan**, au plus une fois par heure ; réponse immédiate ;
  - bases absentes : nouvel essai au plus une fois par heure, puis attente du chargement au plus 15 s.
  - Le rechargement mensuel n'a donc pas de minuteur : il est **déclenché par le premier rapport réseau** du mois.
- **`lookup`** : retire le préfixe `::ffff:` des IPv4 écrites en IPv6 ; `country` = code ISO (`FR`), `region` = première subdivision, `city` = nom anglais ou le premier nom disponible ; `asn` et `isp` viennent de la base ASN (`autonomous_system_number`, `autonomous_system_organization`). Une adresse invalide donne des `null`.

## Données touchées

Réseau (`download.db-ip.com`) et mémoire du processus. Aucune table.

## Erreurs et cas limites

- Sans bases (DB-IP injoignable, `GEOIP=off`), les rapports sont **quand même** gardés, sans ville ni fournisseur.
- Si [[app.js]] lit mal l'IP du joueur (`TRUST_PROXY` absent derrière Railway), toutes les localisations seront celles du proxy de Railway.

## Liens avec le reste

Créé par [[server.js]], utilisé par [[app.js]] et [[network.js]], affiché par [[admin.js (serveur)]] (contrôle « villes DB-IP » de la page Services). Contexte : [[Test réseau]], [[Infrastructure Rago Route]].

## Tests

`network.test.js` fabrique de petites bases au format MaxMind avec `test/mmdb.js` et simule db-ip.com (fichiers gzip ou 404) ([[Tests du serveur]]).

## À savoir avant de modifier

- La mention CC BY 4.0 de DB-IP dans la politique de confidentialité est obligatoire tant que ces bases sont utilisées ([[Conformité juridique]]).
- ~150 Mo de mémoire : en tenir compte dans l'offre Railway ([[Railway]]).
