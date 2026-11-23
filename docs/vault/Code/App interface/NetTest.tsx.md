---
type: code
tags: [code, app, react, page, reseau]
fichier: app/src/pages/NetTest.tsx
lignes: 531
maj: 2026-11-23
---
# NetTest.tsx

L'onglet **« Network test »** (« Test réseau ») de la page Réseau : la note de ta connexion, la courbe de chaque essai, la liste des serveurs et **un serveur au choix**. Refait le 23/11 à l'identique des maquettes v5 `app-network-test-pi.html` et `app-network-offline.html` (PR #123). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Test réseau]]. Côté Rust : [[nettest.rs]], [[netshare.rs]].

Tout ce qui suit est CONFIRMÉ (code de la PR #123 du 23/11, commit `c0d27dd`, vers `staging`). Jamais testé sur Windows.

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `nettest`. La page lui passe `offline` (le ping en direct ne revient plus, `useLivePing`).
- **Gratuit** et **rien n'est changé sur le PC**.
- Depuis le 23/11, l'onglet n'a plus de « Diagnostic avancé » : les outils stabilité, bufferbloat et MTU sont dans la rangée « tools » du Packet Optimizer ([[NetOpt.tsx]]), gratuits aussi.

## Ce que le fichier expose
- `NetTest({ offline })` : l'onglet.
- Composant interne : `PingChart` (le graphe).
- Fonctions internes : `grade(m)`, `partial(id, essais)`, `mmss(s)`, `load(clé)`, `save(clé)`.
- Constantes internes : `GROUPS`, `ALL`, `CUSTOM` (`"host:"`), `NICE` (échelles du graphe), `slotsOf(id)`, `gapOf(n)`.

## Fonctionnement détaillé

### Serveurs mesurés (`GROUPS`)
Mêmes identifiants que `TARGETS` dans [[nettest.rs]], dans l'ordre de la maquette :

| Groupe | Serveurs |
|---|---|
| minecraft | `minemen`, `hypixel` |
| game servers | `paris`, `london`, `frankfurt`, `madrid`, `stockholm`, `virginia` |
| internet | `internet` (Cloudflare le plus proche) |
| your server | le serveur tapé par le joueur, s'il y en a un |

- **8 essais** espacés de 1,4 s pour les deux serveurs Minecraft, **40** en 10 s pour les autres.

### Serveur au choix (nouveau le 23/11)
- Champ en bas de la liste, avec l'exemple « hypixel.net, play.tonserveur.fr, 1.1.1.1 ». L'adresse est vérifiée par `validTarget` de [[NetTools.tsx]] (lettres, chiffres, points, et `:port` si besoin) ; sinon le champ passe en rouge.
- Le bouton « test » mesure `host:<adresse>` (40 essais prévus). Le moteur choisit la méthode : ping de Minecraft, écho ICMP ou ouverture de connexion (voir [[nettest.rs]], fonction `custom`). La méthode s'affiche sous le nom (« ping minecraft », « ping », « connexion »).
- Le dernier serveur testé est gardé sur ce PC (`rago.netCustom`) et reste dans le groupe « your server ».
- **Il n'est jamais envoyé au serveur Rago** : `net_test` retire les serveurs `host:` avant l'envoi ([[lib.rs]], [[netshare.rs]]).

### Déroulement d'un test
1. `api.netTest(ids)` (commande `net_test`). Le moteur mesure tous les serveurs demandés **en même temps**.
2. Chaque essai arrive par l'événement **`nettest:sample`** (`{ id, i, n, ms }`, `ms = null` si perdu). Le graphe se remplit en direct, et les chiffres affichés sont recalculés à partir des essais reçus (`partial`).
3. Chaque serveur fini arrive par **`nettest:measure`**. Son résultat remplace les chiffres partiels.
4. Le résultat est gardé dans `rago.netLast` (`{ at, results }`).

- **Première visite** (rien dans `rago.netLast`, en ligne) : le test de tous les serveurs se lance tout seul.

### Carte de la note (`score`)
- **Note** (`grade`) du serveur choisi, sous « connection » :
  - **poor** (« mauvaise ») si pas de réponse, pertes ≥ 5 % ou gigue > 15 ms ;
  - **great** (« top ») si ping ≤ 40 ms, gigue ≤ 5 ms et pertes ≤ 2,5 % ;
  - **good** (« bonne ») si ping ≤ 80 ms et gigue ≤ 10 ms ;
  - sinon **fair** (« moyenne »).
  - Seuils changés le 23/11 : avant, l'instabilité commençait à 2 % de pertes, et « excellente » demandait 0 perte. Un essai perdu sur 40 (2,5 %) arrive sur une bonne ligne.
- Trois chiffres : ping, gigue, pertes (%).
- Bouton « test again » (ou « test ») et, dessous, « tested 5 min ago », ou « 12/40 » pendant la mesure.

### Graphe (`PingChart`)
- Le graphe « imprimé » de la maquette (son `pingchart.js`) : courbe papier avec la couche rouge décalée dessous, trame rouge sous la courbe, essai perdu hachuré, moyenne et pic sur des bandes de papier.
- Échelle : la première valeur de `NICE` (20, 40, 60… 2000 ms) au-dessus du pire essai avec 10 % de marge, en 4 lignes.
- Repères de temps sous la courbe : un trait toutes les 2 s (5 ou 10 s si le test est plus long), un petit tous les quarts. Horloge en haut à droite (« live » pendant la mesure).
- Dessous : meilleur, pire, pics, perdus (en rouge s'il y en a).

### Liste des serveurs (`srv`)
- Une ligne par serveur, choisie comme un bouton radio : nom, description, barre du ping (0 à 100 ms), ping ou « no answer » / « not found ». Au-delà de 80 ms, ou sans réponse, la ligne passe en rouge.
- Le serveur choisi est gardé dans `rago.netPick` (par défaut `paris`).
- Bouton « test all ».

### Notes du bas
- Conseil si gigue > 10 ms ou pertes ≥ 5 % : câble plutôt que Wi-Fi, puis le Packet Optimizer (lien vers l'onglet `netopt`).
- L'envoi des résultats à Rago (`net.shared`) : « Les résultats partent chez Rago avec ta ville et ton fournisseur d'accès, jamais ton adresse IP… ».

### Écran hors ligne
- Montré quand la page dit `offline`, ou quand tous les serveurs connus finissent en erreur `dns`.
- « tu es / hors ligne », le texte « Rago n'arrive pas à joindre les serveurs de test… », les boutons « test again » et « ouvrir les paramètres réseau » (`api.toolsOpen("network")`), et « Tes réglages marchent aussi hors ligne. Seuls les tests ont besoin d'une connexion. ».

## Données touchées
- `localStorage` : `rago.netLast` (dernier test), `rago.netPick` (serveur choisi), `rago.netCustom` (serveur au choix). En cas d'échec d'écriture, rien n'est gardé, sans message. `rago.netTarget` (cible de l'ancien diagnostic) n'est plus lu.
- Côté moteur : le test est envoyé au serveur Rago ([[netshare.rs]]), sans le serveur au choix.

## Erreurs et cas limites
- Les écouteurs ignorent les événements reçus après la fermeture de l'onglet (`live`).
- `net_test` ne garde que des ids connus et **un seul** `host:`, 16 au plus ([[lib.rs]]).
- Moteur qui ne répond pas : les serveurs gardent leur dernier résultat.

## Simulateur
Avec `npm run window` ([[api.ts]]) : les valeurs de la maquette depuis Paris, essai par essai, un essai perdu sur `paris`, un pic au 24e essai. Un serveur au choix dont le nom contient hypixel, minemen, mc ou play répond au ping de Minecraft (31 ms), les autres à l'écho (12 ms). `?fastnet` : les essais arrivent en quelques millisecondes. `localStorage` `rago.demoOffline = 1` : PC sans réseau (ping en direct coupé, aucun serveur trouvé).

## Liens avec le reste
- Fonctionnalités : [[Test réseau]], [[Packet Optimizer]].
- Textes : `s5.nt.*` et `net.*` ([[i18n.ts]]). Styles : `s5/pages/module.css` et `s5/pages/net.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Ajouter un serveur : l'ajouter dans `TARGETS` de [[nettest.rs]] (sinon `net_test` l'ignore), dans `GROUPS` ici, et écrire `net.<id>` et `net.<id>.desc` dans [[i18n.ts]].
- La règle des pics doit rester la même que celle de [[nettest.rs]].
- Le serveur au choix ne doit jamais partir chez Rago (adresse personnelle possible).
