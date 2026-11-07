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
PONG_INFOS = struct.Struct(">HHI")  # après le PING renvoyé : ping Minecraft de la sortie, retard de la sortie (ms), renvois de la sortie
FWD = struct.Struct(">4sH")         # adresse et port de la sortie
TAILLE_MAX = 1150                   # octets de jeu par paquet (tient sous la MTU, même en 4G)
FENETRE = 2048                      # paquets en vol au maximum
SONDES_MAX = 2                      # paquets renvoyés à la fois quand plus rien ne revient
CIBLES = {0: ("mc.hypixel.net", 25565), 1: ("eu.minemen.club", 25565)}
PORTS_LOCAUX = {25565: 0, 25566: 1}
if os.environ.get("RAGO_TEST_LOCAL") == "1" and os.environ.get("RAGO_CIBLE_TEST"):  # tests seulement
    _h, _p = os.environ["RAGO_CIBLE_TEST"].split(":")
    CIBLES = {0: (_h, int(_p)), 1: (_h, int(_p))}
TICK = 0.005
RETARD_FIGE = 20.0                  # ms : au-delà, le programme a été figé (on ne déclare pas de pertes ce tour-là)
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


async def ping_minecraft(hote, port, nom=None, delai=5.0):
    """Ping Minecraft (protocole status ping/pong), en ms ; None si échec."""
    async def lire_vi(r):
        n = 0
        for i in range(5):
            b = (await r.readexactly(1))[0]
            n |= (b & 0x7F) << (7 * i)
            if not b & 0x80:
                return n
        raise ValueError
    writer = None
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(hote, port), delai)
        sock = writer.get_extra_info("socket")
        if sock is not None:
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        h = (nom or hote).encode()
        p = ecrire_varint(0) + ecrire_varint(47) + ecrire_varint(len(h)) + h + struct.pack(">H", port) + ecrire_varint(1)
        writer.write(ecrire_varint(len(p)) + p + b"\x01\x00")
        await asyncio.wait_for(reader.readexactly(await asyncio.wait_for(lire_vi(reader), delai)), delai)
        p = b"\x01" + struct.pack(">q", 1)
        t0 = time.perf_counter()
        writer.write(ecrire_varint(len(p)) + p)
        await asyncio.wait_for(reader.readexactly(await asyncio.wait_for(lire_vi(reader), delai)), delai)
        return (time.perf_counter() - t0) * 1000
    except Exception:
        return None
    finally:
        if writer is not None:
            writer.close()


# --- prise UDP et horloge ------------------------------------------------------

class Prise:
    """Socket UDP lue en entier à chaque réveil.

    asyncio ne lit qu'un datagramme par tour de boucle : après un blocage du programme,
    les confirmations attendaient encore dans la file quand on décidait des renvois.
    """

    def __init__(self, sock, recevoir):
        self.sock = sock
        self.recevoir = recevoir
        for option in (socket.SO_RCVBUF, socket.SO_SNDBUF):
            try:
                sock.setsockopt(socket.SOL_SOCKET, option, 1 << 20)
            except OSError:
                pass
        sock.setblocking(False)
        asyncio.get_running_loop().add_reader(sock.fileno(), self._lire)

    def _lire(self):
        for _ in range(1000):
            try:
                data, adresse = self.sock.recvfrom(4096)
            except (BlockingIOError, InterruptedError):
                return
            except OSError:
                return  # erreur réseau remontée par le système : la suite sera lue au prochain réveil
            try:
                self.recevoir(data, adresse)
            except Exception:
                log.debug("paquet ignoré", exc_info=True)

    def sendto(self, data, adresse):
        try:
            self.sock.sendto(data, adresse)
        except OSError:
            pass  # tampon plein ou réseau coupé : le paquet sera renvoyé si besoin


