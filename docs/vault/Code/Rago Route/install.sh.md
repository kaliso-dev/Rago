---
type: code
tags: [code, rago-route, serveur, shell, généré]
fichier: proxy/install.sh
lignes: 1628
maj: 2026-11-11
---
# install.sh

Script d'installation (et de mise à jour) d'un serveur Rago Route sur un VPS Ubuntu : un seul fichier, **généré** par [[fabriquer-install.py]], qui embarque [[rago-route.py]] et [[mcping.py]]. Fiche parente : [[Code de Rago Route]] et [[Infrastructure Rago Route]]. Fonctionnalité : [[Proxy]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Usage : `sudo sh install.sh` sur le VPS (Sofiene le colle et le lance lui-même). Le même script sert pour la première installation et pour chaque mise à jour du programme.
- Ses 1 628 lignes sont presque toutes le code de [[rago-route.py]] (1 510) et [[mcping.py]] (36) ; le reste (environ 80 lignes) est le modèle de [[fabriquer-install.py]].
- État le 10/11 : identique à ce que produit le générateur avec les sources actuelles (vérifié en comparant le texte), 75 068 octets (74 651 caractères : le générateur affiche `len(script)`, qui compte les caractères, et les lettres accentuées prennent 2 octets).

## Fonctionnement détaillé

`set -e` ; s'arrête avec « Lance-moi avec sudo : sudo sh install.sh » si l'utilisateur n'est pas `root`.

1. **« 1/5 Mise à jour du système »** : `apt-get update -q`, puis installe `python3`, `python3-cryptography`, `ufw`, `unattended-upgrades` (mode non interactif).
2. **« 2/5 Copie de Rago Route »** :
   - Retire l'**ancien proxy simple** s'il existe (`/etc/systemd/system/rago-proxy.service`) : `systemctl disable --now rago-proxy`, suppression du service et de `/opt/rago-proxy/relay.py`, fermeture des ports `25565/tcp` et `25566/tcp` dans `ufw`. Raison écrite dans le script : retiré le 08/11, « il laissait n'importe qui passer par le serveur ».
   - Crée l'utilisateur système `rago-proxy` (sans dossier personnel, shell `/usr/sbin/nologin`) s'il n'existe pas.
   - Écrit `/opt/rago-proxy/mcping.py` et `/opt/rago-proxy/rago-route.py` (blocs `<<'RAGO_EOF'`), droits `755`.
3. **« 3/5 Réglages réseau (BBR, files d'attente) »** : écrit `/etc/sysctl.d/90-rago-proxy.conf` puis `sysctl --system` :
   - `net.core.default_qdisc = fq`
   - `net.ipv4.tcp_congestion_control = bbr`
   - `net.ipv4.tcp_fastopen = 3`
   - `net.ipv4.tcp_slow_start_after_idle = 0`
   - `net.core.somaxconn = 1024`
   - `net.core.rmem_max = 4194304` et `net.core.wmem_max = 4194304` (4 Mio, pour les tampons UDP de 1 Mio du programme)
4. **« 4/5 Service qui démarre tout seul »** : écrit `/etc/systemd/system/rago-route.service` :
   - `Description=Rago Route (sortie et relais du tunnel)`, après `network-online.target`.
   - `User=rago-proxy`, `ExecStart=/usr/bin/python3 -I /opt/rago-proxy/rago-route.py sortie` (mode isolé `-I` de Python : n'importe aucun module du dossier courant).
   - `StateDirectory=rago-route` (crée `/var/lib/rago-route`, où le programme garde la copie des clés publiques `cles.json`).
   - `Restart=always`, `RestartSec=2`, `LimitNOFILE=65536`, `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`.
   - `systemctl daemon-reload`, `enable --now`, puis `restart` (pour prendre le nouveau code lors d'une mise à jour).
5. **« 5/5 Pare-feu »** : `ufw allow OpenSSH`, `ufw allow 25600/udp`, `ufw --force enable`. Aucun port TCP de jeu n'est ouvert.

Contrôles finaux (après 5 s) :
- « Rago Route : EN MARCHE » si le service est actif ; sinon « Rago Route : ERREUR », les 20 dernières lignes de `journalctl -u rago-route` et sortie en erreur.
- « Ping depuis ce serveur : » puis [[mcping.py]] vers `mc.hypixel.net` et `eu.minemen.club` (10 essais chacun ; un échec n'arrête pas le script).
- « Clés du serveur de licences : OK » si le journal contient « clés publiques », sinon « pas encore lues (voir journalctl -u rago-route) ».
- Message de fin : « Rago Route n'accepte plus que les jetons Premium de l'app (ou --jeton pour les tests sur Mac). »

## Données touchées

`/opt/rago-proxy/`, `/etc/sysctl.d/90-rago-proxy.conf`, `/etc/systemd/system/rago-route.service`, `/var/lib/rago-route/`, règles `ufw`, utilisateur `rago-proxy`, paquets `apt`.

## Erreurs et cas limites

- Le script est fait pour Ubuntu (apt, ufw, systemd). Les serveurs actuels sont des VPS Vultr (Paris, Frankfurt) ; voir [[Infrastructure Rago Route]].
- `ufw --force enable` active le pare-feu même s'il était coupé ; SSH reste ouvert par la règle `OpenSSH`.

## Liens avec le reste

- Généré par [[fabriquer-install.py]] ; embarque [[rago-route.py]] et [[mcping.py]].
- Le client qui parle à ce service : [[route.rs]] (app Windows).
- Règles du dossier : [[CLAUDE.md (proxy)]].

## À savoir avant de modifier

- **Ne jamais modifier ce fichier à la main** : changer [[fabriquer-install.py]] (modèle) ou les sources, puis le régénérer.
- Il ne contient aucun secret : le service ne lit que les clés **publiques** du serveur de licences.
