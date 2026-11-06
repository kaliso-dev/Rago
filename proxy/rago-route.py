#!/usr/bin/env python3
"""Rago Route, prototype pour Minecraft Java.

Un tunnel entre le PC du joueur et un serveur de sortie Rago, placé dans la ville
où le joueur entre chez Cloudflare (Paris pour la France).

  Minecraft -> 127.0.0.1:25565 -> [client] ==UDP, plusieurs trajets==> [sortie] -> mc.hypixel.net

- Double trajet : chaque paquet part par tous les trajets à la fois (direct, par un
  relais Rago, par une autre connexion comme la 4G) ; le premier arrivé gagne.
- Renvoi rapide : un paquet perdu est renvoyé après environ un aller-retour du
  tunnel (quelques dizaines de ms), sans attendre les délais de TCP.
- Survie aux coupures : la sortie garde la connexion à Hypixel ouverte jusqu'à
  60 s sans nouvelles du joueur ; dès que le réseau revient, tout reprend.

Rago Route ne lit ni ne modifie le jeu : après la connexion, le flux Minecraft est
chiffré entre le jeu et Hypixel. Seul le nom du serveur est remis dans le premier
paquet (handshake), comme le fait déjà relay.py.

Modes :
  python3 rago-route.py sortie                       (sur un serveur Rago, port UDP 25600)
  python3 rago-route.py client --sortie IP [--via IP] [--interface en5]

Aucune dépendance : Python 3.8+ seulement.
"""
import argparse
import asyncio
import ipaddress
import logging
import os
import random
import secrets
import socket
import struct
import sys
import time

VERSION = 1
MAGIC = b"RR"
PORT_ROUTE = 25600
T_OPEN, T_OPEN_OK, T_DATA, T_ACK, T_PING, T_PONG, T_CLOSE, T_FWD = range(1, 9)
ENTETE = struct.Struct(">2sBB16s")  # magie, version, type, session
DATA = struct.Struct(">II")         # numéro, horodatage d'envoi (ms)
ACK = struct.Struct(">IQI")         # tout reçu avant ce numéro, 64 suivants (bits), horodatage renvoyé
PING = struct.Struct(">IB")         # horodatage, numéro du trajet
FWD = struct.Struct(">4sH")         # adresse et port de la sortie
TAILLE_MAX = 1150                   # octets de jeu par paquet (tient sous la MTU, même en 4G)
FENETRE = 2048                      # paquets en vol au maximum
CIBLES = {0: ("mc.hypixel.net", 25565), 1: ("eu.minemen.club", 25565)}
PORTS_LOCAUX = {25565: 0, 25566: 1}
if os.environ.get("RAGO_TEST_LOCAL") == "1" and os.environ.get("RAGO_CIBLE_TEST"):  # tests seulement
    _h, _p = os.environ["RAGO_CIBLE_TEST"].split(":")
    CIBLES = {0: (_h, int(_p)), 1: (_h, int(_p))}
TICK = 0.005
SESSION_MAX_SILENCE = 60.0
ADRESSE_ACTIVE = 3.0

log = logging.getLogger("rago-route")


def maintenant_ms():
    return int(time.monotonic() * 1000) & 0xFFFFFFFF


def ecart_ms(a, b):
    """a - b sur des horodatages de 32 bits."""
    return ((a - b + 0x80000000) & 0xFFFFFFFF) - 0x80000000


def paquet(type_, session, corps=b""):
    return ENTETE.pack(MAGIC, VERSION, type_, session) + corps


def lire_entete(data):
    if len(data) < ENTETE.size:
        return None
    magie, version, type_, session = ENTETE.unpack_from(data)
    if magie != MAGIC or version != VERSION:
        return None
    return type_, session, data[ENTETE.size:]


# --- handshake Minecraft (même logique que relay.py) -------------------------

def lire_varint(buf, pos):
    n = 0
    for i in range(5):
        if pos >= len(buf):
            raise IndexError
        b = buf[pos]
        pos += 1
        n |= (b & 0x7F) << (7 * i)
        if not b & 0x80:
            return n, pos
    raise ValueError("varint trop long")


