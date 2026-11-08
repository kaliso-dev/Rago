#!/usr/bin/env python3
"""Fabrique install.sh (un seul fichier à coller sur le VPS) à partir de rago-route.py et mcping.py."""
import pathlib
ici = pathlib.Path(__file__).parent
mcping = (ici / "mcping.py").read_text()
route = (ici / "rago-route.py").read_text()
assert "RAGO_EOF" not in mcping + route
script = f'''#!/bin/sh
# Installation de Rago Route (sortie et relais) sur un VPS Ubuntu.
# Usage : sudo sh install.sh
# Généré par proxy/fabriquer-install.py : ne pas modifier à la main.
set -e
[ "$(id -u)" = 0 ] || {{ echo "Lance-moi avec sudo : sudo sh install.sh"; exit 1; }}

echo "1/5 Mise à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q python3 python3-cryptography ufw unattended-upgrades >/dev/null

echo "2/5 Copie de Rago Route"
# L'ancien proxy simple (relay.py, ports 25565 et 25566) est retiré le 08/11 : il laissait n'importe qui passer
# par le serveur. Rago Route demande maintenant un jeton Premium.
if [ -f /etc/systemd/system/rago-proxy.service ]; then
  systemctl disable --now rago-proxy >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/rago-proxy.service /opt/rago-proxy/relay.py
  ufw delete allow 25565/tcp >/dev/null 2>&1 || true
  ufw delete allow 25566/tcp >/dev/null 2>&1 || true
fi
id rago-proxy >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin rago-proxy
mkdir -p /opt/rago-proxy
cat > /opt/rago-proxy/mcping.py <<'RAGO_EOF'
{mcping}RAGO_EOF
cat > /opt/rago-proxy/rago-route.py <<'RAGO_EOF'
{route}RAGO_EOF
chmod 755 /opt/rago-proxy/mcping.py /opt/rago-proxy/rago-route.py

echo "3/5 Réglages réseau (BBR, files d'attente)"
cat > /etc/sysctl.d/90-rago-proxy.conf <<'RAGO_EOF'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0
net.core.somaxconn = 1024
net.core.rmem_max = 4194304
net.core.wmem_max = 4194304
RAGO_EOF
sysctl --system >/dev/null || true

echo "4/5 Service qui démarre tout seul"
cat > /etc/systemd/system/rago-route.service <<'RAGO_EOF'
[Unit]
Description=Rago Route (sortie et relais du tunnel)
After=network-online.target
Wants=network-online.target

[Service]
User=rago-proxy
ExecStart=/usr/bin/python3 -I /opt/rago-proxy/rago-route.py sortie
# copie des clés publiques du serveur de licences (/var/lib/rago-route)
StateDirectory=rago-route
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
systemctl enable --now rago-route
systemctl restart rago-route

echo "5/5 Pare-feu : SSH + port 25600/udp (Rago Route)"
ufw allow OpenSSH >/dev/null
ufw allow 25600/udp >/dev/null
ufw --force enable >/dev/null

sleep 5
echo
systemctl is-active --quiet rago-route && echo "Rago Route : EN MARCHE" || {{ echo "Rago Route : ERREUR"; journalctl -u rago-route -n 20 --no-pager; exit 1; }}
echo "Ping depuis ce serveur :"
python3 -I /opt/rago-proxy/mcping.py mc.hypixel.net 25565 10 || true
python3 -I /opt/rago-proxy/mcping.py eu.minemen.club 25565 10 || true
journalctl -u rago-route -n 3 --no-pager | grep -q "clés publiques" && echo "Clés du serveur de licences : OK" || echo "Clés du serveur de licences : pas encore lues (voir journalctl -u rago-route)"
echo
echo "Rago Route n'accepte plus que les jetons Premium de l'app (ou --jeton pour les tests sur Mac)."
'''
(ici / "install.sh").write_text(script)
print("install.sh écrit,", len(script), "octets")
