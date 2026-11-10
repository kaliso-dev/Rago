---
type: code
tags: [code, app, rust, réseau, minecraft, ping]
fichier: app/src-tauri/src/mcping.rs
lignes: 165
maj: 2026-11-10
---
# mcping.rs

**Ping d'un serveur Minecraft** comme le mesure la liste des serveurs du jeu (protocole « Server List Ping » : poignée de main, demande d'état, puis ping/pong). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Barre en jeu]] et [[Test réseau]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- La réponse vient du serveur lui-même (le proxy BungeeCord de Hypixel), pas du relais réseau devant lui : Hypixel est derrière Cloudflare, un ping ICMP ou l'ouverture d'une connexion TCP ne mesure que l'aller-retour jusqu'au Cloudflare le plus proche (quelques ms).
- Appelé par [[gameping.rs]] (barre en jeu, toutes les 3 s pendant une partie de Minecraft Java) et par [[nettest.rs]] (cibles `hypixel` et `minemen` du test réseau, méthode `Mc`).
- Équivalent en Python côté serveurs : [[mcping.py]] (et `ping_minecraft` de [[rago-route.py]]).

## Ce que le fichier expose

- `KNOWN_HOSTS = ["mc.hypixel.net", "eu.minemen.club", "na.minemen.club", "as.minemen.club"]` : leur nom est envoyé dans la poignée de main quand le jeu est connecté à leur adresse (certains réseaux ne répondent qu'à leur propre nom).
- `hello(host, port) -> Vec<u8>` : poignée de main + demande d'état, en un seul envoi.
- `ping(addr, host, timeout) -> Option<f64>` : aller-retour du ping/pong en ms, ou `None` si le serveur ne répond pas comme un serveur Minecraft.
- `host_for(ip) -> String` : nom d'un serveur connu dont l'une des adresses (résolution DNS de `<nom>:25565`) est `ip`, sinon l'adresse elle-même.

## Fonctionnement détaillé

1. Connexion TCP avec délai `timeout` (même délai pour la lecture et l'écriture), `TCP_NODELAY`.
2. Envoi de `hello` : paquet `0x00` (protocole **47**, celui de la 1.8, accepté pour l'état par tous les serveurs ; nom ; port ; état suivant **1**) puis paquet `0x00` vide (demande d'état).
3. Lecture de la réponse d'état (paquet `0x00`, au plus **1 Mio** : description et icône du serveur), jetée.
4. Envoi du ping `0x01` avec la charge `0x5241474F` sur 8 octets (« RAGO »), chronomètre lancé.
5. Lecture du pong : identifiant `0x01` et même charge → durée en ms ; sinon `None`.
Les VarInt sont codés sur 7 bits par octet (5 octets au plus en lecture).

## Données touchées

Réseau : une connexion TCP par mesure vers le serveur Minecraft (et une résolution DNS des serveurs connus dans `host_for`).

## Liens avec le reste

- Appelé par [[gameping.rs]] et [[nettest.rs]].
- Même protocole que [[mcping.py]] (installation des serveurs Rago Route).

## Tests

- `varints_match_the_protocol` : codage des VarInt (0, 1, 127, 128, 25565) et forme exacte de `hello("mc.hypixel.net", 25565)`.
- `measures_the_ping_pong` : faux serveur local qui répond 30 ms plus tard → mesure entre 25 et 1 000 ms.
- `not_a_minecraft_server` : un serveur HTTP → `None` ; `host_for(127.0.0.1)` → l'adresse.

## À savoir avant de modifier

- Garder la version de protocole 47 : c'est celle que tous les serveurs acceptent pour l'état.
- `host_for` fait des résolutions DNS : l'appeler hors du fil de l'interface (c'est le cas dans [[gameping.rs]], qui garde le nom trouvé).
