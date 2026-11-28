---
type: version
tags: [version, app]
maj: 2026-11-28
version_app: 1.4.1
---
# Version 1.4.1

**Dans `staging`, pas publiée.** C'est l'app du chantier [[New Brand Rago]] : la [[Version 1.3.0]] (en prod depuis le 22/11) refaite sur la [[Charte graphique]] v5 « Match day ». Numéro dans `app/package.json` et `app/src-tauri/Cargo.toml` (CONFIRMÉ, git, 25/11). Voir [[Historique des versions]], [[État actuel]].

- **1.4.0** (22/11, PR #108) : la charte v5 posée sur l'ancienne interface (polices Barlow embarquées, jetons du kit, icônes imprimées, cadre, carreaux, fenêtres, démarrage, barre en jeu, icône R rouge sur tuile blanche dans l'exe et l'installeur). Sofiene, 23/11 : « ça ne vas pas l'app n'est pas conforme au design ».
- **1.4.1** (23/11, PR #119) : l'app reprend le HTML et le CSS exacts des maquettes, page par page ([[Maquettes v5 dans l'app (s5)]]) : cadre et [[Tableau de bord]] (#119, fenêtre de 1440 × 900, ping en direct), [[Bibliothèque de jeux]] et choix du preset en covers verticales (#120), Display ([[Couleurs et résolution]], #121), les 9 modules (#122), Réseau ([[Packet Optimizer]], [[Test réseau]], Rago Route, #123), [[Page Outils]] (#124), [[Page Souris]] (#125), [[Paramètres de l'app]] (#126), [[Partage et support]] (#127), [[Analyse du PC]] (#128), fenêtres (#130, #131), [[Barre en jeu]] (#132), écran de démarrage de 2,3 s fixes (#133).
- **Après le 23/11, même numéro** : détail d'un réglage au clic sur une icône info et grilles sans vide (#137, 25/11) ; retours du premier test Windows de Sofiene du 25/11 (#139) : bouton du compte en haut à droite, connexion de l'exe de test rangée à part de celle de la 1.2.1 installée, barre en jeu plus opaque, ping et FPS séparés de la 1.2.1, noms des plans d'alimentation, cartes sans vide.
- **27/11, à inclure dans la prochaine release** : dans la [[Barre en jeu]], l'échec du nettoyage de la RAM passe au rouge du jeton `--red` (q116, Sofiene : « on l'enverra avec la prochaine release ») ; il était déjà rouge depuis la #132 (texte `#FF6B61`), alors qu'il est vert dans la 1.3.0 en prod ([[Overlay.tsx]]).
- **28/11, à inclure dans la prochaine release** (décisions de Sofiene, PR #172) : `nv_preemption`, `nv_advanced`, `nv_kboost` et `amd_advanced` grisés sans la bonne carte (q73, [[meta.py]]) ; avis de licence MIT de NVIDIA Profile Inspector (version DeadManWalking) livré dans `resources\THIRD_PARTY_NOTICES.txt` et lien d'À propos vers cette version (q74, [[Configuration Tauri]]) ; « 68 » réglages gratuits affichés au lieu de 73 (q75) ; « Show hidden games (N) » pour remettre un jeu retiré de la bibliothèque (q85, [[Games.tsx]]). Jamais testé sur Windows.
- Le fonctionnement (moteur, catalogue, plan gratuit, Premium) est celui de la 1.3.0 ; seuls l'écran gratuit du [[Packet Optimizer]] (écran verrouillé, gardé par Sofiene le 27/11, q117) et l'emplacement des outils du test réseau changent ([[Décisions]], « Abandonné », 23/11).

## Tests
- Builds : `app-windows` vert après chaque PR (tests Rust compris). Dernier exe de test : `rago-optimizer-setup-STAGING` du run 45641885291 (25/11, 16 h 17 à Paris), installé à côté de la vraie app ([[CI GitHub Actions]]).
- Sur Windows : un seul test, par Sofiene le 25/11 (retours corrigés par la #139). Le reste : jamais testé (À VÉRIFIER). Question en attente : q121 (la barre en jeu sort-elle encore du jeu ?).
- Avant de lancer l'exe de test : quitter la 1.2.1 ou la 1.3.0 installée (icône près de l'horloge, clic droit, Quitter) et se reconnecter une fois dans l'exe de test.

## Sortie
Pas de date. Elle partira de `staging` vers la prod en une fois avec le site et les pages compte v5, après la validation de Sofiene ([[Publier une version]]). À régler avant : droits des images des jeux et des pros ([[New Brand Rago]]).
