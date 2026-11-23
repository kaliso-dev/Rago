---
type: fonctionnalité
tags: [fonctionnalité, app, gratuit, souris, 1.3]
version_app: 1.3.0
maj: 2026-11-23
---
# Page Souris

Page « Mouse » / « Souris » de l'app, dans le groupe « Play » de la barre latérale, sous Hitreg (la barre latérale v5 n'a plus de badge « Nouveau »). **Gratuite, sans cadenas. Ne change rien sur le PC et ne touche pas au jeu.** Demandée par Sofiene le 11/11 après l'analyse de X-Mouse Button Control (« Oui tu peux push ca sur la derniere version stagging […] + mouse ») : elle part avec la [[Version 1.3.0]]. **Dans `staging` par la PR #96, jamais testée sur Windows.** Gratuit ou Premium à confirmer (q96). Ticket [[Linear]] RAG-96. Voir [[Analyse du PC]], [[Tweaks Latence]].

**Écran v5 (23/11, dans `staging` par la PR #125, fusionnée le 23/11, jamais testé sur Windows)** : la page est refaite à l'identique de la maquette `app-mouse.html` (demande de Sofiene du 23/11 : l'app doit être « strictement conforme au design ») ; détail dans [[Mouse.tsx]]. Le fond ne change pas. Ce qui se voit :
- la fréquence mesurée dans l'étiquette rouge de l'en-tête ;
- les quatre sections en deux colonnes : « polling rate » (64 barres, les écarts hors rythme en rouge), « double-click check » (compteur 20 / 20 et pastilles, rouge pour un clic qui a rebondi), « mouse software » et « sensitivity » ;
- la ligne « 1:1 mouse » montre son état et garde toujours le lien vers Latence.

## Ce qu'elle fait (4 cartes)
1. **Fréquence de la souris** : le joueur fait des cercles dans une zone ; l'app lit chaque rapport de la souris (événement `pointerrawupdate` et `getCoalescedEvents` de Chromium/WebView2, `pointermove` sinon), retire les pauses de la main (écarts de 12 ms ou plus) et, après 300 rapports, affiche les Hz moyens, la **régularité** (part des rapports à moins de 25 % de l'écart médian), le plus long écart et les 64 derniers écarts en barres (en rouge au-delà de 1,15 fois l'écart médian). Verdict : moins de 200 Hz « Basse » (conseils : 1000 Hz dans le logiciel de la souris, port direct, dongle proche) ; jusqu'à 700 « Correcte » ; jusqu'à 1 600 « Bonne » (1000 Hz = le bon réglage, 4000/8000 Hz coûtent du processeur) ; au-delà « Très haute ».
2. **Test de double clic** : 20 clics lents du bouton gauche ; un appui à moins de 40 ms du précédent est un **rebond** (bouton usé). Résultat : « Aucun double clic » ou « N doubles clics » avec les écarts en ms et le conseil de monter le « debounce » dans le logiciel de la souris ou de changer le switch. Bouton « Recommencer » ; au-delà de 20 clics, les appuis ne comptent plus.
3. **Entre ta souris et le jeu** : logiciels lancés repérés par le nom de leur exe ([[mouse.rs]], commande `mouse_apps`, lecture seule) : X-Mouse Button Control (remappage), AutoHotkey (scripts), TinyTask, GS Auto Clicker, Auto Clicker (clic automatique), tous « Risqué en classé » ; Logitech G HUB, Logi Options+, Razer Synapse, SteelSeries GG, Corsair iCUE, Glorious CORE « OK » (logiciel du fabricant, à garder). Rien n'est fermé. Ligne **« Souris 1:1 »** : « activée » si `kbm_1to1`, `kbm_accel`, `kbm_panel` ou `in_mouse` est allumé, sinon « coupée » ; le lien « latence » mène toujours au réglage `kbm_1to1` de la page Latence (Premium, inchangé).
4. **Sensibilité** : DPI × sensi en jeu → eDPI et cm pour un tour complet, et la même sensation dans un autre jeu. Jeux : Valorant (0,07° par point), CS2 et Apex Legends (0,022), Overwatch 2 (0,0066), Rainbow Six Siege (0,00572958). Calcul seulement, rien n'est écrit dans le jeu.

## Pourquoi (analyse du 11/11)
X-Mouse Button Control (Phil Gibbons, gratuit, v2.20.5 de juin 2023) est un **outil de remappage**, pas un optimiseur : profils par appli, touches simulées et répétées, réglages de molette, anti-rebond pour vieux boutons. Il lit la souris par un **crochet global** de Windows : un passage de plus à chaque mouvement, jamais une baisse de latence, et son site n'en promet aucune. Sa case « Enhance pointer precision » est celle de Windows, que Rago coupe déjà. Ses macros sont interdites en compétitif (Riot, Hypixel).
- **Effet sur la hitreg : aucun.** La hitreg dépend du réseau et du serveur du jeu ([[Packet Optimizer]], [[Tweaks Hitreg]]). La page aide à trouver un vrai problème de souris (fréquence basse, bouton usé, logiciel de macros) : utile pour une partie des joueurs, pas pour tous.
- **Anti-cheat** : sûre avec Vanguard et les autres : mesures dans la fenêtre de Rago, liste des processus en lecture seule, aucun crochet, aucune entrée envoyée.

## Idées pas faites
- Import de la sensibilité des pros (Premium, comme les presets de [[Couleurs et résolution]]) : pas de données de sensibilité fiables dans `pros.json` ; à décider.
- Réunir `in_mouse`, `kbm_accel`, `kbm_1to1`, `kbm_panel` (quatre réglages qui se recouvrent presque) en un seul « Souris 1:1 » : changement du catalogue, pas fait.
- Logiciels de la souris dans l'[[Analyse du PC]] : pas fait, la page Souris s'en charge.

## Code
- Interface : [[Mouse.tsx]] (la page), styles de la maquette `s5/pages/pages.css` et retouches dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]), entrée `mouse` de [[Sidebar.tsx]] et [[App.tsx]], icône imprimée `mouse` ([[Sidebar.tsx]]), libellé `nav.mouse` ([[i18n.ts]]).
- Moteur : [[mouse.rs]] (liste des logiciels) ; commande `mouse_apps` de [[lib.rs]] ; `api.mouseApps()` de [[api.ts]] (démo : X-Mouse Button Control et Logitech G HUB).

## Limites
- **Jamais testée sur Windows.** À vérifier : que WebView2 donne bien `pointerrawupdate` dans l'app (sinon la mesure tombe à la fréquence de l'écran) et que 4000/8000 Hz se mesurent juste (précision des horodatages de Chromium).
- Le test de double clic suppose des clics lents : un vrai double clic volontaire très rapide (moins de 40 ms) compterait comme un rebond.
