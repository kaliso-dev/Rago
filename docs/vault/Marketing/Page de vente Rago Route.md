---
type: marketing
tags: [marketing, rago-route, concurrence, site, conversion]
source: https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG
maj: 2026-11-11
---
# Page de vente Rago Route

Analyse faite le 11/11 pour la page de vente de [[Proxy|Rago Route]] ([[route.html]]), à la demande de Sofiene : « pour annoncer sa sortie apres le test il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse, les nouveauté, sur quoi on se differencie mais surtout les résultats », en analysant d'abord les problèmes des joueurs, puis ExitLag et les optimiseurs qui vendent des routes, et avec des animations explicatives et des prompts « image 1 / image 2 » pour ChatGPT. Retour à [[Marketing]].

- **Dossier complet** (Claude Doc, 11/11) : « Rago Route : analyse et page de vente », https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG (problèmes des joueurs avec citations, tableau problème → fonction → résultat, concurrents, différences, page section par section, prompts d'images, points à vérifier, sources).
- **Vidéo et captures de la page** : `/mnt/project-files/rago-route-page/` ([[Sources]]).
- **État** : page écrite et vérifiée (ordinateur, téléphone, sans JavaScript, animations réduites), **sur `staging` depuis le 11/11** (Sofiene, carte de choix : « Oui, pousse sur staging »), visible sur `staging--rago-optimiser.netlify.app/route.html` ; pas en prod. Annonce de la sortie après le test de Sofiene.

## Le vrai problème des joueurs (OBSERVÉ, 11/11)
- Ils ne se plaignent pas d'un chiffre de ping mais de moments où la partie se fige, saute ou les déconnecte : « random lag spikes that happen every 5 seconds » (Steam), « it feels like I'm rubber banding » (r/hypixel), un bon ping seulement tard le soir (Badlion). Mesure Rago : **34 des 88** mesures vers Hypixel avec pertes, pics ou gigue de 10 ms ou plus ([[Test réseau]], 29/10 au 04/11).
- Trois problèmes : **les pertes et les pics** (ce que Rago Route règle), **la distance** (Hypixel est en Amérique du Nord : personne ne la raccourcit, et le dire rend crédible), **la méfiance** après des outils qui promettaient trop (renouvellements sans prévenir, remboursements refusés, « AI response » au support, d'après les avis Trustpilot d'ExitLag et de NoPing).
- Risque relevé dans les avis d'ExitLag : sur les serveurs à « 1 IP per player », beaucoup de joueurs derrière la même adresse de sortie se font bannir. Rago Route a une seule sortie (Paris) : à surveiller.

## Concurrents (pages lues le 11/11)
| Outil | Copies sur plusieurs routes | Wi-Fi + 4G | Réparation des pertes | Promesse | Essai, prix | Trustpilot |
|---|---|---|---|---|---|---|
| ExitLag | oui, « Multipath » | oui, « Multi-Internet », jusqu'à 4 connexions | rien de documenté | « reduces ping 30-70% », 4 000+ jeux | 3 jours sans carte ; 9,99 $/mois selon un tiers | 3,6/5 (575 avis) |
| NoPing | oui, « Multi Connection », jusqu'à 5 routes | oui, « Multi Internet » | doublons filtrés | « up to 80% » (rapporté) | 8,99 $/mois selon un tiers | 2,8/5 (312 avis) |
| WTFast | non, choisit une route (« GPN ») | non documenté | non documenté | aucun chiffre | 3 jours ; 13,37 $/mois selon un tiers | non lu |
| GearUP | non, « Dual Assurance » choisit Wi-Fi ou 4G | oui, une à la fois | « Anti Packet Loss » sans mécanisme | aucun chiffre | non lu | non lu |
| Speedify (VPN) | oui, « Redundant Mode » | oui, jusqu'à 3, « significantly more data » | copies seulement | « up to 40% » | non lu | non lu |
| Mudfish | « Multi Path » annoncé | non (selon NoPing) | un mode « SimpleFEC » existe, page illisible | À VÉRIFIER | non lu | non lu |

Les prix « selon un tiers » viennent du comparatif tech-insider (2026), qui conclut aussi : « There is no independently verified average reduction percentage ». Prix officiels et fonctionnement de Mudfish : À VÉRIFIER (pages illisibles le 11/11). Étude plus large des outils réseau : [[Étude - Outils réseau et ping]].

**Ce qu'on en tire pour la page :**
- Le double trajet et la 2e connexion existent déjà chez ExitLag, NoPing et Speedify : la page ne dit **jamais** « the only » ni « the first ». Aucun ne documente de paquets de secours (FEC).
- Ils vendent un pourcentage de ping ; les avis négatifs disent « aucun gain » ou « ping plus haut ». Rago vend la fin des gels, avec une preuve mesurée et datée par fonction.
- La page technique d'ExitLag (une fonction, le problème qu'elle règle, pour qui) sert de modèle de structure.
- ExitLag offre 3 jours sans carte, Rago demande une carte : chaque bouton d'essai est suivi du prix après l'essai, du jour du prélèvement et de l'annulation en deux clics. Les plaintes de facturation sont la première cause de mauvaises notes chez eux.

