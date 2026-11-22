---
type: code
tags: [code, app, rust, barre-en-jeu, réseau, etw]
fichier: app/src-tauri/src/flows.rs
lignes: 382
maj: 2026-11-10
---
# flows.rs

Trouve **avec quel serveur le jeu échange ses paquets**, en lisant le journal réseau du noyau Windows (ETW `Microsoft-Windows-Kernel-Network`) : c'est ainsi que la barre en jeu connaît le serveur d'une partie en UDP (PUBG, Valorant, CS2, Fortnite). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Barre en jeu]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Windows ne garde pas l'adresse d'en face d'un socket UDP : seul le journal d'événements du noyau la donne, paquet par paquet, avec le processus.
- Appelé par [[gameping.rs]] (`flows::server(pid)`) quand la barre ou la pastille suit un jeu qui n'est pas Minecraft. `flows::shutdown()` est appelé à la fermeture de l'app ([[lib.rs]]) : la session du noyau ne doit pas lui survivre.
- **Rien n'est envoyé ni modifié** : on compte seulement les paquets reçus par adresse.

## Ce que le fichier expose

- `Proto` (`Tcp`, `Udp`), `Peer { proto, ip, port, rx }`.
- `Flows` : `follow(pid)`, `record(pid, proto, ip, port, received, at)`, `top(at) -> Option<Peer>`.
- `parse(data) -> Option<(pid, ip, port)>` : lit les 20 premiers octets d'un événement TCP/UDP IPv4 du noyau (PID en petit-boutiste aux octets 0–3, adresse d'en face aux octets 8–11, port d'en face aux octets 16–17 en ordre réseau).
- `kind(event_id) -> Option<(Proto, reçu)>` : `10` TCP envoyé, `11` TCP reçu, `42` UDP envoyé, `43` UDP reçu.
- `Seen` : `Off` (journal illisible : pas les droits, Windows trop ancien), `Nothing` (pas de partie en cours), `Server(Peer)`.
- `server(pid) -> Seen`, `shutdown()`.

## Fonctionnement détaillé

### Comptage (`Flows`)

- Seuls les paquets **reçus** du processus suivi comptent (`record`).
- Fenêtre de deux tranches de **2 s** (`SLICE`) : à chaque nouvelle tranche, le compte courant devient le précédent ; au-delà de deux tranches sans paquet, tout est remis à zéro.
- `top` : l'adresse **publique** ([[icmp.rs]] `public`) qui a envoyé le plus de paquets sur les ~4 dernières secondes, hors ports qui ne sont jamais un serveur de jeu (`NOT_GAME` : `53`, `67`, `68`, `80`, `123`, `137`, `138`, `443`, `1900`, `3702`, `5353`, `5355`, `8080` : DNS, DHCP, NTP, web et QUIC, découverte du réseau local) et avec au moins **12 paquets** (`MIN_RX` ; en dessous : menu, salon, chat vocal muet). À égalité, l'UDP passe devant (c'est lui qui porte la partie).
- `follow(pid)` sur un autre processus remet les comptes à zéro.

### Session ETW (Windows)

- Session temps réel nommée **`Rago-GamePing`**, fournisseur `Microsoft-Windows-Kernel-Network` (GUID `7dd42a49-5329-4832-8dfd-43d979153a88`), niveau information, tous les mots-clés, horloge QPC, tampons de 64 Ko, vidage toutes les secondes.
- Démarrée au premier `follow` ; si une session du même nom existe déjà (erreur `183`, app fermée de force), elle est arrêtée puis recréée. Un fil `rago-flows` traite les événements (`ProcessTrace`) jusqu'à l'arrêt de la session.
- Le rappel `on_event` lit le PID suivi sans verrou (`AtomicU32`) pour chaque paquet de la machine, et ne prend le verrou que pour le processus suivi.
- Un fil `rago-flows-idle` vérifie toutes les **5 s** ; si personne n'a demandé depuis **30 s** (`IDLE`), la session s'arrête.
- Un échec au démarrage (`[flows] StartTrace <code>` ou `EnableTrace <code>`) n'est pas réessayé à chaque tour : `server` rend alors `Off`.

## Données touchées

- Une session ETW du noyau (`Rago-GamePing`), en mémoire seulement. Aucun fichier, aucun envoi réseau.

## Erreurs et cas limites

- Sans droits administrateur ou sur un Windows trop ancien : `Off`, et [[gameping.rs]] revient à la connexion TCP du jeu.
- Hors Windows : `server` rend toujours `Off` (seul le décompte est testé).

## Liens avec le reste

- Appelé par [[gameping.rs]] ; utilise [[icmp.rs]] (`public`) ; arrêté par [[lib.rs]] à la fermeture.
- La barre : [[overlay.rs]], [[Barre en jeu]].

## Tests

- `reads_kernel_network_events` : décodage d'un événement (PID 4242, adresse et port d'en face), événement trop court refusé, identifiants 43, 10 et 12.
- `the_busiest_public_peer_is_the_game_server` : le serveur UDP qui envoie le plus gagne contre la voix et le salon ; le réseau local et un autre processus sont ignorés ; 4 s sans paquet → plus de partie ; un autre jeu repart de zéro.
- `too_few_packets_is_not_a_match` : 5 paquets ne suffisent pas.

## À savoir avant de modifier

- Garder le nom `Rago-GamePing` : il permet d'arrêter une session restée d'un lancement précédent.
- Le rappel ETW est appelé pour **chaque paquet de la machine** : il doit rester très léger (pas de verrou avant le filtre sur le PID).
