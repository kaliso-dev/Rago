#!/bin/sh
# Installation du proxy Rago sur un VPS Ubuntu (OVHcloud).
# Usage : sudo sh install.sh
# Généré par proxy/fabriquer-install.py : ne pas modifier à la main.
set -e
[ "$(id -u)" = 0 ] || { echo "Lance-moi avec sudo : sudo sh install.sh"; exit 1; }

echo "1/5 Mise à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q python3 ufw unattended-upgrades >/dev/null

echo "2/5 Copie du relais"
id rago-proxy >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin rago-proxy
mkdir -p /opt/rago-proxy
cat > /opt/rago-proxy/relay.py <<'RAGO_EOF'
#!/usr/bin/env python3
"""Relais Rago pour Minecraft.

Chaque port local renvoie vers un serveur Minecraft (voir ROUTES). Le relais
réécrit l'adresse dans le paquet de connexion (handshake) pour que le serveur
voie son nom officiel (ex. mc.hypixel.net), puis copie les octets dans les deux
sens sans les lire : le chiffrement Minecraft reste de bout en bout.

Aucune dépendance : Python 3.8+ seulement.
"""
import asyncio, logging, os, socket, struct, time

# port d'écoute -> (nom officiel, port du serveur)
ROUTES = {
    25565: ("mc.hypixel.net", 25565),
    25566: ("eu.minemen.club", 25565),
}
MAX_CONN_PAR_IP = int(os.environ.get("RAGO_MAX_CONN_PAR_IP", "8"))
DELAI_HANDSHAKE = 10  # secondes pour recevoir le premier paquet

log = logging.getLogger("rago-relay")
conn_par_ip = {}


def lire_varint(buf, pos):
    n = 0
    for i in range(5):
        if pos >= len(buf):
            raise IndexError
        b = buf[pos]; pos += 1
        n |= (b & 0x7F) << (7 * i)
        if not b & 0x80:
            return n, pos
    raise ValueError("varint trop long")


def ecrire_varint(n):
    n &= 0xFFFFFFFF
    out = bytearray()
    while True:
        b = n & 0x7F; n >>= 7
        out.append(b | (0x80 if n else 0))
        if not n:
            return bytes(out)


async def lire_premier_paquet(reader):
    """Renvoie (paquet complet, reste déjà lu) ou (None, octets) si ce n'est pas un handshake moderne."""
    buf = b""
    while True:
        chunk = await reader.read(4096)
        if not chunk:
            return None, buf
        buf += chunk
        if buf[0] == 0xFE:  # ancien ping (avant 1.7) : on laisse passer tel quel
            return None, buf
        try:
            longueur, pos = lire_varint(buf, 0)
        except IndexError:
            continue
        if longueur > 2048:
            raise ValueError("handshake trop long")
        if len(buf) >= pos + longueur:
            return buf[: pos + longueur], buf[pos + longueur:]


def reecrire_handshake(paquet, hote, port):
    longueur, pos = lire_varint(paquet, 0)
    pid, pos = lire_varint(paquet, pos)
    if pid != 0:
        raise ValueError("premier paquet inattendu")
    protocole, pos = lire_varint(paquet, pos)
    taille, pos = lire_varint(paquet, pos)
    ancien = paquet[pos: pos + taille].decode("utf-8", "replace")
    pos += taille
    pos += 2  # ancien port
    etat, pos = lire_varint(paquet, pos)
    h = hote.encode()
    corps = ecrire_varint(0) + ecrire_varint(protocole) + ecrire_varint(len(h)) + h + struct.pack(">H", port) + ecrire_varint(etat)
    return ecrire_varint(len(corps)) + corps, ancien, etat


def regler_socket(writer):
    sock = writer.get_extra_info("socket")
    if sock is not None:
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)


async def copier(src, dst, compteur, cle):
    try:
        while True:
            data = await src.read(65536)
            if not data:
                break
            compteur[cle] += len(data)
            dst.write(data)
            await dst.drain()
    except (ConnectionError, asyncio.CancelledError, OSError):
        pass
    finally:
        try:
            dst.close()
        except Exception:
            pass


