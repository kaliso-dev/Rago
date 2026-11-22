---
type: code
tags: [code, rago-route, serveur, python]
fichier: proxy/mcping.py
lignes: 36
maj: 2026-11-10
---
# mcping.py

Petit outil en ligne de commande qui mesure le **ping Minecraft** d'un serveur (protocole « status ping/pong »), utilisé à la fin de l'installation d'un serveur Rago pour vérifier qu'il est bien placé. Fiche parente : [[Code de Rago Route]]. Fonctionnalité : [[Proxy]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Copié sur chaque VPS dans `/opt/rago-proxy/mcping.py` par [[install.sh]] (généré par [[fabriquer-install.py]]).
- À la fin de l'installation, [[install.sh]] lance `python3 -I /opt/rago-proxy/mcping.py mc.hypixel.net 25565 10` puis la même chose pour `eu.minemen.club` : Sofiene voit tout de suite le ping depuis le nouveau serveur.
- Il ne sert pas au service `rago-route` lui-même : [[rago-route.py]] a sa propre fonction `ping_minecraft` (asynchrone) pour le ping annoncé dans le `HELLO` et le `PONG`.
- L'équivalent dans l'app Windows est [[mcping.rs]].

## Ce que le fichier expose

`python3 mcping.py <hôte> [port] [essais]` : port par défaut `25565`, **8 essais** par défaut, 0,5 s entre deux essais.

Fonctions : `vi(n)` (écrit un VarInt), `rvi(s)` (lit un VarInt sur le socket, 5 octets au plus), `recvn(s, n)` (lit exactement `n` octets, `IOError('fermé')` si la connexion se ferme), `ping(host, port)` → `(tcp_ms, mc_ms)`.

## Fonctionnement détaillé

1. Connexion TCP (délai 5 s) ; le temps de connexion donne `tcp_ms`.
2. Handshake : paquet `0x00`, protocole **47**, nom d'hôte, port, état suivant **1** (status), suivi de la requête de statut `\x01\x00`. La réponse (le JSON du statut) est lue et jetée.
3. Ping : paquet `0x01` avec un `long` (1) ; le temps jusqu'à la réponse donne `mc_ms`.
4. Résultat affiché : `<hôte>: ping MC médian X ms (meilleur Y ms) ; TCP vers l'entrée Z ms` (médianes sur les essais réussis). Chaque échec affiche `erreur …`.

## Données touchées

Réseau seulement (TCP vers le serveur de jeu). Aucun fichier.

## Liens avec le reste

- Emballé par [[fabriquer-install.py]] dans [[install.sh]] ; lancé à la fin de l'installation.
- Même protocole que `ping_minecraft` de [[rago-route.py]] et que [[mcping.rs]] dans l'app.
- Mesures historiques des serveurs (OVH, Vultr Paris, Frankfurt) : [[Proxy]] et [[Infrastructure Rago Route]].

## À savoir avant de modifier

- Après une modification, relancer `python3 proxy/fabriquer-install.py` (le fichier est recopié tel quel dans [[install.sh]]) ; il ne doit pas contenir la chaîne `RAGO_EOF` (le générateur le vérifie).
- « TCP vers l'entrée » mesure le temps de connexion au point d'entrée du serveur (chez Hypixel, l'entrée Cloudflare la plus proche), pas le ping en jeu.
