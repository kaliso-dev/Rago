---
type: code
tags: [code, app, react, page, reseau]
fichier: app/src/pages/NetTest.tsx
lignes: 419
maj: 2026-11-10
---
# NetTest.tsx

L'onglet **« Test réseau »** de la page Réseau : ping, gigue, pertes et pics vers des serveurs de jeu, avec la courbe de chaque essai, plus un **diagnostic avancé** vers un serveur au choix. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Test réseau]]. Côté Rust : [[nettest.rs]], [[netshare.rs]], [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `nettest`. La page Réseau a quatre onglets : `network` (réglages), `netopt` ([[NetOpt.tsx]]), `nettest` (celui-ci) et `route` ([[RouteTab.tsx]]).
- **Gratuit** : le test et le diagnostic marchent sans licence. Le moteur ne demande une licence que pour **appliquer** le Packet Optimizer (`premium_required:netopt` dans [[lib.rs]]). Les mesures du diagnostic (`quality`, `loaded`, `mtu`) n'en demandent pas.
- **Rien n'est changé sur le PC** (texte `net.lead`).

## Ce que le fichier expose
- `NetTest()` : l'onglet.
- Composants internes :
  - `Stat` : un chiffre avec son libellé ;
  - `Chart` : la courbe en barres ;
  - `Diagnostic` : la carte du bas.
- Fonctions internes : `grade(m)`, `partial(id, essais)`, `bars(ping)`, `load(clé)`, `save(clé)`.
- Constantes internes : `GROUPS`, `ALL`, `slots(id)`, `DIAG`.

## Fonctionnement détaillé

### Serveurs mesurés (`GROUPS`)
Mêmes identifiants que `TARGETS` dans [[nettest.rs]] :

| Groupe | Serveurs (code de la pastille) |
|---|---|
| Minecraft | `hypixel` (MC), `minemen` (MC) |
| Régions des serveurs de jeu | `paris` (FR), `frankfurt` (DE), `london` (UK), `madrid` (ES), `stockholm` (SE), `virginia` (US) |
| Internet | `internet` (CF, le serveur Cloudflare le plus proche) |

- **8 essais** pour les deux serveurs Minecraft (même ping que la liste des serveurs du jeu), **40** pour les autres (`slots`).
- Un serveur introuvable (erreur `dns` : pas de réseau, serveur renommé) **disparaît** de la liste au lieu d'afficher une erreur.

### Déroulement d'un test
1. `api.netTest(ids)` (commande `net_test`). Le moteur mesure tous les serveurs demandés **en même temps**.
2. Chaque essai arrive par l'événement **`nettest:sample`** (`{ id, i, n, ms }`, `ms = null` si perdu). La courbe se remplit en direct, et les chiffres affichés sont recalculés à partir des essais reçus (`partial`).
3. Chaque serveur fini arrive par **`nettest:measure`**. Son résultat (moyenne, meilleur, pire, gigue, pertes, pics, méthode, série) remplace les chiffres partiels.
4. À la fin, le moteur envoie les résultats au serveur Rago ([[netshare.rs]]). Le texte de l'onglet le dit : « Les résultats partent chez Rago avec ta ville et ton fournisseur d'accès, jamais ton adresse IP, pour choisir où installer nos futurs serveurs. ». La page n'envoie rien elle-même.
5. Le résultat est gardé dans `rago.netLast` (`{ at, results }`).

- **Première visite** (rien dans `rago.netLast`) : le test de tous les serveurs se lance tout seul.

### Carte « Ta connexion » (le serveur choisi)
- **Badge** de méthode :
  - « Ping Minecraft » (`mc`) ;
  - « Connexion TCP » (`tcp`) ;
  - « Ping ICMP » (`icmp`).
- **Verdict** (`grade`), qui colore le globe et le ping moyen :
  - **instable** si pas de réponse, pertes ≥ 2 % ou gigue > 15 ms ;
  - **excellente** si ping ≤ 40 ms, gigue ≤ 5 ms et 0 perte ;
  - **bonne** si ping ≤ 80 ms et gigue ≤ 10 ms ;
  - sinon **« Ping élevé »**.
- Sous le verdict : le nom du serveur et « testé il y a 5 minutes », ou « 12/40 » pendant la mesure.
- **Courbe** (`Chart`) : une barre par essai.
  - Barre grise en attente, rouge si perdu.
  - Jaune si c'est un **pic** : au moins 4 essais et une valeur > médiane + max(15, médiane / 2). C'est la même règle que [[nettest.rs]].
  - Une ligne marque la moyenne. L'échelle va jusqu'au plus haut essai, ou au moins 1,6 × la moyenne.
