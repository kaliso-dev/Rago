---
type: code
tags: [code, app, catalogue, journal, markdown]
fichier: app/docs/CORRECTIONS.md
lignes: 762
maj: 2026-11-10
---
# CORRECTIONS.md (app)

Le journal de **tout ce qui a été changé dans les scripts des anciens `.bat`** avant d'entrer dans l'app, et pourquoi. Les 615 premières lignes sont réécrites à chaque `npm run catalog` ; les sections du bas sont écrites à la main et gardées telles quelles. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11 : 762 lignes, 77 895 octets ; il est identique à ce que redonne le générateur). La note porte le suffixe « (app) » pour ne pas se confondre avec une note Markdown du vault.

## Structure du fichier
| Lignes | Section | Origine |
|---|---|---|
| 1-383 | « Corrections apportées au .bat Premium v5.2 » | générée par [[build_catalog.py]] |
| 384-483 | « Corrections apportées aux .bat v6 (Ping Optimization Final, HITREG INPUTLAG, FPS) » | générée : `V6_NOTES` de [[build_catalog_v6.py]] |
| 484-557 | « Optimisations envoyées le 2026-10-21 (1.2.0) » | générée : `NOTES` de [[optis_120.py]] |
| 558-614 | « Réglages risqués retirés (1.1.8) » | générée : `notes()` de [[safety.py]] (chiffres calculés) |
| 616 | ligne marqueur (commentaire HTML) | [[corrections_md.py]] |
| 617-639 | « Plan d'alimentation Rago Low Latency (1.1.9) » | écrite à la main |
| 640-754 | « Version 1.1.14 (construite sur la 1.1.10, 2026-10-15) » | écrite à la main |
| 755-762 | « Version 1.2.0 (construite sur la 1.1.14, 2026-10-17) » | écrite à la main |

## Résumé des corrections et de leurs raisons

### v5.2 (section générée)
- Tableau des 4 familles de corrections automatiques de [[extract_bat.py]] : **152** lignes cassées par un rechercher-remplacer « Disable » → « Disabling » (commandes sans effet), **14** `reg add … DevicePriority /f` sans valeur (écrivaient une chaîne vide au lieu de supprimer), **3** boucles `for` dont le corps n'était pas rattaché (réglage MSI des cartes graphiques appliqué sur une clé `%i` inexistante), **5** chemins codés en dur sur le PC de l'auteur. Total avec les 2 autres corrections : 176 lignes.
- Corrections ciblées : choix « PC modeste » et « PC portable » du Hitreg qui renvoyaient vers les choix 1 et 2 ; « revert » des atténuations qui laissait SEHOP et l'ASLR coupés ; Mode jeu qui coupait l'impression sans la relancer ; `UserPreferencesMask` avec espaces ; service `CDPUserSvc_5d3cf` propre au PC de l'auteur ; désinstallation de Edge figée sur une version ; lignes collées depuis un assistant de chat ; option NVIDIA « Profile Inspector » qui n'importait rien.
- Retirés : « Windows Update Blocker » (label vide), « Additional Service Priorities » (variable jamais définie écrite dans `MitigationOptions` de processus système), entrées « Apply All ».
- Puis le détail ligne par ligne `- L<n>: avant → après` (lignes 30 à 383).

### v6 (section générée)
- Les mêmes défauts revenus dans les `.bat` v6 du 06/10, corrigés de la même façon, plus le GUID de carte réseau du PC de l'auteur remplacé par une boucle sur toutes les cartes et les `/f%` de copier-coller.
- Corrections ciblées : fichiers et dossiers propres au PC de l'auteur retirés, point de restauration « Risxn » renommé, fenêtres qui bloquaient le script, fautes (`useplatformclockJ`, « Optimimizing »), `PROFILES_DIR` jamais développé, files souris et clavier remises à 100 (valeur de Windows).
- **Choix de Sofiene du 07/10** : TRIM du SSD laissé actif (la ligne qui le coupait est retirée ou inversée) ; date de dernier accès **vraiment** coupée (`disableLastAccess 1` au lieu de 0, sauf variante disque dur).
- Profils exclusifs découpés en variantes (`ping_hitreg`, `ping_packets`, `ping_main`, `sys_ram`).
- RBW Mod réécrit par [[rbw.py]] (RAG-69, 13/10), détail de « On » et « Off ».
- « Tout garder » : les actions lourdes restent mais sont annoncées (`WARNINGS` → « Read this first » + Advanced).
- Réglages ajoutés par l'app en 1.1.6 : `win_ai`, `win_autoplay`.
- Audit ligne par ligne du 07/10 ([[audit_fixes.py]]) : 7 corrections de texte, 3 blocs et 590 lignes retirés, 144 lignes réécrites ; `wmic` remplacé par PowerShell dans 21 réglages ; 7 réglages passés en action ponctuelle.
- Annulation (`undo.json`, [[undo_gen.py]], [[merge_full.py]]).
- Priorité par jeu (`pri_game`, 1.2.0) : noms d'exe faux corrigés (Valorant, QoS de Fortnite, CS2…), 111 valeurs ignorées par Windows retirées, 10 jeux ajoutés, `Do not use NLA` ajouté. Presets enrichis et presets par jeu.
- **Chiffres en dur faux** : la section dit « 226 réglages au total (199 réglages distincts depuis 1.1.8) ». Ce sont des chiffres d'octobre ; au 10/11 c'est 231 entrées et 218 distincts (la section « Réglages risqués retirés », calculée, donne les bons).