class Horloge:
    """Mesure de combien le programme se réveille en retard (système chargé, mise en veille de l'app...)."""

    def __init__(self):
        self.avant = self.debut = time.monotonic()
        self.saute = False
        self.max_affiche = 0.0                 # pire retard depuis le dernier affichage (ms)
        self.courant = self.precedent = 0.0    # pire retard de la seconde en cours et de la précédente

    def battement(self):
        """À appeler à chaque tick. Renvoie (heure, figé) ; figé = le programme sort d'un blocage."""
        t = time.monotonic()
        retard = max(0.0, (t - self.avant - TICK) * 1000)
        self.avant = t
        if t - self.debut > 1.0:
            self.precedent, self.courant, self.debut = self.courant, 0.0, t
        self.courant = max(self.courant, retard)
        self.max_affiche = max(self.max_affiche, retard)
        fige = retard > RETARD_FIGE and not self.saute  # jamais deux tours de suite
        self.saute = fige
        return t, fige

    def recent(self):
        return max(self.courant, self.precedent)


# --- flux fiable sur UDP ------------------------------------------------------

class Emetteur:
    """Découpe un flux d'octets en paquets numérotés et les renvoie jusqu'à confirmation."""

    def __init__(self, envoyer, debit_octets_s):
        self.envoyer = envoyer          # fonction(bytes) qui part sur tous les trajets
        self.attente = bytearray()      # octets pas encore mis en paquets
        self.suivant = 0
        self.en_vol = {}                # numéro -> [données, dernier envoi (ms), nb envois], dans l'ordre des numéros
        self.repere = None              # heure d'envoi du paquet arrivé le plus récent (renvoyée dans les confirmations)
        self.plus_haut_premier = -1     # plus grand numéro confirmé parmi les paquets jamais renvoyés
        self.dernier_ts_mesure = None   # horodatage déjà utilisé pour mesurer l'aller-retour
        self.dernier_progres = maintenant_ms()  # dernière confirmation de nouveaux paquets (ms)
        self.dernier_sondage = self.dernier_progres  # dernier renvoi après délai (ms)
        self.srtt = None
        self.rttvar = 0.0
        self.renvois_delai = 0          # renvoyés faute de confirmation à temps
        self.renvois_rapides = 0        # renvoyés parce qu'un paquet parti après eux est déjà arrivé
        self.debit = debit_octets_s
        self.jetons = 64 * 1024
        self.dernier_tick = time.monotonic()

    @property
    def renvois(self):
        return self.renvois_delai + self.renvois_rapides

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
        base = 200.0 if self.srtt is None else max(self.srtt + 30.0, self.srtt * 1.5, self.srtt + 4 * self.rttvar)
        return min(1000.0, base * (2 ** max(0, nb - 1)))

    def _envoyer(self, num, morceau, nb):
        t = maintenant_ms()
        self.envoyer(DATA.pack(num, t) + morceau)
        self.jetons -= len(morceau) + 40
        self.en_vol[num] = [morceau, t, nb]  # un numéro déjà présent garde sa place : l'ordre reste celui des numéros

    def recu_ack(self, cumul, bits, ts_renvoye):
        confirmes = []
        for num in self.en_vol:  # rangés par numéro : on s'arrête au premier non couvert
            if num >= cumul:
                break
            confirmes.append(num)
        if bits:
            for i in range(64):
                if bits >> i & 1 and cumul + 1 + i in self.en_vol:
                    confirmes.append(cumul + 1 + i)
        if confirmes:
            self.dernier_progres = maintenant_ms()
        for num in confirmes:
            if self.en_vol.pop(num)[2] == 1:
                self.plus_haut_premier = max(self.plus_haut_premier, num)
        # l'horodatage renvoyé est celui d'un paquet qui vient d'arriver : tout ce qui est parti avant
        # lui et n'est toujours pas confirmé est sans doute perdu (y compris un paquet déjà renvoyé)
        if self.repere is None or ecart_ms(ts_renvoye, self.repere) > 0:
            self.repere = ts_renvoye
        # aller-retour : seulement la première confirmation qui renvoie un horodatage donné
        # (les copies arrivées par le trajet lent, ou renvoyées en double, rallongeraient la mesure)
        if self.dernier_ts_mesure is not None and ecart_ms(ts_renvoye, self.dernier_ts_mesure) <= 0:
            return
        self.dernier_ts_mesure = ts_renvoye
        echantillon = ecart_ms(maintenant_ms(), ts_renvoye)
        if 0 <= echantillon < 5000:
            if self.srtt is None:
                self.srtt, self.rttvar = float(echantillon), echantillon / 2
            else:
                self.rttvar = 0.75 * self.rttvar + 0.25 * abs(self.srtt - echantillon)
                self.srtt = 0.875 * self.srtt + 0.125 * echantillon

    def relancer(self):
        """Le réseau revient après une coupure : renvoie tout de suite les plus anciens paquets,
        sans attendre la fin du délai (qui peut avoir grimpé jusqu'à 1 s pendant la coupure)."""
        for num in [n for _, n in zip(range(SONDES_MAX), self.en_vol)]:
            morceau, _, nb = self.en_vol[num]
            self.renvois_delai += 1
            self._envoyer(num, morceau, nb)
        self.dernier_sondage = maintenant_ms()

    def tick(self, fige=False):
        """fige=True : le programme sort d'un blocage. On attend un tour avant de déclarer des pertes,
        le temps de lire les confirmations arrivées pendant ce temps."""
        self._recharger()
        if self.en_vol and not fige:
            now = maintenant_ms()
            srtt = self.srtt if self.srtt is not None else 200.0
            seuil_rapide = srtt + max(5.0, srtt / 4)  # marge pour l'écart entre les trajets
            base = self.rto(1)
            repere = self.repere
            # délai compté depuis l'envoi, ou depuis la dernière confirmation ou le dernier sondage
            # (comme le minuteur de TCP, RFC 6298 5.3) : une file qui se vide n'est pas une perte
            calme = min(ecart_ms(now, self.dernier_progres), ecart_ms(now, self.dernier_sondage))
            a_renvoyer = []
            sondes = 0
            for num, (_, envoi, nb) in self.en_vol.items():
                age = ecart_ms(now, envoi)
                if age > seuil_rapide and ((nb == 1 and num < self.plus_haut_premier)
                                           or (repere is not None and ecart_ms(repere, envoi) > 0)):
                    a_renvoyer.append((num, True))  # un paquet parti après lui est déjà arrivé
                elif sondes < SONDES_MAX and min(age, calme) > min(1000.0, base * (1 << (nb - 1))):
                    # rien ne revient : on ne renvoie que les plus anciens, pour sonder ; dès qu'une
                    # confirmation revient, le renvoi rapide s'occupe du reste
                    a_renvoyer.append((num, False))
                    sondes += 1
            if sondes:
                self.dernier_sondage = now
            for num, rapide in a_renvoyer:
                if self.jetons <= 0:
                    break
                morceau, _, nb = self.en_vol[num]
                if rapide:
                    self.renvois_rapides += 1
                else:
                    self.renvois_delai += 1
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
        if self.tampon:  # vide la plupart du temps : rien à signaler au-delà du cumul
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
        t = time.monotonic()
        if t - self.dernier_contact > 1.0:
            self.emetteur.relancer()  # le joueur revient après une coupure
        self.adresses[adresse] = self.dernier_contact = t
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
            # réponse : ping Minecraft vu de la sortie, pire retard récent du programme ici, renvois vers le joueur
            mesure = self.serveur.ping_cible.get(self.cible[0]) or 0
            infos = PONG_INFOS.pack(min(65535, int(mesure)), min(65535, int(self.serveur.horloge.recent())),
                                    self.emetteur.renvois & 0xFFFFFFFF)
            self.serveur.transport.sendto(paquet(T_PONG, self.sid, corps[: PING.size] + infos), adresse)
        elif type_ == T_CLOSE:
            self.fermer()

    def tick(self, fige=False):
        self.emetteur.tick(fige)
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


