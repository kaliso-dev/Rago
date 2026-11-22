---
type: code
tags: [code, app, rust, réseau, ping]
fichier: app/src-tauri/src/icmp.rs
lignes: 150
maj: 2026-11-10
---
# icmp.rs

Le **ping ICMP de Windows** (écho, comme la commande `ping`), sans droits particuliers, et la recherche du **dernier routeur** qui répond sur le chemin d'un serveur. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Barre en jeu]] et [[Test réseau]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Utilisé par [[gameping.rs]] (ping des jeux qui parlent à leur serveur en UDP), par [[nettest.rs]] (cible « internet », `1.1.1.1` : écho si possible) et par [[flows.rs]] (`public`).
- Beaucoup de serveurs de jeu ne répondent pas à l'écho : `last_hop` cherche alors, comme `tracert`, le dernier routeur qui répond (celui du centre de données, à une ou deux ms du serveur).

## Ce que le fichier expose

- `Reply` : `Echo(ms)` (le serveur a répondu), `Hop(ip, ms)` (un routeur du chemin a répondu, durée de vie épuisée chez lui), `Lost`.
- `public(ip) -> bool` : adresse joignable sur Internet. Faux pour : privée, bouclage, lien local, multidiffusion, diffusion, non spécifiée, documentation, réseau partagé des opérateurs (CGNAT `100.64.0.0/10`) et `240.0.0.0` et au-delà.
- `Pinger` : `new() -> Option<Pinger>` (`IcmpCreateFile`), `send(ip, ttl, timeout) -> Reply` (`IcmpSendEcho`), fermé par `IcmpCloseHandle` à la destruction. Utilisable depuis n'importe quel fil (`Send`).
- `last_hop(pinger, ip) -> Option<Ipv4Addr>`.

## Fonctionnement détaillé

- `send` : charge utile de 32 octets `0x52` (« R »), tampon de réponse de 512 octets, délai borné entre 1 et 5 000 ms, durée de vie (`TTL`) donnée ou celle de Windows (128 dans la structure, utilisée seulement si un TTL est demandé). La réponse est lue **même quand l'appel renvoie 0** : selon la version de Windows, une durée de vie épuisée passe par là. `IP_SUCCESS` venant de l'adresse visée → `Echo` ; `IP_TTL_EXPIRED_TRANSIT` → `Hop` ; le reste → `Lost`.
- `last_hop` : TTL de 1 à 30, délai 700 ms chacun. Un `Echo` → le serveur lui-même. Chaque `Hop` public devient le dernier connu. Après **4 pertes d'affilée** avec déjà un routeur connu, arrêt (le reste du chemin filtre l'écho). Dernier essai sans TTL limité (900 ms) : si le serveur répond, c'est lui. Sinon, le dernier routeur public, ou `None` (rien ne répond au-delà de la maison et de l'opérateur).

## Données touchées

Réseau : échos ICMP. Aucun fichier.

## Erreurs et cas limites

- Hors Windows : `Pinger::new()` rend `None`, `send` rend `Lost` (seul `public` est testable).
- `last_hop` peut prendre jusqu'à environ 30 × 0,7 s ; [[gameping.rs]] l'appelle une seule fois par serveur, dans un fil à part.

## Liens avec le reste

- Appelé par [[gameping.rs]], [[nettest.rs]], [[flows.rs]].

## Tests

- `only_internet_addresses` : `1.1.1.1` et une adresse publique acceptées ; `192.168.1.1`, `10.0.0.1`, `100.72.3.1` (CGNAT), `127.0.0.1`, `239.255.255.250`, `255.255.255.255` refusées.
