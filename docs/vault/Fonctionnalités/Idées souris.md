---
type: fonctionnalité
tags: [fonctionnalité, idée, à-décider, souris]
maj: 2026-11-11
---
# Idées souris

**Statut : À DÉCIDER. Rien n'est codé.** Analyse du 11/11, demandée par Sofiene (« tu vois l'application X Mouse Button Control […] Tu peux l'analyser et voir si on peu en tirer des bonne optimizer ou settings »), capture de la v2.20.5 à l'appui. Gratuit ou Premium : question q96.

**Aperçu (11/11)** : à la demande de Sofiene (« genere moi une preview […] mais ne push rien »), page « Souris » faite dans la démo web (groupe « En jeu », sous [[Couleurs et résolution]]) : fréquence de la souris, test de double clic, logiciels entre la souris et le jeu avec l'interrupteur « Souris 1:1 », calculateur de sensibilité. Captures `souris/apercu-page-souris-haut.png` et `-bas.png` du dossier partagé, code dans `souris/apercu-page-souris.patch` ; **rien sur GitHub, rien dans l'app**. Les valeurs de l'aperçu sont une démo.

**Effet sur la hitreg : aucun.** La hitreg dépend du réseau et du serveur du jeu ([[Packet Optimizer]], [[Tweaks Hitreg]]). Ces idées aident à trouver un vrai problème de souris (fréquence basse, bouton usé, logiciel de macros) : utile pour une minorité de joueurs, pas un besoin de tous. Voir [[Catalogue des tweaks]], [[Analyse du PC]], [[Conseils au lancement du jeu]], [[Tweaks Latence]], [[Tweaks Hitreg]].

## X-Mouse Button Control (XMBC) en bref
Logiciel gratuit de Phil Gibbons (highrez.co.uk), dernière version connue 2.20.5 (juin 2023). C'est un **outil de remappage**, pas un optimiseur :
- profils par appli ou fenêtre, jusqu'à 5 « layers », boutons qui envoient des touches, lancent des applis, font copier-coller, médias, « Click-Drag », accords de boutons ;
- réglages de molette (vitesse, inversion, « mouvement en défilement ») ;
- onglet Options (capture de Sofiene) : « Override Mouse Speed » et « Enhance pointer precision » = les mêmes réglages Windows que le panneau Souris ; « Ignore repeated remapped scroll » = anti-rebond de la molette, seulement pour les molettes remappées ;
- un filtre anti-rebond des clics (« de-bounce », depuis la 2.11 de 2015) pour les **vieux boutons usés** qui font des doubles clics ;
- touches simulées avec répétition (« Repeat », boutons maintenus), délais aléatoires `{WAITMS:x-y}` : de quoi faire des macros.

Il lit la souris par un **crochet global de Windows** (son journal parle du « low level hook timeout » et du « main hook thread »), sans pilote à lui. Le site ne promet **aucune baisse de latence**.

## Mesurable ou marketing
| Promesse vue (vidéos, forums) | Réalité |
|---|---|
| « Supprime le delay de la souris » | **Faux.** Un crochet global ajoute un passage de plus à chaque mouvement et clic (très court, mais jamais négatif). Le journal de XMBC corrige lui-même des « lagging IO » (2.18). |
| « Enlève l'accélération » | Vrai, mais c'est la case Windows « Améliorer la précision du pointeur », que Rago coupe déjà (`kbm_accel`, `kbm_1to1`, `kbm_panel`, `in_mouse`). Sans effet dans les jeux qui lisent la souris en brut (raw input : Valorant, CS2, Fortnite, Apex…). |
| « Corrige les doubles clics » | Vrai pour un bouton usé (anti-rebond). Ne rend pas un clic plus rapide ; un anti-rebond trop fort fait même rater des clics rapides. |
| Macros, répétition | Vrai, mais **interdit** en compétitif : touches simulées = macro (règles de Riot, Hypixel « macros / autoclickers » interdits). |

## Ce que Rago fait déjà (catalogue de `staging`, 11/11)
`in_mouse`, `kbm_accel`, `kbm_1to1`, `kbm_panel` (accélération coupée, vitesse 6/11 ; quatre réglages qui se recouvrent presque), `in_queue` (file des pilotes), `kbm_thread`, `kbm_csrss`, `sys_csrss`, `pri_csrss` (priorités, effet rarement mesurable), `usb_power`, `sys_usb`, `usb_hidden`, `usb_msi`, `usb_advanced`, `usb_priority`. Tous **Premium** ([[free.json]] ; `in_mouse` gratuit avant la 1.1.14). Rien ne **mesure** la souris.

## Idées proposées (aucune décidée)
| Idée | Mesurable ? | Anti-cheat | Proposition de Claude |
|---|---|---|---|
| **Test de souris** : fréquence réelle (Hz) et régularité, en bougeant la souris dans une zone de Rago (Raw Input lu dans la fenêtre de Rago seulement) | Oui | Sûr : rien ne touche au jeu | Gratuit (attire, montre le sérieux) |
| **Test de double clic** : 20 clics lents, Rago compte les clics en double (bouton usé) et conseille l'anti-rebond du logiciel de la marque | Oui | Sûr | Gratuit |
| **Logiciels qui interceptent la souris** dans l'[[Analyse du PC]] (XMBC, AutoHotkey, macros…) : prévenir du risque de ban et du passage en plus | Oui (liste de processus) | Sûr : Rago ne ferme rien seul | Gratuit |
| **Conseils souris au lancement** ([[Conseils au lancement du jeu]]) : raw input activé (Lunar, Minecraft), 1000 Hz conseillé (4000/8000 Hz coûtent du processeur, cf. `in_queue`), souris branchée sur un port de la carte mère | Oui (sources des jeux) | Sûr | Gratuit |
| **Calculateur de sensibilité** : DPI × sensibilité → eDPI et cm/360, conversion d'un jeu à l'autre | Oui (calcul) | Sûr : rien n'est écrit | Gratuit ; import de la sensibilité des pros Premium, comme les presets de [[Couleurs et résolution]] |
| **Réunir** `in_mouse`, `kbm_accel`, `kbm_1to1`, `kbm_panel` en un réglage « Souris 1:1 » | — | Sûr (réglages Windows) | Rendre ce seul réglage gratuit ? (q96) |

## À ne pas faire
- Pas de crochet global, pas de touches simulées, pas d'autoclick ni d'anti-rebond « maison » dans le jeu : ajoute un passage, et risque de ban (Vanguard, Hypixel). Rago ne fait que des réglages Windows et des mesures dans sa propre fenêtre.
- Pas de promesse « zéro délai » : la latence d'une souris se règle surtout dans la souris (fréquence, anti-rebond du fabricant) et dans le jeu (raw input), pas par une appli de remappage.