- **Chiffres** : Meilleur, Pire (en orange s'il dépasse le double de la moyenne et la moyenne + 20 ms), Gigue (orange au-delà de 10 ms), Perdus (« 1/40 » et le pourcentage), Pics (orange à partir de 3).
- **Boutons** : « Tester {serveur} » et « Tout tester ». Les deux sont grisés pendant une mesure.
- **Conseil** : en cas de gigue au-dessus de 10 ms ou de pertes, un bandeau propose un câble plutôt que le Wi-Fi, puis le Packet Optimizer. Un clic ouvre l'onglet `netopt`.

### Carte « Serveurs »
- Une ligne par serveur, choisie comme un bouton radio. Elle montre :
  - la pastille du code ;
  - le nom et la description ;
  - « 2 perdus » s'il y a des pertes ;
  - 4 barres de signal (4 sous 30 ms, 3 sous 60 ms, 2 sous 100 ms, sinon 1) ;
  - le ping, ou « Sans réponse ».
- Le serveur choisi est gardé dans `rago.netPick` (par défaut `hypixel`).
- Deux notes en bas : comment c'est mesuré, et l'envoi des résultats à Rago (voir plus haut).

### Carte « Diagnostic avancé » (`Diagnostic`)
- Champ **serveur** (gardé dans `rago.netTarget`, `1.1.1.1` par défaut), vérifié par `validTarget` de [[NetTools.tsx]]. S'il n'est pas valide : texte `no.target.bad`.
- Trois outils `Tool` de [[NetTools.tsx]] : **`quality`** (stabilité sur 100 pings), **`loaded`** (ping sous charge), **`mtu`**.
- Chacun appelle `api.netOptRun(id, { ...NET_DEFAULTS, target })` ([[netopt.rs]]). L'avancement arrive par l'événement **`netopt:line`** (lignes `progress`).
- Erreur `busy` (un lot ou une remise à zéro tourne) : texte `no.busy`. Autre erreur : le message brut.
- **Ligne instable** : un outil peut proposer « tolérance aux pertes » (`onUnstable`). La page écrit alors le brouillon du Packet Optimizer, avec `stable: false` et `preset: "custom"` (`saveDraft` de [[netopt.ts]]). Ce brouillon part du brouillon existant, sinon des réglages appliqués, sinon de `NET_DEFAULTS`. La page ouvre ensuite l'onglet `netopt`, où il reste à appliquer. Sans licence, cet onglet montre la vue fermée (voir [[NetOpt.tsx]]).

## Données touchées
- `localStorage` : `rago.netLast` (dernier test), `rago.netPick` (serveur choisi), `rago.netTarget` (serveur du diagnostic), `rago.netoptDraft` (via [[netopt.ts]], seulement pour la ligne instable). En cas d'échec d'écriture, rien n'est gardé, sans message.
- Côté moteur : le dernier test est aussi gardé en mémoire (`LAST_NET_TEST` de [[lib.rs]], que [[Rago OS]] lit par le pont [[bridge.rs]] sans relancer de mesure) et envoyé au serveur ([[netshare.rs]]).

## Erreurs et cas limites
- Les écouteurs ignorent les événements reçus après la fermeture de l'onglet (`live`).
- `net_test` ne garde que des ids connus, 16 au plus ([[lib.rs]]).

## Simulateur
Avec `npm run window` ([[api.ts]]) : des valeurs plausibles depuis Paris, essai par essai (40 en 10 s, 8 essais Minecraft espacés de 1,4 s), un essai perdu sur `virginia`, des pics réguliers. Avec `?fastnet`, les essais arrivent en quelques millisecondes.

## Liens avec le reste
- Fonctionnalités : [[Test réseau]], [[Packet Optimizer]], [[Analyse du PC]].
- Composants : [[NetTools.tsx]] (outils du diagnostic), `Button` ([[Petits composants de l'interface]]). Textes : clés `net.*` et `no.*` de [[i18n.ts]]. Styles : section « test réseau » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Ajouter un serveur : l'ajouter dans `TARGETS` de [[nettest.rs]] (sinon `net_test` l'ignore), dans `GROUPS` ici, et écrire `net.<id>` et `net.<id>.desc` dans [[i18n.ts]].
- La règle des pics de `Chart` doit rester la même que celle de [[nettest.rs]], sinon la courbe et le chiffre « Pics » ne disent pas la même chose.
