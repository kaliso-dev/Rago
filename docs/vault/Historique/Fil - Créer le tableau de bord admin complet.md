---
type: historique
tags: [historique]
maj: 2026-11-10
---
# Fil - Créer le tableau de bord admin complet

Histoire du fil « Créer le tableau de bord admin complet » (`cmsg_01Mb4hMYwRFctv5wE2NGiASi8hPR2cwTfeEfEKYMb6dDMD`), ouvert le 10/11 à 14:08 UTC, dernière activité le 10/11 vers 18:49. **État au 10/11 au soir : l'admin et le Cerveau sont en prod** (PR #87) ; le fil attend le retour de Sofiene sur la prod. L'outil lui-même est décrit dans [[Tableau de bord admin]]. Retour à [[Fils du projet]]. Heures en UTC. Statut : CONFIRMÉ (fil et API GitHub lus le 10/11).

## La demande (14:08)
« il y a la page admin qui permet d'accéder au resultat des test réseau et qui donne l'état des services mais c'est pas suffisant. Il faut créer un outil qui permet de tout gérer les accès des utilisateurs de tout faire sans passer par les commandes railways avoir les vente stripe du jour du mois et sur la totalité du projet voir tout les services accéder au test réseau bref un tableau de bord qui permets de tout voir le max d'info et de possibilité de gestion des utilisateurs au meme endroit. Il faut un outil qui centralise toute les donnée du projet au meme endroit et qui permet de gérer les utilisateurs ».

Avant, le support passait par des commandes dans le shell Railway (`npm run admin -- …`, voir [[Serveur de licences]]) et la page `/admin/reseau` des tests réseau (29/10).

## Étape 1 : PR #77 (fusionnée à 14:41)
- Plan : aperçu, joueurs (toutes les commandes Railway remplacées par des boutons, plus un nouveau « Bannir »), services, tests réseau, journal ; même clé `ADMIN_KEY` qu'avant.
- PR #77 ouverte à 14:32 (97 tests serveur) ; le ticket [[Linear]] n'a pas pu être créé (droits refusés). « fusionne » à 14:36 ; fusion à 14:41 après des conflits de vault avec les autres fils du jour.
- 14:47 : « pourquoi y a écrit 4 abonnement actif dans le dashboard me dis pas que c'est vrai ? » → sur staging, Stripe est en **mode test** : ce sont des achats de test. Le vrai chiffre (04/11) était de 33 abonnés ([[Ventes Stripe]]).

## Étape 2 : PR #82 (fusionnée à 15:32)
- 14:51 : « ok c'est bien le dashboard mais l'interface est baclé remplis de bug pas optmisé dégeulasse applique toi et fait la meilleur interface possible comme si ça devait etre commercialisé après ».
- Fait : menu latéral (tiroir sur téléphone), graphiques sur 30 jours et 12 mois, liste « À traiter », recherche par la touche `/`, confirmations avant les actions, export CSV des joueurs, ventes Stripe et état des services relus en arrière-plan (cache) pour ne plus attendre, bugs corrigés (dont une évolution affichée « +5 607 % »), bandeau jaune « Stripe en mode test » sur staging ; 100 tests.
- 15:25 : « fusionne et push sur staging » → fusion à 15:32.

## Étape 3 : PR #83 (fusionnée à 16:06)
- 15:44, retours de Sofiene : la nouvelle interface était vue à l'adresse `/admin/services` au lieu de `/admin` (son onglet était sans doute resté sur l'ancienne page : l'ancienne interface n'existe plus dans le code) ; « dans services y a tout les services y compris ceux de stripe donc pas besoin de les avoir aussi dans sites et promo » ; « fait en sorte que y a pas de trou dans l'interface que les élément soit bien disposé » ; mise en page de la page Ventes ratée.
- Fait : plus de trous (colonnes qui finissent ensemble), graphiques des ventes côte à côte, fiche joueur rééquilibrée, contrôles Stripe seulement dans Services (avec le bouton qui coupe les licences de test), « Site et promos » devient un éditeur de la pop-up avec aperçu.
- 16:05 : « fusionne » → fusion à 16:06.

## Étape 4 : PR #84 (fusionnée à 18:40)
- 16:12 : sur des captures prises avant le déploiement, Sofiene voit des montants en € et en $US mal additionnés (« ok donc ça aussi »).
- Correction : chaque paiement converti par Stripe compte pour son montant dans la devise du compte (€), comme dans Stripe. PR #84 « Admin : les ventes dans une seule devise (les $US convertis par Stripe comptent en €) » ouverte vers `staging` à 16:25. Le même passage a remis le style du champ « Your review » de la page compte (perdu dans la PR #82 avec les styles de l'ancien admin) et corrigé le guide `MISE-EN-LIGNE.md` (les contrôles Stripe sont dans Services). Fusionnée à 18:40, avec la demande de mise en prod.

## Étape 5 : PR #87, l'admin en prod (fusionnée à 18:49)
- 18:32 : « il faut le push sur la prod maintenant et qu'il soit fonctionnel normalement tu as du voir mais j'ai ajouté une page cerveau il faut push avec ».
- Lecture retenue : seulement l'admin et le [[Cerveau du vault]] (PR #85, d'un autre fil) ; la [[Version 1.3.0]] qui attend dans `staging` (essai, connexion de l'app, Rago Route, bot communauté, nouveaux e-mails) ne part pas, comme décidé le 10/11 (une seule sortie).
- Portage sur une branche partie de la prod (`claude/project-thread-49sqc3-prod`) : fichiers de l'admin et du Cerveau repris de `staging`, bannissement (refusé aussi par l'app et le site), table `trials` et colonnes `banned_at`/`banned_reason` ajoutées au démarrage sans rien supprimer, ancienne page `/admin` retirée ; 93 tests serveur (90 passés, 3 sautés), les 10 pages vérifiées en local. PR #87 ouverte à 18:44, fusionnée à 18:49 ; Railway a redéployé la prod après les tests GitHub, nouvelle page `/admin` servie à 18:54 (vérifiée sans la clé : page de connexion, `/admin/cerveau` renvoie vers elle, styles et scripts servis).

## Ce qu'il faut retenir
- L'admin complet et le Cerveau sont **en prod** depuis la PR #87 (10/11) ; l'ancienne page admin n'existe plus. Le bot communauté n'est pas en prod, d'où « Éteint » dans Services.
- `CERVEAU_GITHUB_TOKEN` est à mettre dans Railway (staging et prod) avant que le dépôt passe en privé.
- Sur staging, les chiffres de ventes sont ceux du mode test de Stripe ; ne pas les prendre pour des vrais.
- Les lignes de [[Journal]] et [[Décisions]] des PR #83, #84 et #87 sont écrites par ce fil sur sa branche.

Liens : [[Tableau de bord admin]] · [[Paiements Stripe]] · [[Railway]] · [[Pull requests]] · [[Chronologie du projet]]
