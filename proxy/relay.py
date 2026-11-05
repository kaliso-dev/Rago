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
