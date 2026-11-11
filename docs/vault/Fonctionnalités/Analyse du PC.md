---
type: fonctionnalité
tags: [fonctionnalité, app, gratuit, 1.3]
version_app: 1.3.0
maj: 2026-11-11
---
# Analyse du PC

Page « Analyze my PC » ajoutée en 1.3.0 (PR #70, pas sortie), demandée par Sofiene le 04/11 avec la maquette « Fonctions gardées de la maquette de l'app » (« Il faut rajouter ses fonctionnalités », [[Décisions]]). Entrée dans la barre latérale juste sous le [[Tableau de bord]], et une carte « Analyze my PC » sur le tableau de bord. **Gratuite. Ne change rien sur le PC.** Voir [[Version 1.3.0]], [[Abonnement dans l'app]].

## Ce qu'elle fait
- Mesure le PC en **6 étapes** (le matériel ; Windows et les applis ; les pilotes ; la connexion, 40 pings et le serveur du jeu ; le processeur sans jeu ouvert, 10 secondes ; la dernière partie jouée avec la barre en jeu), puis montre chaque point avec sa valeur, sa norme et ce qui le règle : **Free** (un tweak gratuit), **Premium** ([[Packet Optimizer]] ou les tweaks de latence) ou **Do it yourself** (le joueur, avec la marche à suivre). **Pas de note globale.**
- **Normes du réseau propres à chaque joueur** (Sofiene, 10/11, q50 : « il faut que les normes soit personnalisé en fonction de chaque utilisateur » ; codé dans la PR #76, `netNorms` de `app/src/lib/analysis.ts`). Un joueur loin des serveurs ne voit plus tout « au-dessus de la normale » :
  - **gigue** : 5 ms, ou 10 % du ping si c'est plus (130 ms de ping : 13 ms) ;
  - **perte de paquets** : aucune sous 100 ms de ping, 0,5 % au-delà ;
  - **pics de ping** : 1, ou 2 à partir de 100 ms de ping ;
  - **avec au moins 2 analyses passées sur ce PC**, le seuil monte jusqu'à l'habitude du joueur : 1,5 fois sa gigue habituelle (médiane), sa perte habituelle + 0,5 %, ses pics habituels + 1. Jamais plus bas que les seuils d'un joueur proche des serveurs. Les 10 dernières mesures réseau sont gardées sur le PC (`rago.analysis`, champ `history`), même après « Start over ».
  - La norme affichée dit d'où vient le seuil : « (from your analyses: 4 ms usually) » ou « (at 130 ms ping) ».
- Autres points et seuils (« au-dessus de la normale ») : Wi-Fi au lieu du câble (réseau ; le ping est affiché sans seuil) ; écran pas à sa fréquence la plus haute, 1 % low sous la moitié des FPS moyens, 2 saccades par minute ou plus (FPS ; les FPS moyens sont affichés sans seuil) ; processeur au repos au-dessus de 5 %, plus de 160 processus, mémoire sous la vitesse prévue par les barrettes (système) ; Game DVR actif, mode d'alimentation Équilibré, notifications actives, applis en arrière-plan (« Applis en arrière-plan » : téléchargement, synchronisation et enregistrement, les mêmes listes que [[Pendant la partie]] ; la PR #91, y ajoute Medal et Wallpaper Engine), pilote graphique de plus de 180 jours (Windows).
- Bouton « Apply the N free tweaks » : les tweaks gratuits qui règlent un point trouvé et ne sont pas encore appliqués (au plus 4 : `win_background`, `win_services`, `win_gamedvr`, `win_notifications`). La page ne compte pas les places du plan gratuit : si le joueur a déjà presque 30 réglages allumés, c'est le moteur qui refuse le lot (erreur `free_slots`). En gratuit, « See what Premium adds » ouvre la fenêtre Premium avec la liste des points que Premium règle ; en Premium, le bouton est « Open Latency » (page Latence), même quand le point vient du [[Packet Optimizer]].
- **Avant/après** : la première mesure sert de référence. Après une application de tweaks, la page le dit et refait la mesure à l'ouverture, puis montre un tableau avant → après des valeurs qui ont bougé. Les FPS se comparent après la partie suivante. Après une application, la fenêtre de fin propose « Measure the difference ». Le lien « Start over » efface la référence.
- Les mesures restent sur le PC (`localStorage` `rago.analysis`, dernière partie dans `last-match.json` du dossier de l'app). **Seule exception** : l'étape réseau passe par le même test que le [[Test réseau]] (commande `net_test`), dont les résultats partent au serveur de Rago avec la ville et le fournisseur d'accès, jamais l'adresse IP (`netshare.rs`). La page le dit pendant la mesure : « The network test also sends its numbers to Rago's server, like the usual network test. »

## Code
- Interface : [[Analysis.tsx]] (la page : étapes, résultats, boutons) et [[analysis.ts]] (mesures, normes, avant/après, mémoire `rago.analysis`). Carte d'accès : [[Dashboard.tsx]]. Fenêtre Premium propre à l'analyse : [[Upsell.tsx]]. Carte d'ensemble : [[Code de l'app (interface)]].
- Moteur : [[analysis.rs]] (ce que Windows dit : script PowerShell et fréquence de l'écran, commande `analysis_facts`), [[fps.rs]] (résumé de la dernière partie : au moins 60 s et 600 images, une saccade = une image de plus de 2,5 fois la médiane et de plus de 20 ms), [[nettest.rs]] et [[netshare.rs]] (étape réseau).
- Réutilise le [[Test réseau]] et la charge du processeur de la [[Barre en jeu]].

## Limites (04/11)
- **Rien testé sur Windows.** Les seuils (et leur adaptation au ping et à l'habitude) sont des choix de Claude ; les points du PC (processus, processeur, pilote…) gardent des seuils fixes, car un problème qui dure doit rester signalé.
- Pas mesurés, car impossibles sans droits admin ou traces Windows : délai des interruptions, température du processeur, ping quand la connexion est chargée.
- Pas d'estimation du gain avec Premium : aucune donnée ne permet une fourchette honnête, et la règle de la maquette est « toujours une fourchette ».