def ecrire_varint(n):
    n &= 0xFFFFFFFF
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        out.append(b | (0x80 if n else 0))
        if not n:
            return bytes(out)


def reecrire_handshake(paquet_mc, hote, port):
    _, pos = lire_varint(paquet_mc, 0)
    pid, pos = lire_varint(paquet_mc, pos)
    if pid != 0:
        raise ValueError("premier paquet inattendu")
    protocole, pos = lire_varint(paquet_mc, pos)
    taille, pos = lire_varint(paquet_mc, pos)
    pos += taille + 2
    etat, pos = lire_varint(paquet_mc, pos)
    h = hote.encode()
    corps = ecrire_varint(0) + ecrire_varint(protocole) + ecrire_varint(len(h)) + h + struct.pack(">H", port) + ecrire_varint(etat)
    return ecrire_varint(len(corps)) + corps


class Reecriture:
    """Remplace le nom du serveur dans le premier paquet du flux, puis laisse tout passer."""

    def __init__(self, hote, port):
        self.cible = (hote, port)
        self.tampon = b""
        self.fini = False

    def passer(self, data):
        if self.fini:
            return data
        self.tampon += data
        if self.tampon[:1] == b"\xfe":  # ancien ping (avant 1.7)
            self.fini = True
            return self.tampon
        try:
            longueur, pos = lire_varint(self.tampon, 0)
        except IndexError:
            return b""
        if len(self.tampon) < pos + longueur:
            return b""
        premier, reste = self.tampon[: pos + longueur], self.tampon[pos + longueur:]
        self.fini = True
        self.tampon = b""
        return reecrire_handshake(premier, *self.cible) + reste


# --- flux fiable sur UDP ------------------------------------------------------

class Emetteur:
    """Découpe un flux d'octets en paquets numérotés et les renvoie jusqu'à confirmation."""

    def __init__(self, envoyer, debit_octets_s):
        self.envoyer = envoyer          # fonction(bytes) qui part sur tous les trajets
        self.attente = bytearray()      # octets pas encore mis en paquets
        self.suivant = 0
        self.en_vol = {}                # numéro -> [données, dernier envoi (ms), nb envois]
        self.plus_haut_confirme = -1
        self.srtt = None
        self.rttvar = 0.0
        self.renvois = 0
        self.debit = debit_octets_s
        self.jetons = 64 * 1024
        self.dernier_tick = time.monotonic()

    def pousser(self, data):
        """Ajoute des octets du jeu et les envoie tout de suite (sans attendre le prochain tick)."""
        self.attente += data
        self._recharger()
        self._envoyer_nouveaux()

    def _recharger(self):
        t = time.monotonic()
        self.jetons = min(256 * 1024, self.jetons + (t - self.dernier_tick) * self.debit)
        self.dernier_tick = t

    def _envoyer_nouveaux(self):
        while self.attente and len(self.en_vol) < FENETRE and self.jetons > 0:
            morceau = bytes(self.attente[:TAILLE_MAX])
            del self.attente[:TAILLE_MAX]
            self._envoyer(self.suivant, morceau, 1)
            self.suivant += 1

    def vide(self):
        return not self.attente and not self.en_vol

    def rto(self, nb):
        base = 200.0 if self.srtt is None else max(20.0, self.srtt + 4 * self.rttvar)
        return min(1000.0, base * (2 ** max(0, nb - 1)))

    def _envoyer(self, num, morceau, nb):
        t = maintenant_ms()
        self.envoyer(DATA.pack(num, t) + morceau)
        self.jetons -= len(morceau) + 40
        self.en_vol[num] = [morceau, t, nb]

    def recu_ack(self, cumul, bits, ts_renvoye):
        for num in [n for n in self.en_vol if n < cumul]:
            del self.en_vol[num]
        for i in range(64):
            if bits >> i & 1:
                num = cumul + 1 + i
                self.en_vol.pop(num, None)
                self.plus_haut_confirme = max(self.plus_haut_confirme, num)
        self.plus_haut_confirme = max(self.plus_haut_confirme, cumul - 1)
        echantillon = ecart_ms(maintenant_ms(), ts_renvoye)
        if 0 <= echantillon < 5000:
            if self.srtt is None:
                self.srtt, self.rttvar = float(echantillon), echantillon / 2
            else:
                self.rttvar = 0.75 * self.rttvar + 0.25 * abs(self.srtt - echantillon)
                self.srtt = 0.875 * self.srtt + 0.125 * echantillon

    def tick(self):
        self._recharger()
        now = maintenant_ms()
        srtt = self.srtt if self.srtt is not None else 200.0
        for num, (morceau, envoi, nb) in sorted(self.en_vol.items()):
            age = ecart_ms(now, envoi)
            # perdu si un paquet envoyé après lui est déjà confirmé (renvoi rapide), ou délai dépassé
            rapide = num < self.plus_haut_confirme and age > srtt * 1.25 + 3
            if rapide or age > self.rto(nb):
                if self.jetons <= 0:
                    break
                self.renvois += 1
                self._envoyer(num, morceau, nb + 1)
        self._envoyer_nouveaux()


