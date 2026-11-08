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
paquet (handshake).

Accès (08/11) : la sortie n'ouvre une session qu'avec un jeton Rago Route valable, signé
par le serveur de licences pour les comptes Premium (6 h), vérifié ici avec sa clé publique.
Le relais ne fait suivre que vers les sorties Rago.

Modes :
  python3 rago-route.py sortie                       (sur un serveur Rago, port UDP 25600)
  python3 rago-route.py client --sortie IP [--via IP] [--interface en5] [--telephone] [--jeton JETON]

Aucune dépendance : Python 3.8+ seulement.
"""
import argparse
import asyncio
import base64
import hashlib
import ipaddress
import json
import logging
import os
import random
import secrets
import socket
import struct
import sys
import time
import urllib.request

VERSION = 1
MAGIC = b"RR"
PORT_ROUTE = 25600
T_OPEN, T_OPEN_OK, T_DATA, T_ACK, T_PING, T_PONG, T_CLOSE, T_FWD, T_REFUS = range(1, 10)  # REFUS : jeton refusé (08/11)
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
# Accès (08/11) : clés publiques du serveur de licences (production et test) et sorties vers lesquelles un relais
# fait suivre. Les clés sont relues toutes les heures et gardées sur le disque si le serveur ne répond pas.
CLES_URLS = ["https://account.rago-optimizer.com/api/v1/public-key?format=pem",
             "https://rago-staging.up.railway.app/api/v1/public-key?format=pem"]
SORTIES_RAGO = {"217.69.12.94"}  # Paris
SESSIONS_PAR_LICENCE = 8         # connexions du jeu ouvertes à la fois avec la même licence
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


# --- handshake Minecraft ---------------------------------------------------------

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


async def ping_minecraft(hote, port, nom=None, delai=5.0, interface=None):
    """Ping Minecraft (protocole status ping/pong), en ms ; None si échec. interface : force la sortie par cette interface."""
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
        if interface:
            loop = asyncio.get_running_loop()
            infos = await loop.getaddrinfo(hote, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                lier_interface(s, interface)
                s.setblocking(False)
                await asyncio.wait_for(loop.sock_connect(s, infos[0][4]), delai)
            except BaseException:
                s.close()
                raise
            reader, writer = await asyncio.open_connection(sock=s)
        else:
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


# --- jetons Rago Route (Ed25519) ------------------------------------------------

# Vérification Ed25519 (RFC 8032, section 6) en Python pur, pour un serveur sans la bibliothèque cryptography.
# Seulement à l'ouverture d'une session, jamais par paquet.
_P = 2 ** 255 - 19
_Q = 2 ** 252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, _P - 2, _P) % _P
_RACINE_M1 = pow(2, (_P - 1) // 4, _P)


def _ed_add(a, b):
    x = (a[1] - a[0]) * (b[1] - b[0]) % _P
    y = (a[1] + a[0]) * (b[1] + b[0]) % _P
    c = 2 * a[3] * b[3] * _D % _P
    d = 2 * a[2] * b[2] % _P
    e, f, g, h = y - x, d - c, d + c, y + x
    return (e * f % _P, g * h % _P, f * g % _P, e * h % _P)


def _ed_mul(n, pt):
    r = (0, 1, 1, 0)
    while n:
        if n & 1:
            r = _ed_add(r, pt)
        pt = _ed_add(pt, pt)
        n >>= 1
    return r


def _ed_x(y, signe):
    if y >= _P:
        return None
    x2 = (y * y - 1) * pow(_D * y * y + 1, _P - 2, _P) % _P
    if x2 == 0:
        return None if signe else 0
    x = pow(x2, (_P + 3) // 8, _P)
    if (x * x - x2) % _P:
        x = x * _RACINE_M1 % _P
    if (x * x - x2) % _P:
        return None
    return _P - x if (x & 1) != signe else x


def _ed_point(b):
    y = int.from_bytes(b, "little")
    signe, y = y >> 255, y & ((1 << 255) - 1)
    x = _ed_x(y, signe)
    return None if x is None else (x, y, 1, x * y % _P)


_ED_Y = 4 * pow(5, _P - 2, _P) % _P
_ED_G = (_ed_x(_ED_Y, 0), _ED_Y, 1, _ed_x(_ED_Y, 0) * _ED_Y % _P)


def _ed_egaux(a, b):
    return (a[0] * b[2] - b[0] * a[2]) % _P == 0 and (a[1] * b[2] - b[1] * a[2]) % _P == 0


def ed25519_valide(cle, message, signature):
    """cle : 32 octets bruts ; signature : 64 octets."""
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        from cryptography.exceptions import InvalidSignature
        try:
            Ed25519PublicKey.from_public_bytes(cle).verify(signature, message)
            return True
        except InvalidSignature:
            return False
    except ImportError:
        pass
    if len(cle) != 32 or len(signature) != 64:
        return False
    a, r = _ed_point(cle), _ed_point(signature[:32])
    s = int.from_bytes(signature[32:], "little")
    if a is None or r is None or s >= _Q:
        return False
    h = int.from_bytes(hashlib.sha512(signature[:32] + cle + message).digest(), "little") % _Q
    return _ed_egaux(_ed_mul(s, _ED_G), _ed_add(r, _ed_mul(h, a)))


def cle_depuis_pem(pem):
    """Clé publique Ed25519 (PEM SPKI du serveur de licences) -> 32 octets bruts."""
    lignes = [l for l in pem.strip().splitlines() if l and not l.startswith("-----")]
    der = base64.b64decode("".join(lignes))
    if len(der) != 44 or not der.startswith(bytes.fromhex("302a300506032b6570032100")):
        raise ValueError("pas une clé publique Ed25519")
    return der[12:]


def _b64url(texte):
    return base64.urlsafe_b64decode(texte + "=" * (-len(texte) % 4))


class Cles:
    """Clés publiques du serveur de licences, relues toutes les heures, gardées dans un fichier."""

    def __init__(self, urls, fichier):
        self.urls = urls
        self.fichier = fichier
        self.cles = []
        self.vus = {}  # jeton -> (licence, expiration) déjà vérifiés : un OPEN arrive par chaque trajet
        try:
            with open(fichier) as f:
                self.cles = [bytes.fromhex(c) for c in json.load(f)]
        except (OSError, ValueError):
            pass

    def _lire(self):
        cles = []
        for url in self.urls:
            try:
                with urllib.request.urlopen(url, timeout=10) as r:
                    cles.append(cle_depuis_pem(r.read().decode()))
            except Exception as e:
                log.warning("clé publique illisible (%s) : %s", url, e)
        return cles

    async def tenir_a_jour(self):
        while True:
            cles = await asyncio.get_running_loop().run_in_executor(None, self._lire)
            if cles:
                nouvelles = set(cles) | (set(self.cles) if len(cles) < len(self.urls) else set())
                log.info("clés publiques du serveur de licences : %d", len(nouvelles))
                self.cles = sorted(nouvelles)
                try:
                    os.makedirs(os.path.dirname(self.fichier) or ".", exist_ok=True)
                    with open(self.fichier, "w") as f:
                        json.dump([c.hex() for c in self.cles], f)
                except OSError:
                    pass
            await asyncio.sleep(3600)

    def licence(self, jeton):
        """Licence d'un jeton Rago Route valable (signé, type « route », pas expiré), sinon None."""
        t = time.time()
        vu = self.vus.get(jeton)
        if vu is not None:
            return vu[0] if vu[1] > t else None
        try:
            tete, corps, sig = jeton.split(".")
            entete = json.loads(_b64url(tete))
            donnees = json.loads(_b64url(corps))
            signature = _b64url(sig)
        except (ValueError, UnicodeDecodeError):
            return None
        if entete.get("alg") != "EdDSA" or donnees.get("typ") != "route" or not isinstance(donnees.get("lic"), str):
            return None
        if not isinstance(donnees.get("exp"), (int, float)) or donnees["exp"] <= t:
            return None
        message = f"{tete}.{corps}".encode()
        if not any(ed25519_valide(c, message, signature) for c in self.cles):
            return None
        if len(self.vus) > 10000:
            self.vus = {k: v for k, v in self.vus.items() if v[1] > t}
        self.vus[jeton] = (donnees["lic"], donnees["exp"])
        return donnees["lic"]


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
    def __init__(self, serveur, sid, cible, licence=None):
        self.serveur = serveur
        self.sid = sid
        self.licence = licence
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
    def __init__(self, debit, cles=None, sorties=None):
        self.debit = debit
        self.cles = cles          # None : sans contrôle d'accès (tests seulement)
        self.sorties = sorties    # adresses vers lesquelles le relais fait suivre ; None : toutes (tests)
        self.refus = {}           # adresse -> (vérifications, début de la seconde) : limite le coût des faux jetons
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
            if self.sorties is not None and ip not in self.sorties:
                return  # seulement vers les sorties Rago
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
            licence = None
            if self.cles is not None:
                licence = self._verifier(corps[1:], adresse)
                if licence is None:
                    self.transport.sendto(paquet(T_REFUS, sid), adresse)
                    return
                if sum(1 for x in self.sessions.values() if x.licence == licence) >= SESSIONS_PAR_LICENCE:
                    log.info("licence %s : trop de sessions à la fois", licence[-6:])
                    self.transport.sendto(paquet(T_REFUS, sid), adresse)
                    return
            session = self.sessions[sid] = SessionSortie(self, sid, corps[0], licence)
            log.info("nouvelle session %s vers %s", sid.hex()[:8], session.cible[0])
        session.recu(type_, corps, adresse)

    def _verifier(self, brut, adresse):
        """Licence du jeton de l'OPEN, ou None. Au plus 50 vérifications par seconde et par adresse (un relais en porte plusieurs joueurs)."""
        try:
            jeton = brut.decode("ascii")
        except UnicodeDecodeError:
            return None
        if not jeton or len(jeton) > 1000:
            return None
        if jeton not in self.cles.vus:
            t = time.monotonic()
            n, debut = self.refus.get(adresse[0], (0, t))
            if t - debut > 1.0:
                n, debut = 0, t
            if n >= 50:
                return None
            self.refus[adresse[0]] = (n + 1, debut)
            if len(self.refus) > 10000:
                self.refus.clear()
        return self.cles.licence(jeton)

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
        if self.cles is not None:
            asyncio.ensure_future(self.cles.tenir_a_jour())
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
    if args.sans_jeton and os.environ.get("RAGO_TEST_LOCAL") != "1":
        raise SystemExit("--sans-jeton ne sert qu'aux tests (RAGO_TEST_LOCAL=1)")
    cles = None if args.sans_jeton else Cles(args.cle_url or CLES_URLS, args.fichier_cles)
    sorties = None if os.environ.get("RAGO_TEST_LOCAL") == "1" and not args.sortie_rago else set(args.sortie_rago or SORTIES_RAGO)
    proto = Sortie(args.debit * 125000, cles, sorties)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", args.port))
    proto.transport = Prise(sock, proto.datagram_received)
    log.info("Rago Route : sortie et relais à l'écoute sur le port UDP %d", args.port)
    await proto.boucle()


