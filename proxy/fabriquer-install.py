#!/usr/bin/env python3
"""Fabrique install.sh (un seul fichier à coller sur le VPS) à partir de relay.py et mcping.py."""
import pathlib
ici = pathlib.Path(__file__).parent
relay = (ici / "relay.py").read_text()
mcping = (ici / "mcping.py").read_text()
route = (ici / "rago-route.py").read_text()
assert "RAGO_EOF" not in relay + mcping + route
script = f'''#!/bin/sh
# Installation du proxy Rago sur un VPS Ubuntu (OVHcloud).
# Usage : sudo sh install.sh
# Généré par proxy/fabriquer-install.py : ne pas modifier à la main.
set -e
[ "$(id -u)" = 0 ] || {{ echo "Lance-moi avec sudo : sudo sh install.sh"; exit 1; }}

echo "1/5 Mise à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q python3 ufw unattended-upgrades >/dev/null

echo "2/5 Copie du relais"
id rago-proxy >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin rago-proxy
mkdir -p /opt/rago-proxy
cat > /opt/rago-proxy/relay.py <<'RAGO_EOF'
{relay}RAGO_EOF
cat > /opt/rago-proxy/mcping.py <<'RAGO_EOF'
{mcping}RAGO_EOF
cat > /opt/rago-proxy/rago-route.py <<'RAGO_EOF'
{route}RAGO_EOF
chmod 755 /opt/rago-proxy/relay.py /opt/rago-proxy/mcping.py /opt/rago-proxy/rago-route.py

echo "3/5 Réglages réseau (BBR, files d'attente)"
cat > /etc/sysctl.d/90-rago-proxy.conf <<'RAGO_EOF'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0
net.core.somaxconn = 1024
RAGO_EOF
sysctl --system >/dev/null || true

echo "4/5 Service qui démarre tout seul"
cat > /etc/systemd/system/rago-proxy.service <<'RAGO_EOF'
[Unit]
Description=Relais Minecraft Rago
After=network-online.target
Wants=network-online.target

[Service]
User=rago-proxy
ExecStart=/usr/bin/python3 -I /opt/rago-proxy/relay.py
Restart=always
RestartSec=2
LimitNOFILE=65536
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
RAGO_EOF
cat > /etc/systemd/system/rago-route.service <<'RAGO_EOF'
[Unit]
Description=Rago Route (sortie et relais du tunnel)
After=network-online.target
Wants=network-online.target

[Service]
User=rago-proxy
ExecStart=/usr/bin/python3 -I /opt/rago-proxy/rago-route.py sortie
Restart=always
RestartSec=2
LimitNOFILE=65536
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
RAGO_EOF
systemctl daemon-reload
systemctl enable --now rago-proxy rago-route
systemctl restart rago-proxy rago-route

echo "5/5 Pare-feu : SSH + ports 25565 (Hypixel), 25566 (Minemen) et 25600/udp (Rago Route)"
ufw allow OpenSSH >/dev/null
ufw allow 25565/tcp >/dev/null
ufw allow 25566/tcp >/dev/null
ufw allow 25600/udp >/dev/null
ufw --force enable >/dev/null

sleep 2
echo
systemctl is-active --quiet rago-proxy && echo "Proxy Rago : EN MARCHE" || {{ echo "Proxy Rago : ERREUR"; journalctl -u rago-proxy -n 20 --no-pager; exit 1; }}
systemctl is-active --quiet rago-route && echo "Rago Route : EN MARCHE" || {{ echo "Rago Route : ERREUR"; journalctl -u rago-route -n 20 --no-pager; exit 1; }}
echo "Ping depuis ce serveur :"
python3 -I /opt/rago-proxy/mcping.py mc.hypixel.net 25565 10 || true
python3 -I /opt/rago-proxy/mcping.py eu.minemen.club 25565 10 || true
IP=$(hostname -I | awk '{{print $1}}')
echo
echo "Dans Minecraft, ajoute le serveur :  $IP  (Hypixel)  et  $IP:25566  (Minemen)"
'''
(ici / "install.sh").write_text(script)
print("install.sh écrit,", len(script), "octets")