class Recepteur:
    """Remet les paquets dans l'ordre, ignore les doublons et prépare les confirmations."""

    def __init__(self, livrer):
        self.livrer = livrer
        self.attendu = 0
        self.tampon = {}
        self.doublons = 0

    def recu(self, num, data):
        """Renvoie True si le paquet est nouveau."""
        if num < self.attendu or num in self.tampon:
            self.doublons += 1
            return False
        if num - self.attendu > FENETRE * 2:
            return False
        self.tampon[num] = data
        while self.attendu in self.tampon:
            self.livrer(self.tampon.pop(self.attendu))
            self.attendu += 1
        return True

    def ack(self, ts):
        bits = 0
        for i in range(64):
            if self.attendu + 1 + i in self.tampon:
                bits |= 1 << i
        return ACK.pack(self.attendu, bits, ts)


# --- sortie (sur les serveurs Rago) -----------------------------------------

def ip_publique(ip):
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if os.environ.get("RAGO_TEST_LOCAL") == "1" and a.is_loopback:
        return True
    return a.version == 4 and a.is_global


def adresse(texte):
    """« 1.2.3.4 » ou « 1.2.3.4:25600 » -> (ip, port)."""
    hote, _, port = texte.partition(":")
    return socket.gethostbyname(hote), int(port or PORT_ROUTE)


