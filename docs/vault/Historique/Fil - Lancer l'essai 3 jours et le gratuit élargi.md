---
type: historique
tags: [historique]
maj: 2026-11-10
---
# Fil - Lancer l'essai 3 jours et le gratuit élargi

Histoire du fil « Lancer l'essai 3 jours et le gratuit élargi » (`cmsg_01Mb4hMYwRFctv5wE2NGiASiWXmFzTS7YZRbMt2K5XiK6m`), ouvert par le coordinateur le 01/11 à 15:35 UTC sous le titre **« Sortir l'app 1.2.2 »** (CONFIRMÉ : c'est son premier message), dernière activité le 04/11 à 23:18. **Terminé.** C'est le fil qui a fait la [[Version 1.3.0]] (PR #70). Retour à [[Fils du projet]]. Heures en UTC. Statut : CONFIRMÉ (lu dans le fil le 10/11).

## 01/11 : la 1.2.2
- Mandat (décision du 01/11, [[Décisions]]) : « il faut lancer la correction avec le passage de la désinstallation des app préinstallées en gratuit et mettre à jour grâce à l'auto update ».
- 15:42 : PR #70 vers `staging`, en 1.2.2. Le preset Minecraft PvP passe de 22 à 20 réglages ([[Presets]]) :
  - retrait de « Plein écran » (`win_fullscreen`, option de Windows 11 pour les jeux fenêtrés, qui écrivait l'inverse de « Couper Game DVR » du même preset ; suspect du curseur perdu du 29/10) ;
  - retrait de « Optimisation des paquets (hitreg) » (`ping_packets: hitreg` : RSS coupé, MTU 1400, fenêtre TCP bridée ; doublon du [[Packet Optimizer]] et suspect du ping instable, RAG-87).
  - La cause a été trouvée en lisant le code, sans test sur Windows. Les joueurs qui avaient déjà appliqué le preset gardent leurs réglages.
- [[Page Outils]] : la désinstallation des applis préinstallées devient gratuite (« Oui, tout gratuit », 01/11).
- 15:58 : CI Windows verte ; la PR attend « fusionne ». **La 1.2.2 n'est jamais sortie seule** : elle est entrée dans la 1.3.0.

## 04/11 : la suite ajoutée d'un coup
- 19:59, la demande : « ok parfait on va ajouter directement la suite : 50 - 100 tweaks gratuit (laisser les meilleur et les plus demandé en premium surtout network et hitreg) mais seulement 30 slot de tweaks disponible gratuitement a activé simultanement. Il faut aussi rajouter le login sur l'app avec discord ou google et une possibilité d'essai gratuit de 3jours mais il faut renseigner sa carte et au bout de trois 3 jours ça débite directement il doit résilier pendant la période des 3 jours il faut changer le site pour orienter vers cet essaie gratuit qu'il soit visible et pour le site vérifie qu'il est bien conforme à toute les règles de RGPD et qu'on est en règle ».
- 20:06 : la branche de prod est fusionnée dans la branche de la PR (site de prod, serveur, [[Bot communauté Discord]] réunis ; 92 tests serveur). Plan gratuit : **73 réglages ouverts (59 tweaks)** du module Windows, du stockage, du nettoyage des pilotes et de Restaurer, **30 actifs au plus**, limite tenue par le moteur Rust et par l'interface ([[Offres et prix]]).
- 20:15 : connexion à l'app par Google ou Discord ([[Connexion Google et Discord]]) ; essai de 3 jours avec carte, débit automatique, un essai par carte et par e-mail, e-mail qui rappelle la date de fin, résiliation en un clic sur la page compte.
- 20:24 : PR #70 renommée en 1.3.0. RGPD : pas de traceurs, durées de conservation appliquées par le serveur ; mais **pas en règle pour vendre** : il manque le nom, l'adresse et le SIREN du vendeur, et « TVA non applicable » est faux tant que personne n'est inscrit ([[Conformité juridique]], q44 à q46, q49). Questions q47 (sortir la 1.2.2 tout de suite ou avec la suite ?) et q48 (quelle offre est débitée après l'essai ?).
- 21:59 : Sofiene envoie le document des 4 fonctions gardées de la maquette ([[Fil - Lister les fonctionnalités de la maquette]]) : « Il faut rajouter ses fonctionnalités ».
- 22:36 : ajoutés à la PR #70 : [[Analyse du PC]] (« Analyze my PC » : réseau, FPS de la dernière partie, écran, mémoire, processeur, pilote, Windows ; chaque point dit Free, Premium ou « à faire soi-même » ; pas de note globale), avant/après mesuré (FPS comparés après la partie suivante), fenêtre Premium avec les vrais prix Stripe (annuel par défaut) et l'essai, résiliation dans Paramètres (écran « Before you cancel », deux boutons de même taille, e-mail de confirmation) ([[Abonnement dans l'app]]). Laissés de côté : rappel 7 jours avant le renouvellement (q40), remboursement de 14 jours (q36), parrainage (q39), variante du Packet Optimizer (q41) ; ajout de q50 (seuils de l'analyse).
- 22:49 : « donne moi le lien de l'installateur de l'app avec les nouvelles features et le lien du site avec l'essaie gratuit et les correction RGPD » → aperçu Netlify `deploy-preview-70`.
- 22:55 : carte « Fusionner PR #70 dans staging ? » → « Oui » : **PR #70 fusionnée dans `staging` le 04/11 à 22:55**. 23:06 : exe « Rago Optimizer Staging » (s'installe à côté de l'app normale), site de staging, prix du serveur de test 5,99 $, 29,99 $ et 59,99 $, essai dans le mode test de Stripe.
- 23:18 : Sofiene passe aux proxys → fil [[Fil - Développer les proxys Minecraft]].

## Ce qui a changé après le fil
- 10/11 (réponses aux questions, PR #76) : une seule grosse sortie avec Rago Route (q47 : plus de 1.2.2 seule), essai suivi du **mensuel** (q48), **plus de remboursement** (q36), Packet Optimizer entièrement Premium, normes de l'analyse par joueur (q50) ; q68 confirme 73 réglages dont 30 actifs.
- Rien n'a été testé sur Windows par le fil. La 1.3.0 n'est pas en prod au 10/11.

Liens : [[Version 1.3.0]] · [[Offres et prix]] · [[Décisions]] · [[Chronologie du projet]]
