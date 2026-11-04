---
type: fonctionnalité
tags: [fonctionnalité, app, gratuit, 1.3]
version_app: 1.3.0
maj: 2026-11-04
---
# Analyse du PC

Page « Analyze my PC » ajoutée en 1.3.0 (PR #70, pas sortie), demandée par Sofiene le 04/11 avec la maquette « Fonctions gardées de la maquette de l'app » (« Il faut rajouter ses fonctionnalités », [[Décisions]]). Entrée dans la barre latérale juste sous le [[Tableau de bord]], et une carte « Analyze my PC » sur le tableau de bord. **Gratuite. Ne change rien sur le PC.** Voir [[Version 1.3.0]], [[Abonnement dans l'app]].

## Ce qu'elle fait
- Mesure le PC en 5 étapes (matériel et Windows, pilote graphique, réseau, processeur, dernière partie), puis montre chaque point avec sa valeur, sa norme et ce qui le règle : **Free** (un tweak gratuit), **Premium** ([[Packet Optimizer]] ou les tweaks de latence) ou **Do it yourself** (le joueur, avec la marche à suivre). **Pas de note globale.**
- Points mesurés et seuils (« au-dessus de la normale ») : gigue au-dessus de 5 ms, perte de paquets au-dessus de 0, plus d'un pic de ping, Wi-Fi au lieu du câble (réseau ; le ping est affiché sans seuil) ; écran pas à sa fréquence la plus haute, 1 % low sous la moitié des FPS moyens, 2 saccades par minute ou plus (FPS ; les FPS moyens sont affichés sans seuil) ; processeur au repos au-dessus de 5 %, plus de 160 processus, mémoire sous la vitesse prévue par les barrettes (système) ; Game DVR actif, mode d'alimentation Équilibré, notifications actives, téléchargements ou synchronisation en arrière-plan, pilote graphique de plus de 180 jours (Windows). Ces seuils attendent l'avis de Sofiene (q50, À VÉRIFIER).
- Bouton « Apply the N free tweaks » (les tweaks gratuits qui règlent un point trouvé, dans la limite des 30 places du plan gratuit) et, en gratuit, « See what Premium adds » qui ouvre la fenêtre Premium avec la liste des points que Premium règle.
- **Avant/après** : la première mesure sert de référence. Après une application de tweaks, la page le dit et refait la mesure à l'ouverture, puis montre un tableau avant → après des valeurs qui ont bougé. Les FPS se comparent après la partie suivante. Après une application, la fenêtre de fin propose « Measure the difference ». Le lien « Start over » efface la référence.
- Les mesures restent sur le PC (`localStorage` `rago.analysis`, dernière partie dans `last-match.json` du dossier de l'app). Rien n'est envoyé.

## Code
`app/src-tauri/src/analysis.rs` (ce que Windows dit : script PowerShell et fréquence de l'écran), `fps.rs` (résumé de la dernière partie : au moins 60 s et 600 images, une saccade = une image de plus de 2,5 fois la médiane et de plus de 20 ms), commande `analysis_facts` ; `app/src/lib/analysis.ts` (étapes, normes, avant/après) ; `app/src/pages/Analysis.tsx`. Réutilise le [[Test réseau]] et la charge du processeur de la [[Barre en jeu]].

## Limites (04/11)
- **Rien testé sur Windows.** Les seuils sont des choix de Claude : À VÉRIFIER (q50).
- Pas mesurés, car impossibles sans droits admin ou traces Windows : délai des interruptions, température du processeur, ping quand la connexion est chargée.
- Pas d'estimation du gain avec Premium : aucune donnée ne permet une fourchette honnête, et la règle de la maquette est « toujours une fourchette ».