class SessionSortie:
    def __init__(self, serveur, sid, cible):
        self.serveur = serveur
        self.sid = sid
        self.cible = CIBLES[cible]
        self.adresses = {}  # adresse du joueur (ou d'un relais) -> dernière fois vue
        self.dernier_contact = time.monotonic()
        self.emetteur = Emetteur(lambda corps: self.envoyer(T_DATA, corps), serveur.debit)
        self.recepteur = Recepteur(self._vers_minecraft)
        self.reecriture = Reecriture(*self.cible)
        self.writer = None
        self.en_attente = []
        self.ferme = False
        self.tache = asyncio.ensure_future(self._connecter())
        self.dernier_ack_doublon = 0.0

    async def _connecter(self):
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(*self.cible), 10)
            sock = writer.get_extra_info("socket")
            if sock is not None:
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            self.writer = writer
            for morceau in self.en_attente:
                writer.write(morceau)
            self.en_attente = []
            while True:
                data = await reader.read(65536)
                if not data:
                    break
                self.emetteur.pousser(data)
        except Exception as e:
            log.info("session %s : %s", self.sid.hex()[:8], e)
        finally:
            self.fin_serveur = True
            self.fermer_apres_envoi = True

    def _vers_minecraft(self, data):
        data = self.reecriture.passer(data)
        if not data:
            return
        if self.writer is None:
            self.en_attente.append(data)
        else:
            self.writer.write(data)

    def envoyer(self, type_, corps):
        p = paquet(type_, self.sid, corps)
        t = time.monotonic()
        for adresse, vu in list(self.adresses.items()):
            if t - vu < ADRESSE_ACTIVE:
                self.serveur.transport.sendto(p, adresse)

    def recu(self, type_, corps, adresse):
        self.adresses[adresse] = self.dernier_contact = time.monotonic()
        if type_ == T_OPEN:
            self.serveur.transport.sendto(paquet(T_OPEN_OK, self.sid), adresse)
        elif type_ == T_DATA and len(corps) >= DATA.size:
            num, ts = DATA.unpack_from(corps)
            nouveau = self.recepteur.recu(num, corps[DATA.size:])
            t = time.monotonic()
            if nouveau or t - self.dernier_ack_doublon > 0.02:
                self.dernier_ack_doublon = t
                self.envoyer(T_ACK, self.recepteur.ack(ts))
        elif type_ == T_ACK and len(corps) >= ACK.size:
            self.emetteur.recu_ack(*ACK.unpack_from(corps))
        elif type_ == T_PING and len(corps) >= PING.size:
            self.serveur.transport.sendto(paquet(T_PONG, self.sid, corps[: PING.size]), adresse)
        elif type_ == T_CLOSE:
            self.fermer()

    def tick(self):
        self.emetteur.tick()
        if getattr(self, "fermer_apres_envoi", False) and self.emetteur.vide():
            for _ in range(3):
                self.envoyer(T_CLOSE, b"")
            self.fermer()
        elif time.monotonic() - self.dernier_contact > SESSION_MAX_SILENCE:
            log.info("session %s : joueur silencieux depuis %d s, fermeture", self.sid.hex()[:8], SESSION_MAX_SILENCE)
            self.fermer()

    def fermer(self):
        if self.ferme:
            return
        self.ferme = True
        self.tache.cancel()
        if self.writer is not None:
            self.writer.close()
        self.serveur.sessions.pop(self.sid, None)


class Sortie(asyncio.DatagramProtocol):
    def __init__(self, debit):
        self.debit = debit
        self.sessions = {}
        self.relais = {}  # session -> (adresse du joueur, adresse de la sortie, dernière fois vue)
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, adresse):
        lu = lire_entete(data)
        if lu is None:
            return
        type_, sid, corps = lu
        if type_ == T_FWD:  # rôle de relais : faire suivre vers une autre sortie Rago
            if len(corps) < FWD.size:
                return
            ip_b, port = FWD.unpack_from(corps)
            ip = socket.inet_ntoa(ip_b)
            interieur = corps[FWD.size:]
            lu2 = lire_entete(interieur)
            if (port != PORT_ROUTE and os.environ.get("RAGO_TEST_LOCAL") != "1") or not ip_publique(ip) or lu2 is None or lu2[0] == T_FWD:
                return
            self.relais[lu2[1]] = (adresse, (ip, port), time.monotonic())
            self.transport.sendto(interieur, (ip, port))
            return
        r = self.relais.get(sid)
        if r is not None and adresse == r[1]:  # réponse d'une sortie à renvoyer au joueur
            self.transport.sendto(data, r[0])
            self.relais[sid] = (r[0], r[1], time.monotonic())
            return
        session = self.sessions.get(sid)
        if session is None:
            if type_ != T_OPEN or len(corps) < 1 or corps[0] not in CIBLES or len(self.sessions) > 500:
                return
            session = self.sessions[sid] = SessionSortie(self, sid, corps[0])
            log.info("nouvelle session %s vers %s", sid.hex()[:8], session.cible[0])
        session.recu(type_, corps, adresse)

    async def boucle(self):
        while True:
            await asyncio.sleep(TICK)
            for s in list(self.sessions.values()):
                s.tick()
            t = time.monotonic()
            for sid in [k for k, v in self.relais.items() if t - v[2] > SESSION_MAX_SILENCE]:
                del self.relais[sid]