class Sortie:
    def __init__(self, debit):
        self.debit = debit
        self.sessions = {}
        self.relais = {}  # session -> (adresse du joueur, adresse de la sortie, dernière fois vue)
        self.transport = None  # Prise UDP
        self.ping_cible = {}  # nom du serveur de jeu -> dernier ping Minecraft mesuré depuis la sortie (ms)
        self.horloge = Horloge()

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

    async def mesurer_cibles(self):
        while True:
            for hote, port in set(CIBLES.values()):
                if any(s.cible[0] == hote for s in self.sessions.values()):
                    m = await ping_minecraft(hote, port)
                    if m is not None:
                        self.ping_cible[hote] = m
            await asyncio.sleep(5)

    async def boucle(self):
        asyncio.ensure_future(self.mesurer_cibles())
        dernier_menage = 0.0
        while True:
            await asyncio.sleep(TICK)
            t, fige = self.horloge.battement()
            for s in list(self.sessions.values()):
                s.tick(fige)
            if t - dernier_menage > 1.0:
                dernier_menage = t
                for sid in [k for k, v in self.relais.items() if t - v[2] > SESSION_MAX_SILENCE]:
                    del self.relais[sid]


async def lancer_sortie(args):
    proto = Sortie(args.debit * 125000)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", args.port))
    proto.transport = Prise(sock, proto.datagram_received)
    log.info("Rago Route : sortie et relais à l'écoute sur le port UDP %d", args.port)
    await proto.boucle()