# --- client (sur le PC ou le Mac du joueur) ----------------------------------

_COUPURE = None
if os.environ.get("RAGO_TEST_LOCAL") == "1" and os.environ.get("RAGO_COUPURE_TEST"):  # tests seulement
    # "début,durée" coupe tous les trajets ; "début,durée,0+1" seulement les trajets 1 et 2
    _d, _l, *_t = os.environ["RAGO_COUPURE_TEST"].split(",")
    _COUPURE = (time.monotonic() + float(_d), time.monotonic() + float(_d) + float(_l),
                {int(x) for x in _t[0].split("+")} if _t else None)


def coupe(num=None):
    if _COUPURE is None or not _COUPURE[0] <= time.monotonic() < _COUPURE[1]:
        return False
    return _COUPURE[2] is None or num is None or num in _COUPURE[2]




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
        self.premiers = 0                # paquets arrivés par ce trajet avant les autres (toute la partie)
        self.premiers_fenetre = 0        # idem depuis le dernier affichage
        self.octets = 0                  # octets reçus par ce trajet (data consommée, utile pour la 4G)

    def envoyer(self, p):
        if self.transport is None:
            return
        if (self.perte_test and random.random() < self.perte_test) or coupe(self.num):
            return
        if self.passe_par_relais:
            p = paquet(T_FWD, bytes(16), FWD.pack(socket.inet_aton(self.sortie[0]), self.sortie[1]) + p)
        self.transport.sendto(p, self.destination)  # réseau coupé sur ce trajet : les autres prennent le relais

    def datagram_received(self, data, adresse):
        if (self.perte_test and random.random() < self.perte_test) or coupe(self.num):
            return
        self.octets += len(data)
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
                trajet.premiers += 1
                trajet.premiers_fenetre += 1
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
        elif type_ == T_REFUS and not self.ouverte and not self.ferme:
            log.error("La sortie refuse l'accès : il faut un jeton Rago Route valable (--jeton, compte Premium, 6 h).")
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
                self.envoyer(T_OPEN, bytes([self.cible]) + (self.client.args.jeton or "").encode())
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
        self.principale = None        # --telephone : interface du Wi-Fi ou du câble, imposée aux trajets non 4G

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
                                                  ping_minecraft(hote, port, interface=self.principale))
            self.comparaison = (tunnel, direct)

    async def preparer(self):
        sortie = adresse(self.args.sortie)
        tel = None
        if self.args.telephone:
            tel, self.principale = preparer_telephone(sortie[0])
        specs = [("direct", sortie, self.principale)]
        for via in self.args.via or []:
            specs.append(("par " + via, adresse(via), self.principale))
        for itf in self.args.interface or []:
            specs.append(("par " + itf, sortie, itf))
        if tel:
            specs.append((f"4G du téléphone ({tel})", sortie, tel))
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
        fenetre = sum(tr.premiers_fenetre for tr in self.trajets) or 1
        for tr in self.trajets:
            vivant = time.monotonic() - tr.dernier_pong < 2
            rtt = f"{tr.rtt:.0f} ms" if tr.rtt is not None and vivant else "coupé"
            manques = sum(s.manques[tr.num] for s in self.sessions.values())
            uniques = sum(s.uniques for s in self.sessions.values()) or 1
            morceaux.append(f"{tr.nom} : {rtt}, pertes {100 * manques / uniques:.1f} %, arrivé premier {100 * tr.premiers_fenetre / fenetre:.0f} %, {tr.octets / 1e6:.1f} Mo reçus")
            tr.premiers_fenetre = 0
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
            total = sum(tr.premiers for tr in self.trajets) or 1
            log.info("arrivés en premier depuis le lancement : %s", ", ".join(f"{tr.nom} {100 * tr.premiers / total:.0f} %" for tr in self.trajets))
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