async def gerer(reader, writer, cible):
    ip = (writer.get_extra_info("peername") or ("?",))[0]
    if conn_par_ip.get(ip, 0) >= MAX_CONN_PAR_IP:
        writer.close(); return
    conn_par_ip[ip] = conn_par_ip.get(ip, 0) + 1
    debut = time.time(); compteur = {"monte": 0, "descend": 0}; etat = "?"
    try:
        regler_socket(writer)
        paquet, reste = await asyncio.wait_for(lire_premier_paquet(reader), DELAI_HANDSHAKE)
        if paquet is not None:
            premier, _ancien, etat = reecrire_handshake(paquet, *cible)
            premier += reste
        else:
            premier = reste
            if not premier:
                return
        r2, w2 = await asyncio.wait_for(asyncio.open_connection(*cible), 10)
        regler_socket(w2)
        w2.write(premier); await w2.drain()
        await asyncio.gather(copier(reader, w2, compteur, "monte"), copier(r2, writer, compteur, "descend"))
    except Exception as e:
        log.debug("connexion %s refusée : %s", ip, e)
    finally:
        conn_par_ip[ip] -= 1
        if not conn_par_ip[ip]:
            del conn_par_ip[ip]
        try:
            writer.close()
        except Exception:
            pass
        if etat == 2:  # vraie partie (pas un simple ping de la liste des serveurs)
            log.info("partie vers %s : %.0f s, %.1f Mo", cible[0],
                     time.time() - debut, (compteur["monte"] + compteur["descend"]) / 1e6)


async def principal():
    serveurs = []
    for port, cible in ROUTES.items():
        s = await asyncio.start_server(lambda r, w, c=cible: gerer(r, w, c), host="0.0.0.0", port=port, backlog=512)
        serveurs.append(s)
        log.info("port %d -> %s:%d", port, *cible)
    await asyncio.gather(*(s.serve_forever() for s in serveurs))


if __name__ == "__main__":
    logging.basicConfig(level=os.environ.get("RAGO_LOG", "INFO"), format="%(asctime)s %(message)s")
    asyncio.run(principal())
RAGO_EOF
cat > /opt/rago-proxy/mcping.py <<'RAGO_EOF'
#!/usr/bin/env python3
"""Ping Minecraft (protocole status ping/pong) : python3 mcping.py mc.hypixel.net [port] [essais]"""
import socket,struct,time,sys,statistics
def vi(n):
    o=b''
    while True:
        b=n&0x7f;n>>=7
        o+=bytes([b|(0x80 if n else 0)])
        if not n:return o
def rvi(s):
    n=0
    for i in range(5):
        b=s.recv(1)[0];n|=(b&0x7f)<<(7*i)
        if not b&0x80:return n
def recvn(s,n):
    d=b''
    while len(d)<n:
        c=s.recv(n-len(d))
        if not c:raise IOError('fermé')
        d+=c
    return d
def ping(host,port=25565):
    t0=time.perf_counter();s=socket.create_connection((host,port),5);tcp=(time.perf_counter()-t0)*1000
    h=host.encode();p=vi(0)+vi(47)+vi(len(h))+h+struct.pack('>H',port)+vi(1)
    s.sendall(vi(len(p))+p+b'\x01\x00')
    l=rvi(s);recvn(s,l)
    p=b'\x01'+struct.pack('>q',1);t0=time.perf_counter();s.sendall(vi(len(p))+p)
    l=rvi(s);recvn(s,l);mc=(time.perf_counter()-t0)*1000;s.close();return tcp,mc
host=sys.argv[1];port=int(sys.argv[2]) if len(sys.argv)>2 else 25565;n=int(sys.argv[3]) if len(sys.argv)>3 else 8
r=[]
for i in range(n):
    try:r.append(ping(host,port))
    except Exception as e:print('erreur',e)
    time.sleep(0.5)
if r:
    print(f"{host}: ping MC médian {statistics.median(x[1] for x in r):.1f} ms (meilleur {min(x[1] for x in r):.1f}) ; TCP vers l'entrée {statistics.median(x[0] for x in r):.1f} ms")
RAGO_EOF
chmod 755 /opt/rago-proxy/relay.py /opt/rago-proxy/mcping.py

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
systemctl daemon-reload
systemctl enable --now rago-proxy
systemctl restart rago-proxy

echo "5/5 Pare-feu : SSH + ports 25565 (Hypixel) et 25566 (Minemen)"
ufw allow OpenSSH >/dev/null
ufw allow 25565/tcp >/dev/null
ufw allow 25566/tcp >/dev/null
ufw --force enable >/dev/null

sleep 2
echo
systemctl is-active --quiet rago-proxy && echo "Proxy Rago : EN MARCHE" || { echo "Proxy Rago : ERREUR"; journalctl -u rago-proxy -n 20 --no-pager; exit 1; }
echo "Ping depuis ce serveur :"
python3 -I /opt/rago-proxy/mcping.py mc.hypixel.net 25565 10 || true
python3 -I /opt/rago-proxy/mcping.py eu.minemen.club 25565 10 || true
IP=$(hostname -I | awk '{print $1}')
echo
echo "Dans Minecraft, ajoute le serveur :  $IP  (Hypixel)  et  $IP:25566  (Minemen)"