async def lancer_sortie(args):
    loop = asyncio.get_running_loop()
    proto = Sortie(args.debit * 125000)
    await loop.create_datagram_endpoint(lambda: proto, local_addr=("0.0.0.0", args.port))
    log.info("Rago Route : sortie et relais à l'écoute sur le port UDP %d", args.port)
    await proto.boucle()


# --- client (sur le PC ou le Mac du joueur) ----------------------------------

_COUPURE = None
if os.environ.get("RAGO_TEST_LOCAL") == "1" and os.environ.get("RAGO_COUPURE_TEST"):  # tests seulement
    _d, _l = map(float, os.environ["RAGO_COUPURE_TEST"].split(","))
    _COUPURE = (time.monotonic() + _d, time.monotonic() + _d + _l)


def coupe():
    return _COUPURE is not None and _COUPURE[0] <= time.monotonic() < _COUPURE[1]


class Trajet(asyncio.DatagramProtocol):
    def __init__(self, client, num, nom, destination, sortie, perte_test):
        self.client = client
        self.num = num
        self.nom = nom
        self.destination = destination   # là où on envoie (sortie ou relais)
        self.sortie = sortie             # sortie finale
        self.passe_par_relais = destination != sortie
        self.perte_test = perte_test
        self.transport = None
        self.rtt = None
        self.dernier_pong = 0.0
        self.recus = 0

    def connection_made(self, transport):
        self.transport = transport

    def envoyer(self, p):
        if self.transport is None:
            return
        if (self.perte_test and random.random() < self.perte_test) or coupe():
            return
        if self.passe_par_relais:
            p = paquet(T_FWD, bytes(16), FWD.pack(socket.inet_aton(self.sortie[0]), self.sortie[1]) + p)
        try:
            self.transport.sendto(p, self.destination)
        except OSError:
            pass  # réseau coupé sur ce trajet : les autres prennent le relais

    def datagram_received(self, data, adresse):
        if (self.perte_test and random.random() < self.perte_test) or coupe():
            return
        lu = lire_entete(data)
        if lu is not None:
            self.client.recu(self, *lu)

    def error_received(self, exc):
        pass


class SessionClient:
    def __init__(self, client, cible, reader, writer):
        self.client = client
        self.sid = secrets.token_bytes(16)
        self.cible = cible
        self.reader = reader
        self.writer = writer
        self.ouverte = False
        self.emetteur = Emetteur(lambda corps: self.envoyer(T_DATA, corps), client.debit)
        self.recepteur = Recepteur(self.writer.write)
        self.fin_minecraft = False
        self.ferme = False
        self.dernier_open = 0.0
        self.dernier_ack_doublon = 0.0
        self.chemins_par_num = {}  # numéro de paquet reçu -> trajets qui l'ont apporté (fenêtre récente)
        self.sauves = 0
        self.manques = [0] * len(client.trajets)
        self.uniques = 0

    def envoyer(self, type_, corps=b""):
        p = paquet(type_, self.sid, corps)
        for t in self.client.trajets:
            t.envoyer(p)

    async def lire_minecraft(self):
        try:
            while True:
                data = await self.reader.read(65536)
                if not data:
                    break
                if self.ouverte:
                    self.emetteur.pousser(data)
                else:
                    self.emetteur.attente += data
        except Exception:
            pass
        self.fin_minecraft = True

    def recu(self, trajet, type_, corps):
        if type_ == T_OPEN_OK:
            if not self.ouverte:
                log.info("tunnel ouvert vers %s", CIBLES[self.cible][0])
            self.ouverte = True
        elif type_ == T_DATA and len(corps) >= DATA.size:
            num, ts = DATA.unpack_from(corps)
            trajet.recus += 1
            nouveau = self.recepteur.recu(num, corps[DATA.size:])
            masque = self.chemins_par_num.get(num)
            if nouveau:
                self.chemins_par_num[num] = [1 << trajet.num, time.monotonic()]
            elif masque is not None:
                masque[0] |= 1 << trajet.num
            t = time.monotonic()
            if nouveau or t - self.dernier_ack_doublon > 0.02:
                self.dernier_ack_doublon = t
                self.envoyer(T_ACK, self.recepteur.ack(ts))
        elif type_ == T_ACK and len(corps) >= ACK.size:
            self.emetteur.recu_ack(*ACK.unpack_from(corps))
        elif type_ == T_CLOSE:
            self.fermer()

    def compter(self):
        """Après 1 s, regarde par quels trajets chaque paquet est arrivé."""
        t = time.monotonic()
        tous = (1 << len(self.client.trajets)) - 1
        for num in [n for n, (_, vu) in self.chemins_par_num.items() if t - vu > 1.0]:
            masque = self.chemins_par_num.pop(num)[0]
            self.uniques += 1
            for tr in self.client.trajets:
                if not masque >> tr.num & 1:
                    self.manques[tr.num] += 1
            if len(self.client.trajets) > 1 and bin(masque & tous).count("1") == 1:
                self.sauves += 1

    def tick(self):
        if not self.ouverte:
            if time.monotonic() - self.dernier_open > 0.2:
                self.dernier_open = time.monotonic()
                self.envoyer(T_OPEN, bytes([self.cible]))
            return
        self.emetteur.tick()
        self.compter()
        if self.fin_minecraft and self.emetteur.vide():
            for _ in range(3):
                self.envoyer(T_CLOSE)
            self.fermer()

    def fermer(self):
        if self.ferme:
            return
        self.ferme = True
        try:
            self.writer.close()
        except Exception:
            pass
        self.client.sessions.pop(self.sid, None)
        self.client.bilan(self)


