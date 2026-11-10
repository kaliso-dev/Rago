---
type: code
tags: [code, app, rust, réseau, test-réseau]
fichier: app/src-tauri/src/nettest.rs
lignes: 248
maj: 2026-11-10
---
# nettest.rs

Le **test réseau** : ping, gigue, pertes et à-coups vers les serveurs où l'on joue et vers des régions de référence, mesurés depuis le PC, sans rien changer au PC. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Test réseau]] (Linear RAG-50, étape 0).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Commande Tauri `net_test(ids)` dans [[lib.rs]] : garde seulement les identifiants connus (16 au plus), mesure **chaque serveur en parallèle** (un fil par serveur), envoie chaque essai à l'interface (`nettest:sample`) puis chaque résultat (`nettest:measure`), garde le dernier test (`LAST_NET_TEST`, lu par le pont), puis envoie les chiffres au serveur par [[netshare.rs]].
- Commande de pont `net_test` ([[bridge.rs]]) : mêmes mesures (6 serveurs au plus, par défaut `hypixel`, `paris`, `internet`), **sans** envoi au serveur.
- Interface : [[NetTest.tsx]] (onglet Test de la page Réseau).
- Le « Diagnostic avancé » de la page Réseau n'est pas ici : il passe par le moteur PowerShell de [[netopt.rs]] ([[common.ps1]], actions `quality`, `loaded`, `mtu`).

## Ce que le fichier expose

- `TARGETS` (9 serveurs ; seuls ceux-là peuvent être mesurés) :

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
- `Method` : `mc` (ping/pong du protocole Minecraft, [[mcping.rs]]), `tcp` (temps d'ouverture d'une connexion, SYN/SYN-ACK), `icmp` (écho, [[icmp.rs]]).
- `Sample { id, i, n, ms }` : un essai (envoyé à l'interface pendant le test, la courbe se dessine en direct).
- `Measure { id, ping, median, best, worst, jitter, loss, lost, samples, spikes, series, method, error }` (sérialisé `camelCase`).
- `summarize(id, rtts, method) -> Measure`, `measure(id, on_sample) -> Measure`.

## Fonctionnement détaillé

1. Identifiant inconnu → `error: "unknown"`. Résolution DNS (IPv4 d'abord) ratée → `error: "dns"`.
2. Méthode : port 25565 → `mc` ; `internet` qui répond à un premier écho → `icmp` ; sinon `tcp`.
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

- Appelé par [[lib.rs]] (`net_test`) et [[bridge.rs]] ; appelle [[mcping.rs]] et [[icmp.rs]] ; résultats envoyés par [[netshare.rs]].
- Fonctionnalités : [[Test réseau]], données des futurs serveurs : [[Proxy]].

## Tests

- `sums_up_a_series` : moyenne, médiane, meilleur, pire, gigue (4,0), pertes (0,2) ; série morte → `timeout`.
- `a_resent_packet_counts_as_lost` : un essai à 1 020 ms au milieu de ~20 ms compte perdu en TCP, pas en ICMP ; 48 ms est un à-coup.
- `only_known_servers` : `example.com` → `unknown`.

## À savoir avant de modifier

- Ajouter une cible ici change aussi ce que le pont accepte et ce qui part au serveur : l'interface ([[NetTest.tsx]]) doit en avoir le nom et la description.
- Ne pas augmenter le nombre d'essais Minecraft : au-delà de 3 connexions en 4 s, les proxys Minecraft refusent.
