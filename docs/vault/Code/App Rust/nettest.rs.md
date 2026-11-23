---
type: code
tags: [code, app, rust, réseau, test-réseau]
fichier: app/src-tauri/src/nettest.rs
lignes: 308
maj: 2026-11-23
---
# nettest.rs

Le **test réseau** : ping, gigue, pertes et à-coups vers les serveurs où l'on joue et vers des régions de référence, mesurés depuis le PC, sans rien changer au PC. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Test réseau]] (Linear RAG-50, étape 0).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11), avec le serveur du joueur ajouté par la PR #123 du 23/11 (jamais testé sur Windows).

## Rôle et place dans l'ensemble

- Commande Tauri `net_test(ids)` dans [[lib.rs]] : garde les identifiants connus et au plus un serveur du joueur (16 au plus), mesure **chaque serveur en parallèle** (un fil par serveur), envoie chaque essai à l'interface (`nettest:sample`) puis chaque résultat (`nettest:measure`), puis envoie les chiffres des serveurs connus au serveur Rago par [[netshare.rs]] (jamais le serveur du joueur).
- Interface : [[NetTest.tsx]] (onglet Test de la page Réseau).
- Les outils stabilité, bufferbloat et MTU (rangée « tools » du Packet Optimizer, [[NetOpt.tsx]]) ne sont pas ici : ils passent par le moteur PowerShell de [[netopt.rs]] ([[common.ps1]], actions `quality`, `loaded`, `mtu`).

## Ce que le fichier expose

- `TARGETS` (9 serveurs connus ; avec le serveur du joueur, ce sont les seuls qui peuvent être mesurés) :

| Id | Hôte | Port | Méthode |
|---|---|---|---|
| `hypixel` | `mc.hypixel.net` | 25565 | `mc` |
| `minemen` | `eu.minemen.club` | 25565 | `mc` |
| `paris` | `dynamodb.eu-west-3.amazonaws.com` | 443 | `tcp` |
| `frankfurt` | `dynamodb.eu-central-1.amazonaws.com` | 443 | `tcp` |
| `london` | `dynamodb.eu-west-2.amazonaws.com` | 443 | `tcp` |
| `stockholm` | `dynamodb.eu-north-1.amazonaws.com` | 443 | `tcp` |
| `madrid` | `dynamodb.eu-south-2.amazonaws.com` | 443 | `tcp` |
| `virginia` | `dynamodb.us-east-1.amazonaws.com` | 443 | `tcp` |
| `internet` | `one.one.one.one` | 443 | `icmp` si l'écho répond, sinon `tcp` |

Les régions sont mesurées sur des serveurs Amazon (DynamoDB), qui ne répondent pas à l'écho mais tous sur leur port.
- `CUSTOM` = `"host:"` et `custom(id) -> Option<(hôte, port)>` (23/11) : le **serveur du joueur**, tapé dans le test réseau (« host:play.monserveur.fr », « host:1.1.1.1 », « host:mc.serveur.fr:25566 »). Accepté seulement si l'adresse passe `netopt::valid_target` (lettres, chiffres, point, tiret, deux-points), contient un point, ne commence ni par un point ni par un tiret, ne finit pas par un point, et si le port éventuel va de 1 à 65535. L'hôte est mis en minuscules.
- `Method` : `mc` (ping/pong du protocole Minecraft, [[mcping.rs]]), `tcp` (temps d'ouverture d'une connexion, SYN/SYN-ACK), `icmp` (écho, [[icmp.rs]]).
- `Sample { id, i, n, ms }` : un essai (envoyé à l'interface pendant le test, la courbe se dessine en direct).
- `Measure { id, ping, median, best, worst, jitter, loss, lost, samples, spikes, series, method, error }` (sérialisé `camelCase`).
- `summarize(id, rtts, method) -> Measure`, `measure(id, on_sample) -> Measure`.

## Fonctionnement détaillé

1. Identifiant inconnu → `error: "unknown"`. Résolution DNS (IPv4 d'abord) ratée → `error: "dns"`.
2. Méthode, serveur connu : port 25565 → `mc` ; `internet` qui répond à un premier écho → `icmp` ; sinon `tcp`.
   Méthode, serveur du joueur (port 443 par défaut pour la résolution) :
   - avec un port : `mc` s'il répond au ping de Minecraft sur ce port, sinon `tcp` sur ce port ;
   - nom sans port : d'abord le ping de Minecraft sur 25565 (souvent un serveur de jeu ; derrière Cloudflare, l'écho ne mesurerait que le trajet jusqu'à Cloudflare), puis l'écho (`icmp`), sinon `tcp` sur 443 ;
   - adresse IP sans port : d'abord l'écho, puis le ping de Minecraft sur 25565, sinon `tcp` ;
   - si c'est `mc`, une pause de 1,4 s suit le ping qui a servi à choisir (il compte comme une connexion pour les proxys Minecraft).
3. Essais : **40 essais espacés de 250 ms** (10 s), délai 1,5 s chacun ; pour Minecraft **8 essais espacés de 1,4 s**, délai 3 s, parce que les proxys Minecraft (BungeeCord, Velocity) refusent plus de 3 connexions en 4 s d'une même adresse, et un refus se lirait comme une perte.
4. En `tcp`, un refus net (port fermé) compte comme une réponse (le serveur a répondu).
5. `summarize` :
   - En `tcp` et `mc`, un essai **≥ 2 × la médiane et ≥ médiane + 200 ms** est compté comme **perdu** : c'est un paquet renvoyé par Windows après son délai, pas une vraie mesure.
   - `ping` = moyenne des essais réussis ; `median`, `best`, `worst` ; `jitter` = écart moyen entre deux essais successifs ; `loss` = perdus / essais (au millième) ; `spikes` = essais au-dessus de `médiane + max(50 % de la médiane, 15 ms)` ; tout arrondi au dixième.
   - Aucun essai réussi → `error: "timeout"`.

## Données touchées

- Réseau : connexions TCP, pings Minecraft, échos ICMP vers les 9 serveurs.
- Événements émis par [[lib.rs]] : `nettest:sample`, `nettest:measure`.
- Rien sur le disque.

## Liens avec le reste

- Appelé par [[lib.rs]] (`net_test`) ; appelle [[mcping.rs]] et [[icmp.rs]] ; résultats envoyés par [[netshare.rs]].
- Fonctionnalités : [[Test réseau]], données des futurs serveurs : [[Proxy]].

## Tests

- `sums_up_a_series` : moyenne, médiane, meilleur, pire, gigue (4,0), pertes (0,2) ; série morte → `timeout`.
- `a_resent_packet_counts_as_lost` : un essai à 1 020 ms au milieu de ~20 ms compte perdu en TCP, pas en ICMP ; 48 ms est un à-coup.
- `only_known_servers` : `example.com` → `unknown`.
- `a_server_of_the_player` (23/11) : `host:Play.MonServeur.fr`, `host:1.1.1.1` et `host:mc.serveur.fr:25566` acceptés ; refusés : sans préfixe, vide, `localhost` (pas de point), espace, `;`, tiret ou point en tête, port 0, 70000, vide ou double, lettre accentuée.

## À savoir avant de modifier

- Le serveur du joueur ne doit jamais partir au serveur Rago (filtre dans `net_test` de [[lib.rs]]).
- Ajouter une cible ici change aussi ce qui part au serveur : l'interface ([[NetTest.tsx]]) doit en avoir le nom et la description.
- Ne pas augmenter le nombre d'essais Minecraft : au-delà de 3 connexions en 4 s, les proxys Minecraft refusent.