def _commande(*cmd, delai=15):
    """Lance une commande du système et rend sa sortie (texte vide si elle échoue)."""
    import subprocess
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=delai)
        return r.stdout if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def ports_reseau(texte):
    """Lit `networksetup -listallhardwareports` : [(nom du port, interface), ...]."""
    ports, nom = [], None
    for ligne in texte.splitlines():
        if ligne.startswith("Hardware Port:"):
            nom = ligne.split(":", 1)[1].strip()
        elif ligne.startswith("Device:") and nom:
            ports.append((nom, ligne.split(":", 1)[1].strip()))
            nom = None
    return ports


def interface_de_route(texte):
    """Lit `route -n get IP` : l'interface par laquelle le Mac envoie vers cette adresse."""
    for ligne in texte.splitlines():
        ligne = ligne.strip()
        if ligne.startswith("interface:"):
            return ligne.split(":", 1)[1].strip()
    return None


def ping_moyen(texte):
    """Lit la sortie de `ping` (Mac ou Linux) : temps moyen en ms, ou None."""
    for ligne in texte.splitlines():
        if "min/avg/max" in ligne and "=" in ligne:
            try:
                return float(ligne.split("=", 1)[1].strip().split("/")[1])
            except (IndexError, ValueError):
                return None
    return None