class Client:
    def __init__(self, args):
        self.args = args
        self.debit = args.debit * 125000
        self.trajets = []
        self.sessions = {}

    async def preparer(self):
        loop = asyncio.get_running_loop()
        sortie = adresse(self.args.sortie)
        specs = [("direct", sortie, None)]
        for via in self.args.via or []:
            specs.append(("par " + via, adresse(via), None))
        for itf in self.args.interface or []:
            specs.append(("par " + itf, sortie, itf))
        if self.args.sans_direct:
            specs = specs[1:]
        pertes = self.args.perte_test or []
        for i, (nom, destination, itf) in enumerate(specs):
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            if itf:
                lier_interface(sock, itf)
            sock.setblocking(False)
            sock.bind(("0.0.0.0", 0))
            perte = pertes[i] if i < len(pertes) else 0.0
            trajet = Trajet(self, i, nom, destination, sortie, perte)
            await loop.create_datagram_endpoint(lambda t=trajet: t, sock=sock)
            self.trajets.append(trajet)
            log.info("trajet %d : %s%s", i + 1, nom, f" (pertes simulées {perte:.0%})" if perte else "")

    def recu(self, trajet, type_, sid, corps):
        if type_ == T_PONG and len(corps) >= PING.size:
            ts, _ = PING.unpack_from(corps)
            rtt = ecart_ms(maintenant_ms(), ts)
            if 0 <= rtt < 5000:
                trajet.rtt = rtt if trajet.rtt is None else 0.8 * trajet.rtt + 0.2 * rtt
                trajet.dernier_pong = time.monotonic()
            return
        s = self.sessions.get(sid)
        if s is not None:
            s.recu(trajet, type_, corps)

    async def connexion_minecraft(self, reader, writer, cible):
        sock = writer.get_extra_info("socket")
        if sock is not None:
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        s = SessionClient(self, cible, reader, writer)
        self.sessions[s.sid] = s
        await s.lire_minecraft()

    async def boucle(self):
        dernier_ping = dernier_affichage = 0.0
        while True:
            await asyncio.sleep(TICK)
            t = time.monotonic()
            for s in list(self.sessions.values()):
                s.tick()
            if t - dernier_ping > 0.5 and self.sessions:
                dernier_ping = t
                for tr in self.trajets:
                    sid = next(iter(self.sessions))
                    tr.envoyer(paquet(T_PING, sid, PING.pack(maintenant_ms(), tr.num)))
            if t - dernier_affichage > 5 and self.sessions:
                dernier_affichage = t
                self.afficher()

    def afficher(self):
        morceaux = []
        for tr in self.trajets:
            vivant = time.monotonic() - tr.dernier_pong < 2
            rtt = f"{tr.rtt:.0f} ms" if tr.rtt is not None and vivant else "coupé"
            manques = sum(s.manques[tr.num] for s in self.sessions.values())
            uniques = sum(s.uniques for s in self.sessions.values()) or 1
            morceaux.append(f"{tr.nom} : {rtt}, pertes {100 * manques / uniques:.1f} %")
        sauves = sum(s.sauves for s in self.sessions.values())
        renvois = sum(s.emetteur.renvois for s in self.sessions.values())
        print(" | ".join(morceaux) + f" | sauvés par un autre trajet : {sauves} | renvois : {renvois}", flush=True)

    def bilan(self, s):
        if s.uniques:
            log.info("partie terminée : %d paquets reçus, %d sauvés par un autre trajet, %d renvois",
                     s.uniques, s.sauves, s.emetteur.renvois)