# --- client (sur le PC ou le Mac du joueur) ----------------------------------

_COUPURE = None
if os.environ.get("RAGO_TEST_LOCAL") == "1" and os.environ.get("RAGO_COUPURE_TEST"):  # tests seulement
    _d, _l = map(float, os.environ["RAGO_COUPURE_TEST"].split(","))
    _COUPURE = (time.monotonic() + _d, time.monotonic() + _d + _l)


def coupe():
    return _COUPURE is not None and _COUPURE[0] <= time.monotonic() < _COUPURE[1]


class Trajet:
    def __init__(self, client, num, nom, destination, sortie, perte_test):
        self.client = client
        self.num = num
        self.nom = nom
        self.destination = destination   # là où on envoie (sortie ou relais)
        self.sortie = sortie             # sortie finale
        self.passe_par_relais = destination != sortie
        self.perte_test = perte_test
        self.transport = None            # Prise UDP
        self.rtt = None
        self.dernier_pong = 0.0
        self.recus = 0

    def envoyer(self, p):
        if self.transport is None:
            return
        if (self.perte_test and random.random() < self.perte_test) or coupe():
            return
        if self.passe_par_relais:
            p = paquet(T_FWD, bytes(16), FWD.pack(socket.inet_aton(self.sortie[0]), self.sortie[1]) + p)
        self.transport.sendto(p, self.destination)  # réseau coupé sur ce trajet : les autres prennent le relais

    def datagram_received(self, data, adresse):
        if (self.perte_test and random.random() < self.perte_test) or coupe():
            return
        lu = lire_entete(data)
        if lu is not None:
            self.client.recu(self, *lu)


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
        self.chemins_par_num = {}  # numéro de paquet reçu -> trajets qui l'ont apporté (fenêtre récente, par ordre d'arrivée)
        self.dernier_compte = 0.0
        self.sauves = 0
        self.manques = [0] * len(client.trajets)
        self.uniques = 0
        self.renvois_sortie = 0    # renvois de la sortie vers ce joueur, annoncés dans ses réponses au ping

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
                log.debug("tunnel ouvert vers %s", CIBLES[self.cible][0])
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
        """Toutes les 100 ms : pour les paquets arrivés il y a plus d'1 s, regarde par quels trajets ils sont venus."""
        t = time.monotonic()
        if t - self.dernier_compte < 0.1:
            return
        self.dernier_compte = t
        vieux = []
        for num, (_, vu) in self.chemins_par_num.items():  # rangés par heure d'arrivée
            if t - vu <= 1.0:
                break
            vieux.append(num)
        if not vieux:
            return
        meilleur = self.client.meilleur_trajet()
        for num in vieux:
            masque = self.chemins_par_num.pop(num)[0]
            self.uniques += 1
            for tr in self.client.trajets:
                if not masque >> tr.num & 1:
                    self.manques[tr.num] += 1
            if meilleur is not None and not masque >> meilleur.num & 1:
                self.sauves += 1  # perdu par le meilleur trajet, rattrapé par un autre

    def tick(self, fige=False):
        if not self.ouverte:
            if time.monotonic() - self.dernier_open > 0.2:
                self.dernier_open = time.monotonic()
                self.envoyer(T_OPEN, bytes([self.cible]))
            return
        self.emetteur.tick(fige)
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
        self.ping_sortie = None       # ping Minecraft mesuré par la sortie elle-même
        self.comparaison = None       # (par le tunnel, direct) en ms
        self.horloge = Horloge()      # retard du programme ici
        self.retard_sortie_max = 0.0  # pire retard du programme sur la sortie, depuis le dernier affichage (ms)

    def meilleur_trajet(self):
        vivants = [t for t in self.trajets if t.rtt is not None and time.monotonic() - t.dernier_pong < 2]
        return min(vivants, key=lambda t: t.rtt) if vivants else None

    async def comparer(self):
        """Toutes les 15 s pendant une partie : ping Minecraft par le tunnel et en direct, au même moment."""
        while True:
            await asyncio.sleep(15)
            if not any(s.uniques > 50 for s in self.sessions.values()):
                continue
            hote, port = CIBLES[0]
            local = 25565 + self.args.decalage
            tunnel, direct = await asyncio.gather(ping_minecraft("127.0.0.1", local, nom=hote),
                                                  ping_minecraft(hote, port))
            self.comparaison = (tunnel, direct)

    async def preparer(self):
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
            trajet.transport = Prise(sock, trajet.datagram_received)
            self.trajets.append(trajet)
            log.info("trajet %d : %s%s", i + 1, nom, f" (pertes simulées {perte:.0%})" if perte else "")

    def recu(self, trajet, type_, sid, corps):
        if type_ == T_PONG and len(corps) >= PING.size:
            ts, _ = PING.unpack_from(corps)
            if len(corps) >= PING.size + 2:
                self.ping_sortie = struct.unpack_from(">H", corps, PING.size)[0] or None
            if len(corps) >= PING.size + PONG_INFOS.size:
                _, retard, renvois = PONG_INFOS.unpack_from(corps, PING.size)
                self.retard_sortie_max = max(self.retard_sortie_max, retard)
                s = self.sessions.get(sid)
                if s is not None:
                    s.renvois_sortie = renvois
            rtt = ecart_ms(maintenant_ms(), ts)
            if 0 <= rtt < 5000:
                tout_coupe = self.meilleur_trajet() is None
                trajet.rtt = rtt if trajet.rtt is None else 0.8 * trajet.rtt + 0.2 * rtt
                trajet.dernier_pong = time.monotonic()
                if tout_coupe:  # le réseau revient après une coupure
                    for s in self.sessions.values():
                        s.emetteur.relancer()
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
        if not self.args.sans_comparer:
            asyncio.ensure_future(self.comparer())
        while True:
            await asyncio.sleep(TICK)
            t, fige = self.horloge.battement()
            for s in list(self.sessions.values()):
                s.tick(fige)
            if t - dernier_ping > 0.5 and self.sessions:
                dernier_ping = t
                sid = max(self.sessions.values(), key=lambda s: s.uniques).sid  # la partie en cours
                for tr in self.trajets:
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
        renvois_sortie = sum(s.renvois_sortie for s in self.sessions.values())
        print(" | ".join(morceaux) + f" | sauvés par un autre trajet : {sauves}"
              f" | renvois : d'ici {renvois}, de la sortie {renvois_sortie}", flush=True)
        details = []
        if self.ping_sortie:
            details.append(f"sortie -> Hypixel : {self.ping_sortie} ms")
        if self.comparaison:
            tunnel, direct = self.comparaison
            f = lambda v: f"{v:.0f} ms" if v is not None else "échec"
            details.append(f"ping Minecraft au même moment : Rago Route {f(tunnel)} | direct {f(direct)}")
        details.append(f"retard du programme : ici {self.horloge.max_affiche:.0f} ms, sortie {self.retard_sortie_max:.0f} ms (max)")
        self.horloge.max_affiche = self.retard_sortie_max = 0.0
        print("   " + " | ".join(details), flush=True)

    def bilan(self, s):
        if s.uniques >= 100:
            e = s.emetteur
            log.info("partie terminée : %d paquets reçus, %d sauvés par un autre trajet, "
                     "renvois d'ici %d (%d après délai, %d rapides), de la sortie %d",
                     s.uniques, s.sauves, e.renvois, e.renvois_delai, e.renvois_rapides, s.renvois_sortie)


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