## Ce qui différencie Rago Route (vrai au 11/11)
1. Fait pour Minecraft Java seulement (un flux lu dans l'ordre, où une perte bloque tout).
2. Trois façons de récupérer un paquet, ensemble : 2e route, paquet de secours, renvoi immédiat.
3. La partie gardée pendant une coupure (sortie qui tient la connexion, 8 s tenues en labo).
4. Le téléphone en USB, Bluetooth ou Wi-Fi, avec un diagnostic qui dit quelle étape manque.
5. Chiffré et signé entre le PC et la sortie (le guide d'ExitLag parle de « Minimal encryption »).
6. Des preuves : compteurs en direct dans l'app, chaque chiffre mesuré et daté, aucun pourcentage de ping.
7. Un seul abonnement : Rago Route est dans Premium (et Lifetime), avec les 218 tweaks et le [[Packet Optimizer]].

## Choix faits pour vendre
- Un seul bouton, répété : « Start 3-day free trial » en haut, au prix, à la fin, et dans une barre fixe sur téléphone.
- L'honnêteté comme argument : « What it won't do. » et « Not the right fit if » écartent ceux que Rago Route ne servira pas, avant qu'ils paient. Le test réseau gratuit est proposé aux indécis.
- Jamais : « the only », « the first », « zero risk », « up to X % » sans source, « no ban », un meilleur hitreg ([[Voix et ton]]).

## Animations et images ChatGPT
- Les 7 animations de la page sont en code (héros, le vrai problème, double trajet, paquets de secours, renvoi immédiat, session gardée, téléphone avec diagnostic, plus la maquette de l'onglet) et marquées « Illustration ».
- Le dossier donne un **style commun** et un prompt **image 1 / image 2** pour chacune (et pour le fair play et les quatre cartes de problèmes). Sofiene génère les images dans ChatGPT et les renvoie ; elles serviront de décor (WebP, passage de l'image 1 à l'image 2 par un balayage), les paquets et les compteurs restant en code. Pour les compteurs en direct, une vraie capture de l'onglet vaut mieux qu'une image générée. En attente des images (11/11).

## À vérifier avant l'annonce
- Le test du téléphone sur Windows par Sofiene : la preuve de la fonction 05 et la coupure de 30 s viennent du prototype sur Mac (07/11).
- Les chiffres 2 246, 116 / 119 ms et 30 s ont été mesurés avec le prototype Python sur Mac, pas avec l'app Windows.
- Hypixel coupe les connexions venant de Frankfurt (09/11, [[Proxy]]) ; tous les joueurs sortent par la même adresse à Paris.
- De nouvelles sorties sont-elles prévues ? (question q97 sur la page « Questions du vault Rago », [[Questions ouvertes]]).
- La liste Premium de l'accueil ne cite pas Rago Route, et la section `#route` de l'accueil garde « Get notified on Discord » ([[page.html]]).