def lier_interface(sock, nom):
    """Force un trajet à sortir par une interface donnée (ex. le partage 4G du téléphone)."""
    if sys.platform == "darwin":
        sock.setsockopt(socket.IPPROTO_IP, 25, socket.if_nametoindex(nom))  # IP_BOUND_IF
    elif sys.platform.startswith("linux"):
        sock.setsockopt(socket.SOL_SOCKET, 25, nom.encode())  # SO_BINDTODEVICE (root)
    elif sys.platform == "win32":
        sock.setsockopt(socket.IPPROTO_IP, 31, struct.pack("!I", socket.if_nametoindex(nom)))  # IP_UNICASTIF
    else:
        raise SystemExit("--interface n'est pas géré sur ce système")


async def lancer_client(args):
    client = Client(args)
    await client.preparer()
    for port, cible in PORTS_LOCAUX.items():
        await asyncio.start_server(lambda r, w, c=cible: client.connexion_minecraft(r, w, c), "127.0.0.1", port + args.decalage)
    print(f"Rago Route prêt. Dans Minecraft, ajoute le serveur  localhost{'' if not args.decalage else ':' + str(25565 + args.decalage)}"
          f"  (Hypixel)  ou  localhost:{25566 + args.decalage}  (Minemen).", flush=True)
    await client.boucle()


def principal():
    p = argparse.ArgumentParser(description="Rago Route (prototype)")
    sous = p.add_subparsers(dest="mode", required=True)
    s = sous.add_parser("sortie", help="sur un serveur Rago")
    s.add_argument("--port", type=int, default=PORT_ROUTE)
    s.add_argument("--debit", type=float, default=50, help="débit max par joueur, en Mbit/s")
    c = sous.add_parser("client", help="sur le PC ou le Mac du joueur")
    c.add_argument("--sortie", required=True, help="adresse du serveur de sortie (ville d'entrée Cloudflare)")
    c.add_argument("--via", action="append", help="ajoute un trajet qui passe par ce serveur Rago")
    c.add_argument("--interface", action="append", help="ajoute un trajet par cette interface (ex. en5 pour le partage 4G)")
    c.add_argument("--sans-direct", action="store_true", help="n'utilise pas le trajet direct")
    c.add_argument("--debit", type=float, default=30, help="débit max par trajet, en Mbit/s")
    c.add_argument("--perte-test", type=float, action="append", help="simule des pertes sur un trajet (0.2 = 20 %%), pour tester")
    c.add_argument("--decalage", type=int, default=0, help="décale les ports locaux (si 25565 est déjà pris)")
    args = p.parse_args()
    logging.basicConfig(level=os.environ.get("RAGO_LOG", "INFO"), format="%(asctime)s %(message)s")
    try:
        asyncio.run(lancer_sortie(args) if args.mode == "sortie" else lancer_client(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    principal()