def preparer_telephone(ip_sortie):
    """--telephone (Mac) : trouve l'iPhone branché en USB, vérifie qu'il partage sa 4G et qu'elle atteint la sortie,
    et garde le Wi-Fi ou le câble pour les autres trajets, même si le Mac a pris l'iPhone comme connexion principale.
    Rend (interface de l'iPhone, interface du Wi-Fi ou du câble)."""
    if sys.platform != "darwin":
        raise SystemExit("--telephone ne marche que sur Mac pour l'instant. Ailleurs, utilise --interface avec le nom de l'interface 4G.")
    ports = ports_reseau(_commande("networksetup", "-listallhardwareports"))
    telephones = [d for n, d in ports if "iphone" in n.lower() or "ipad" in n.lower()]
    def actif(d):  # adresse IPv4 de l'interface, vide si elle n'est pas connectée (169.254 = pas de réseau)
        ip = _commande("ipconfig", "getifaddr", d).strip()
        return "" if ip.startswith("169.254.") else ip
    tel = next((d for d in telephones if actif(d)), None)
    if not tel:
        etat = ""
        for d in telephones:  # pour le diagnostic : l'état de l'interface vu par le Mac
            lignes = [l.strip() for l in _commande("ifconfig", d).splitlines() if l.strip().startswith(("status:", "inet "))]
            etat += f"\n  ({d} : {', '.join(lignes) or 'interface absente'})"
        raise SystemExit(
            "Téléphone : " + ("l'iPhone est vu par le Mac mais n'a pas d'adresse : il ne partage pas encore sa connexion." if telephones else "aucun iPhone branché en USB.") + etat + "\n"
            "  1. Sur l'iPhone : Réglages > Partage de connexion > active « Autoriser d'autres utilisateurs » (garde cet écran ouvert).\n"
            "  2. Branche l'iPhone au Mac avec le câble USB et déverrouille-le. La question « Faire confiance à cet ordinateur ? » s'affiche sur l'iPhone, pas sur le Mac.\n"
            "  3. Sur le Mac : Réglages Système > Réseau. « iPhone USB » doit être « Connecté ». S'il n'y est pas : menu « … » > Ajouter un service > iPhone USB.\n"
            "  4. Attends 10 secondes, puis relance la même commande.")
    print(f"Téléphone : iPhone trouvé ({tel}, adresse {actif(tel)}).", flush=True)
    route = interface_de_route(_commande("route", "-n", "get", ip_sortie))
    if route and route != tel:
        principale = route
    else:
        # Le Mac envoie tout par l'iPhone : les autres trajets sont forcés sur le câble ou le Wi-Fi.
        autres = [(n, d) for n, d in ports if d not in telephones and actif(d)]
        autres.sort(key=lambda nd: "wi-fi" in nd[0].lower())  # le câble d'abord, puis le Wi-Fi
        if not autres:
            raise SystemExit("Téléphone : ni Wi-Fi ni câble connecté. Rago Route a besoin de ta connexion habituelle en plus de la 4G.")
        principale = autres[0][1]
        print("Téléphone : le Mac passait par l'iPhone ; les trajets habituels sont gardés sur ta connexion habituelle.", flush=True)
    nom = next((n for n, d in ports if d == principale), principale)
    print(f"Connexion habituelle : {nom}{'' if principale in nom else f' ({principale})'}.", flush=True)
    print("Téléphone : je vérifie que la 4G atteint le serveur Rago…", flush=True)
    ms = ping_moyen(_commande("ping", "-c", "4", "-t", "8", "-b", tel, ip_sortie, delai=12))
    if ms is None:
        print("Téléphone : pas de réponse au ping par la 4G (le réseau mobile bloque peut-être le ping). Je lance quand même : "
              "regarde la ligne « 4G du téléphone » ci-dessous.", flush=True)
    else:
        print(f"Téléphone : la 4G atteint le serveur Rago en {ms:.0f} ms. Elle reçoit une copie de tout : regarde ses « Mo reçus ».", flush=True)
    return tel, principale


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
    client.horloge = Horloge()  # la préparation (ping de la 4G) bloque quelques secondes : ne pas la compter comme un retard
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
    s.add_argument("--cle-url", action="append", help="adresse d'une clé publique du serveur de licences (remplace celles par défaut)")
    s.add_argument("--fichier-cles", default="/var/lib/rago-route/cles.json", help="copie des clés publiques, si le serveur de licences ne répond pas")
    s.add_argument("--sortie-rago", action="append", help="relais : sortie Rago vers laquelle faire suivre (remplace la liste par défaut)")
    s.add_argument("--sans-jeton", action="store_true", help="tests seulement : accepte les sessions sans jeton")
    c = sous.add_parser("client", help="sur le PC ou le Mac du joueur")
    c.add_argument("--sortie", required=True, help="adresse du serveur de sortie (ville d'entrée Cloudflare)")
    c.add_argument("--via", action="append", help="ajoute un trajet qui passe par ce serveur Rago")
    c.add_argument("--interface", action="append", help="ajoute un trajet par cette interface (ex. en5 pour le partage 4G)")
    c.add_argument("--telephone", action="store_true", help="Mac : ajoute la 4G de l'iPhone branché en USB comme trajet de secours (trouvée et vérifiée toute seule)")
    c.add_argument("--sans-direct", action="store_true", help="n'utilise pas le trajet direct")
    c.add_argument("--debit", type=float, default=30, help="débit max par trajet, en Mbit/s")
    c.add_argument("--perte-test", type=float, action="append", help="simule des pertes sur un trajet (0.2 = 20 %%), pour tester")
    c.add_argument("--decalage", type=int, default=0, help="décale les ports locaux (si 25565 est déjà pris)")
    c.add_argument("--sans-comparer", action="store_true", help="ne mesure pas le ping direct pendant la partie")
    c.add_argument("--sans-anti-veille", action="store_true", help="Mac : laisse le système ralentir le programme en arrière-plan")
    c.add_argument("--jeton", help="jeton Rago Route d'un compte Premium (bouton « Copier un jeton » de l'exe de test, valable 6 h)")
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