### Optimisations du 21/10 (section générée)
Ce qui a été ajouté, remplacé ou écarté parmi les optimisations Hone.gg, OptiCore, network_optimizer et GAME V1 (détail dans [[optis_120.py]]). Liste aussi tout ce qui a été **écarté et pourquoi** (sécurité, placebo, réglages du PC de test, ce qui touche ce que lit le vérificateur RBW…), et trois idées « pas encore faites » (code de l'app à tester sous Windows).

### Réglages risqués retirés (section générée)
Les 17 réglages retirés avec leur raison, puis, pour chaque motif de ligne risquée, les packs où il a été retiré (ex. « CoalescingTimerInterval (blue screen) : amd_advanced, gpu_amd, gpu_general, gpu_nvidia, hitreg_suite, pow_main, pow_throttling, pow_timer »), puis le paragraphe sur la case « point de restauration » (1.1.8).

### Sections écrites à la main
- **Plan Rago Low Latency (1.1.9)** : le fichier `LowLatency.pow` fourni par Sofiene le 10/10 (ruche exportée par `powercfg -export`, 81 réglages, issu d'un plan « IIIEXOIII LOW LATENCY ») ; ce qui est gardé ; trois réglages corrigés à l'import (repos processeur, mot de passe au réveil, bouton d'alimentation) ; renommé « Rago Low Latency » ; annulation et test `rago_power_plan_imports_on_windows`.
- **Version 1.1.14** (15/10) : repartie de la 1.1.10 avec seulement trois changements de scripts (RBW Mod, écran bleu RAG-67 `CoalescingTimerInterval`, chemins avec caractère spécial dans le nom du compte), plus la remise en arrière-plan à la fin de licence, le chiffrement de `applied.json` et `history.json`, la réparation du préréglage réseau 3 (RAG-68, bloc vide), le plan gratuit réduit puis élargi à 11 réglages, la remise sur les clés protégées. Elle cite des choses volontairement **laissées hors** de cette version (RAG-60, 64, 65, 66, 68 en partie, 74, « finitions 2 » de la revue du 13/10 dont un `tools/expansion.py` qui n'existe pas dans le dépôt).
- **Version 1.2.0** (17/10) : refonte en verre et nouvelles fonctions « sans rien changer aux optimisations ».

## Écarts à connaître (au 10/11)
- La section manuelle « Version 1.2.0 » a été écrite le 17/10, au début de la 1.2.0. Elle dit que les optimisations ne changent pas, mais les optimisations du 21/10 (20 réglages ajoutés, d'autres remplacés) sont entrées dans la même version 1.2.0 et sont décrites dans la section générée du même nom. Les deux sont vraies pour leur date : la phrase vise les optimisations **existantes**. À lire ensemble ([[Version 1.2.0]]).
- **Aucune section pour la 1.2.1, la 1.2.2 ni la 1.3.0.** Or la 1.2.2 a changé le preset Minecraft PvP (sans `win_fullscreen` ni `ping_packets:hitreg`, 01/11) et la 1.3.0 a élargi le plan gratuit (73 réglages, 30 actifs à la fois, [[free.json]]). Ces changements ne touchent pas le texte des scripts, ce qui explique l'absence ; ils sont décrits dans [[Presets]], [[Version 1.3.0]] et [[Catalogue des tweaks]].
- Les sections manuelles citent des chiffres de leur époque (« 198 réglages distincts », « 8 » puis « 11 réglages gratuits ») : historiques, pas actuels.

## Liens avec le reste
- Écrit par [[build_catalog.py]] et [[build_catalog_v6.py]] via [[corrections_md.py]].
- Cité comme historique par [[Catalogue des tweaks]] et [[Sources]].

## À savoir avant de modifier
- **Ne jamais modifier à la main au-dessus du marqueur** : ce serait écrasé au prochain `npm run catalog`. Corriger la source (`V6_NOTES`, `optis_120.NOTES`, `safety.notes`, le texte de [[build_catalog.py]]) puis régénérer.
- Pour un compte rendu de version ou de correctif, ajouter une section **à la fin du fichier**.
