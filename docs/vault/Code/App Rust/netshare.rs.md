---
type: code
tags: [code, app, rust, réseau, test-réseau, données]
fichier: app/src-tauri/src/netshare.rs
lignes: 92
maj: 2026-11-10
---
# netshare.rs

Envoie au serveur de licences les **chiffres de chaque test réseau** (sans la série des essais), pour choisir où placer de futurs serveurs Rago. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Test réseau]] et [[Proxy]] (Linear RAG-50, étape 0).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Appelé à la fin de chaque test réseau de l'app par la commande `net_test` de [[lib.rs]] : `netshare::send(seed, version, results)`, où `seed` est le `MachineGuid` de l'empreinte de licence (ou, à défaut, le nom de l'appareil). Pas appelé par la commande `net_test` du pont ([[bridge.rs]]).
- Envoi **à chaque test, sans le demander au joueur** : choix de Sofiene du 29/10/2026, écrit dans la politique de confidentialité ([[Conformité juridique]]).
- Côté serveur : `POST /api/v1/network/report` ; le serveur en déduit ville, région, pays et fournisseur d'accès, puis oublie l'adresse IP. Vue admin `/admin/reseau` (voir [[API du serveur]] et [[Tableau de bord admin]]). Données en prod depuis le 29/10.

## Ce que le fichier expose

- `device_tag(seed) -> String` : identifiant anonyme du PC = 12 premiers octets (24 caractères hexadécimaux) de `SHA-256("rago-net-v1|<seed>")`. Différent de l'identifiant des mises à jour (`update::device_tag`) et ne révèle rien de l'empreinte de licence.
- `payload(version, results) -> Value` : `{"app": <version>, "results": [{id, method, ping, median, best, worst, jitter, loss, samples, spikes, error}]}` (pas de `series`, pas de `lost`).
- `send(seed, version, results)`.

## Fonctionnement détaillé

1. Pas d'adresse de serveur compilée (`license::API_BASE` absent, exe de développement) → rien.
2. Tous les résultats en erreur `dns` (hors ligne) → rien (personne pour le recevoir, rien à apprendre).
3. Sinon, dans un fil à part : `POST <API_BASE>/network/report` avec l'en-tête `X-Rago-Device: <device_tag>` et le JSON, par l'agent HTTP de `account.rs`. Un échec s'écrit `[netshare] …` dans la console et ne retarde rien.

## Données touchées

Réseau : une requête HTTPS vers le serveur de licences par test. Aucun fichier. Aucune donnée personnelle (ni e-mail, ni licence, ni série des essais).

## Liens avec le reste

- Appelé par [[lib.rs]] après [[nettest.rs]] ; utilise `license.rs` (`API_BASE`) et `account.rs` (`agent`).
- Serveur : [[Serveur de licences]] (`network.js`, `geo.js`).

## Tests

- `sends_the_figures_without_the_series` : forme exacte du JSON envoyé.
- `device_tag_is_its_own` : stable, 24 caractères, différent pour un autre `seed` et de celui des mises à jour.
- `nothing_to_send_offline` : que des erreurs `dns` → rien ; une seule vraie mesure → envoi.

## À savoir avant de modifier

- Ne jamais ajouter au contenu envoyé un identifiant de licence, un e-mail ou la série des essais : la politique de confidentialité décrit exactement ce qui part.
- Garder le préfixe `rago-net-v1|` : le changer casserait le suivi d'un même PC d'un test à l'autre côté serveur.