_ACTIVITE_MAC = None


def garder_eveille_mac():
    """Sur Mac, demande au système de ne pas ralentir Rago Route quand le Terminal passe derrière
    Minecraft (App Nap, minuteries regroupées). Même appel que le module appnope d'IPython :
    [[NSProcessInfo processInfo] beginActivityWithOptions:... reason:...]."""
    global _ACTIVITE_MAC
    if sys.platform != "darwin":
        return False
    try:
        import ctypes
        import ctypes.util
        objc = ctypes.cdll.LoadLibrary(ctypes.util.find_library("objc"))
        ctypes.cdll.LoadLibrary(ctypes.util.find_library("Foundation"))
        vp = ctypes.c_void_p
        objc.objc_getClass.restype = vp
        objc.objc_getClass.argtypes = [ctypes.c_char_p]
        objc.sel_registerName.restype = vp
        objc.sel_registerName.argtypes = [ctypes.c_char_p]
        msg = objc.objc_msgSend
        msg.restype = vp
        msg.argtypes = [vp, vp]
        info = msg(objc.objc_getClass(b"NSProcessInfo"), objc.sel_registerName(b"processInfo"))
        msg.argtypes = [vp, vp, ctypes.c_char_p]
        raison = msg(objc.objc_getClass(b"NSString"), objc.sel_registerName(b"stringWithUTF8String:"), b"Rago Route")
        msg.argtypes = [vp, vp, ctypes.c_uint64, vp]
        # NSActivityUserInitiatedAllowingIdleSystemSleep | NSActivityLatencyCritical
        activite = msg(info, objc.sel_registerName(b"beginActivityWithOptions:reason:"), 0x00EFFFFF | 0xFF00000000, raison)
        if not activite:
            return False
        msg.argtypes = [vp, vp]
        msg(activite, objc.sel_registerName(b"retain"))  # l'activité dure tant que le programme tourne
        _ACTIVITE_MAC = activite
        return True
    except Exception:
        return False


async def lancer_client(args):
    client = Client(args)
    if not args.sans_anti_veille and garder_eveille_mac():
        print("Mac : Rago Route ne sera pas ralenti quand le Terminal est en arrière-plan.", flush=True)
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
    c.add_argument("--sans-comparer", action="store_true", help="ne mesure pas le ping direct pendant la partie")
    c.add_argument("--sans-anti-veille", action="store_true", help="Mac : laisse le système ralentir le programme en arrière-plan")
    args = p.parse_args()
    logging.basicConfig(level=os.environ.get("RAGO_LOG", "INFO"), format="%(asctime)s %(message)s")
    if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # Prise a besoin de add_reader
    try:
        asyncio.run(lancer_sortie(args) if args.mode == "sortie" else lancer_client(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    principal()
