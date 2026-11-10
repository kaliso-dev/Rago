---
type: registre
tags: [décision]
maj: 2026-11-10
---
# Décisions

Registre daté des décisions de Sofiene. **La plus récente prime.** Citations entre « » = mots de Sofiene. Voir [[Règles de travail]], [[Questions ouvertes]], [[Journal]].

## App et versions
| Date | Décision | Statut |
|---|---|---|
| 10/11 | Admin : corriger l'affichage des ventes en plusieurs devises (« ok donc ça aussi », sur sa capture de la page Ventes) | fait, PR #84 fusionnée dans `staging` le 10/11 ([[Tableau de bord admin]]) |
| 10/11 | Cerveau du vault : une « vision graphique du cerveau comme obsidian » où l'on voit les « connexions neuronales », qui ouvre et lit n'importe quel fichier, « juste accessible depuis l'interface admin » ; Abel y accède avec **la clé admin complète** (choix de Sofiene sur la carte : pas de clé à part, pas de sous-domaine) | code fini, PR vers `staging` en attente de « fusionne » ([[Cerveau du vault]]) |
| 10/11 | Le vault doit être « le plus détaillé possible » et « absolument tout expliquer du projet dans les moindres détails » : une note par fichier de code (dossier `Code/`), l'histoire complète (dossier `Historique/`) | fait le 10/11 ([[Projet]], [[Mettre à jour le vault]]) |
| 10/11 | Admin : les contrôles Stripe seulement dans Services (« dans services y a tout les services y compris ceux de stripe donc pas besoin de les avoir aussi dans sites et promo ») et aucun trou dans l'interface (« fait en sorte que y a pas de trou dans l'interface que les élément soit bien disposé ») | fait, PR #83 fusionnée dans `staging` le 10/11 sur « fusionne » de Sofiene ([[Tableau de bord admin]]) |
| 10/11 | Quota Supabase dépassé (pas une suppression) : « je passerai en pro avant décembre ou alors on migrera de supabase vers un autre service je te tiendrai au courant avant le 5 décembre » | DÉCIDÉ, choix final avant le 05/12 ([[Supabase]]) |
| 10/11 | Rago Route, partage de connexion du téléphone : « il faut que le partage par cable fonctionne mais il faut que ça fonctionne le plus facilement possible pour l'utilisateur et avec n'importe quel cable » (carte « Garder l'USB et le déboguer ») ; « faut que le diagnostic disent exactement pourquoi ça ne marche pas » ; « ok fait un exe de test pour tout ça que je testerai en rentrant » | fait : diagnostic en 5 étapes, exe de test sur `staging` (10/11), à tester par Sofiene ([[Proxy]]) |
| 10/11 | Le correctif CI doit aussi aller en prod, sans le reste de `staging` : « hein pourquoi staging il faut en prod […] j'espère que tu ne push pas la version en cours de dev de l'app » | fait, PR #81 (seul le correctif CI, 10/11) ([[CI GitHub Actions]]) |
| 10/11 | Une archive de tous les problèmes : « ajouter un document dans le vault qui ne sera pas lu mais qui contiendra tout les problème qu'on a rencontré au fil du temps avec rago optimizer et dans l'avenir claude pourra le consulter » | fait, [[Historique des problèmes]] (PR #79) |
| 10/11 | Interface de `/admin` à refaire : « l'interface est baclé remplis de bug pas optmisé dégeulasse applique toi et fait la meilleur interface possible comme si ça devait etre commercialisé après » | fait, PR #82 fusionnée dans `staging` le 10/11 sur « fusionne et push sur staging » de Sofiene ([[Tableau de bord admin]]) |
| 10/11 | Un outil admin qui centralise tout : « un tableau de bord qui permets de tout voir le max d'info et de possibilité de gestion des utilisateurs au meme endroit », « sans passer par les commandes railways », avec « les vente stripe du jour du mois et sur la totalité du projet », tous les services et les tests réseau | fait, PR #77 fusionnée dans `staging` sur « fusionne » (10/11) ([[Tableau de bord admin]]) |
| 10/11 | Minutes GitHub Actions : rendre le dépôt privé `network-server-rago` public (choix « Le rendre public » sur la carte du fil), plutôt qu'alléger sa CI, un runner sur son PC ou GitLab | DÉCIDÉ, à faire par Sofiene dans Settings ([[CI GitHub Actions]]) |
| 10/11 | « rago doit passer en privé mais y a plus de minutes ducoup » puis « je ne peux pas payer je le passerai en public et je mettrai en privé moi meme quand j'ai besoin pendant ce mois » : `rago` public en novembre (privé à la main par Sofiene au besoin), privé à partir de décembre ; pas de budget Actions | DÉCIDÉ ([[CI GitHub Actions]]) |
| 10/11 | Réponses de Sofiene sur la page de questions (q36 à q67) : **pas de remboursement** (« il faut modifier pour dire qu'on rembourse pas car maintenant y a l'essaie gratuit ») ; test réseau envoyé sans demander, mais « garder ce point avant de soumettre l'app à la signature » ; parrainage « depuis le site comme avant », pas dans l'app ; **même prix au renouvellement** « sauf si nos prix change », futur plan Ultimate à prix d'appel puis plus cher (« comme norton ») ; **[[Packet Optimizer]] en Premium** (« mets le en premium dans la prochaine version de prod ») ; **une seule grosse sortie** : « l'app avec les 30 opti 15 slots essaie gratuit connexion google/discord et proxy va sortir en une fois » (pas de 1.2.2 seule) ; après l'essai, **mensuel seulement** (5,99 $) ; seuils de l'[[Analyse du PC]] « personnalisé en fonction de chaque utilisateur » ; code à modifier « pour enlever straigh et signé par KALISO et RAGO » | DÉCIDÉ ; codé dans la PR #76, fusionnée dans `staging` le 10/11. q68 : « 30 opti 15 slots » était une erreur, le plan gratuit reste 73 réglages dont 30 actifs (« ah nan oui c'est bien ça 73 réglages gratuits dont 30 actifs pardon ») ([[Offres et prix]], [[Conformité juridique]]) |
| 10/11 | Organisation du travail avec Claude : un seul projet, un fil par tâche, une fiche technique par brique (q56) ; Claude peut pousser le vault seul sur `staging` (« Oui, le vault seulement », q57) ; anciens dossiers du dossier partagé supprimés (« Non, supprime-les », q58) | DÉCIDÉ, fait ([[Règles de travail]], [[Sources]]) |
| 09/11 | Rago OS, retours du soir puis réponses aux questions : Win après relance qui ouvre le menu Démarrer à corriger ; Rago Notes « accessible de puis le spotlight » ; boutons et Météo « moins apple », Météo sans animation d'ouverture ; widget Météo en mode clair ; barre en jeu « désactiver dans les paramètres pour avoir son jeu en full screen » ; « il faut bien garder deux bouton mais il faut qu'on comprenne la différence » (modes jeu) ; animations du Dock « désactiver ses animations dans les paramètres » ; « transforme le widget heure en app » (« 4 oui c'est parfait » : alarmes, minuteur, chronomètre, villes) ; « un widget pour pouvoir lancer rago route en un clic et voir l'était des serveurs » ; styles d'horloge « je garde le 2,4,5,6 » ; « ne propose plus le fait de changer de police » ; Minecraft détecté une fois ; widgets et pastille de l'app à ne plus montrer sur Rago OS ni sur Minecraft ; commandes Rago Route de l'app et `RagoOS.exe` ignoré par la barre en jeu, envoyés sur `staging` (« 8 oui c'est parfait ») | DÉCIDÉ, fait dans test5 et dans `staging` (PR #74) ([[Rago OS]]) |
| 09/11 | Rago OS : plus d'optimisation durable à l'installation, « Oui, tout en session » (carte de décision, q53) : les services ne sont en pause que pendant que Rago OS tourne | DÉCIDÉ, fait dans test4 ([[Rago OS]]) |
| 08/11 | Rago OS (soir) : « quand j'appuie sur ma touche windows seul le dock touchpad doit s'ouvrir » ; « stopper le plus de services inutiles possible mais ne pas toucher à des paramètre que rago optimizer touche déjà » ; « personnalisé un peu plus pour ne pas perdre en crédibilité » (moins Apple) ; « supprimer complétement l'écran de veille […] et d'ailleurs renomme le écran de veille » (l'écran de verrouillage) ; Rago OS « se lance instantanément au démarrage du pc […] par défaut » ; « si je quitte rago os tout les paramètre doivent revenir comme ceux d'origine et quand je lance tout se réactive pendant l'animation de chargement » | DÉCIDÉ, fait dans test4 ([[Rago OS]]) |
| 08/11 | Rago OS : « garde uniquement le premier thème et le deuxième [...] ainsi que le dernier » (Rago, Tournoi, Pétale), coins arrondis « sur chaque thème » ; textes toujours visibles « quelques soit le mode sombre ou clair » ; Dock qui apparaît seulement « quand la souris reste vraiment contre le bord de l'écran » ; île : « pas besoin d'afficher le ping ou les fps car la game bar de l'app rago optimizer l'affiche déjà », sauf « à la fin quand on ferme le jeux [...] les moyenne et le temps de jeux », sinon « épuré » | DÉCIDÉ, fait ([[Rago OS]]) |
| 08/11 | Rago Route : « j'ai pas besoin de tester en vrai je sais que c'est bon tu peux push sur staging il faut développer le reste des feature maintenant » (accès Premium poussé sur `staging` ; chiffrement, paquets de secours, 4G sur Windows et choix de la sortie développés) | DÉCIDÉ, sur `staging` ; protocole 2 poussé le 08/11 au soir (« Oui, je réinstalle juste après ») ([[Proxy]]) |
| 08/11 | Rago Route réservé au Premium : « Oui, tout de suite » (carte de choix) : jeton signé par le serveur de licences, vérifié par la sortie Paris, relais limité à la sortie Rago, ancien proxy simple fermé ; sur `staging` d'abord, Sofiene réinstalle les 2 serveurs ensuite. Tranche q51 | DÉCIDÉ, sur `staging` ; serveurs Paris et Frankfurt réinstallés le 09/11 ([[Proxy]]) |
| 07/11 | Rago Route dans l'app : « tu peux push sur staging » (moteur Windows et onglet de l'exe de test) | DÉCIDÉ, fait ([[Proxy]]) |
| 07/11 | Site : « il faut une section dans le site avec un call to action qui redirige vers une page dédié je veux une page dans le design de rago avec full animation pour expliqué chaque fonctionnalité présente ça comme des révolutions » ; « tu peux push sur staging les modif du site » | fait : `route.html` et section de l'accueil sur le site de staging (07/11), pas en prod ([[Site]], [[Proxy]]) |
| 07/11 | Rago Route : « Encore des tests sur le Mac » avant la version Windows dans l'app (carte de choix) : câble seul, puis 4G de l'iPhone en plus du Wi-Fi | fait le 07/11, puis « OK let's go » pour la version Windows (07/11) ([[Proxy]]) |
| 07/11 | Rago OS est réservé aux joueurs Premium : « ceux qui auront l'os auront forcément rago premium [...] ce sera forcement des permium agit en conséquence » ; sécuriser cet accès est à trouver plus tard (« il faudra trouver le moyen de sécuriser ») | DÉCIDÉ, appliqué dans l'OS ; sécurisation À FAIRE ([[Rago OS]]) |
| 07/11 | Rago OS : « remplacer le logo par celui de l'os » (icône de l'exe et de l'installeur) | DÉCIDÉ, fait : le R de Rago ([[Rago OS]]) |
| 07/11 | Rago OS : « chercher n'importe quelle tweaks depuis spotlight et l'activer », « rechercher des onglet genre network et que ça les ouvre directement dans l'app », applis « en full screen en auto », barre des tâches qui s'ouvre « en approchant la souris » | DÉCIDÉ, fait ([[Rago OS]]) |
| 07/11 | Rago OS : « je veux des thèmes beaucoup plus travailler et personnalisé », passer l'OS « en revu complétement », améliorer « le dynamic island et les widget » | DÉCIDÉ, en cours ([[Rago OS]]) |
| 07/11 | Pont Rago OS et Mode jeu total : « fusionne » (PR #73 dans `staging`) | DÉCIDÉ, fait ([[Rago OS]]) |
| 07/11 | [[Rago OS]] prend la charte de l'app 1.2.1 (carte de choix) | DÉCIDÉ, fait ([[Charte graphique]]) |
| 07/11 | Rago OS doit être l'extension de l'app : « essaie de vraiment connecter l'app et l'os », avec une interface « épuré et simplifié » | DÉCIDÉ, en cours ([[Rago OS]]) |
| 07/11 | Thème Rago par défaut à l'installation de Rago OS, mais « tout personnalisable » (thème clair gardé) et d'autres thèmes Rago | DÉCIDÉ, fait ([[Rago OS]]) |
| 07/11 | Services Windows : « Les deux », coupés en permanence par l'app pour les sûrs, et le reste en pause à chaque partie lancée depuis Rago OS (Mode jeu total) | DÉCIDÉ, codé ([[Rago OS]], [[Mode jeu]]) |
| 04/11 | Fonctions de la maquette « Fonctions gardées de la maquette de l'app » : « Il faut rajouter ses fonctionnalités » (analyse du PC, avant/après, fenêtre Premium avec les prix, résiliation dans l'app) | fait dans la PR #70, fusionnée dans `staging` le 04/11 ; sort avec la 1.3.0 ([[Analyse du PC]], [[Abonnement dans l'app]]) |
| 04/11 | Plan gratuit élargi : « on va ajouter directement la suite : 50 - 100 tweaks gratuit (laisser les meilleur et les plus demandé en premium surtout network et hitreg) mais seulement 30 slot de tweaks disponible gratuitement a activé simultanement » | fait dans la PR #70 (`staging`, 04/11) : 73 réglages gratuits dont 30 actifs, confirmé le 10/11 (q68) ([[Offres et prix]]) |
| 04/11 | Connexion à l'app avec Discord ou Google (« Il faut aussi rajouter le login sur l'app avec discord ou google ») | fait dans la PR #70 (`staging`, 04/11) ([[Connexion Google et Discord]]) |
| 04/11 | Essai Premium : « une possibilité d'essai gratuit de 3jours mais il faut renseigner sa carte et au bout de trois 3 jours ça débite directement il doit résilier pendant la période des 3 jours » ; le site doit l'orienter vers cet essai et être vérifié pour le RGPD | fait dans la PR #70 (`staging`, 04/11) ; après l'essai, le mensuel (10/11, q48) ; site pas en règle pour vendre tant que l'adresse et le vendeur manquent ([[Offres et prix]], [[Conformité juridique]]) |
| 01/11 | Version 1.2.2 : correctif du preset Minecraft PvP + désinstallation des applis préinstallées gratuite, envoyée par la mise à jour automatique (« il faut lancer la correction avec le passage de la désinstallation des app préinstallées en gratuit et mettre à jour grâce à l'auto update ») | REMPLACÉE : entrée dans la PR #70 (devenue 1.3.0, fusionnée dans `staging` le 04/11), puis « une seule grosse sortie » le 10/11 (q47) ; pas de 1.2.2 seule ([[Version 1.3.0]]) |
| 01/11 | Bot communauté Discord : « Il faut le tester et le passer en prod » | EN COURS : PR #71 ouverte vers la prod depuis le 01/11 ; test d'Abel et `DISCORD_COMMUNITY=1` sur Railway prod pas faits au 10/11 ([[Bot communauté Discord]]) |
| 01/11 | Anciennes PR #16, #50, #51 et #60 fermées (« si toutes les fonctionnalités sont déjà présentes sur la version actuelle tu peux les fermer ») ; vérifié, branches gardées | exécuté ([[Branches et environnements]]) |
| 01/11 | Linear remis à jour à partir du vault (« Oui, fais-le »), et à tenir à jour pour continuer à l'utiliser | exécuté ([[Linear]]) |
| 01/11 | Les questions à Sofiene se posent **automatiquement** sur la page « Questions du vault Rago » dès qu'un Claude en a, pour tenir le vault à jour (« désormais tu devras le faire automatiquement ») | DÉCIDÉ ([[Mettre à jour le vault]], [[Questions ouvertes]]) |
| 01/11 | Connexion à l'app avec Google ou Discord (« c'est important en effet ») | fait dans la PR #70 (`staging`, 04/11) ([[Connexion Google et Discord]]) |
| 01/11 | Les outils restent gratuits (« c'est des outils indispensables »), y compris la désinstallation des applis préinstallées (« Oui, tout gratuit ») | DÉCIDÉ ([[Page Outils]]) |
| 01/11 | Signature de code de l'exe : prévue, pas avant d'avoir le budget | PRÉVU ([[App Windows]]) |
| 05/11 | Naissance de Rago Route : carte « Prototype du double trajet » ; « c'est incroyable le double trajet anti lag plus l'optimisation de la route » ; 06/11 : « Bon c'est partie développons ça ce soir » | DÉCIDÉ, prototype le 06/11 puis moteur dans l'app ([[Proxy]], [[Fil - Développer les proxys Minecraft]]) |
| 05/11 | Proxy : 2 serveurs Vultr (Frankfurt, Mumbai), tout configurés tout de suite, sans journée de test (« je veux tout config maintenant 5$ c'est rien ») | DÉPASSÉE : Frankfurt, Mumbai, New York et Chicago testés le 05/11, le trajet direct reste le plus rapide depuis la France ; remplacée par Rago Route (serveurs Paris et Frankfurt, 06/11) ([[Proxy]]) |
| 04/11 | Proxy relancé : « maintenant je veux qu'on développe les proxy » ; l'app propose le meilleur proxy après le test réseau (remplace le « pas maintenant » du 01/11) | devenu Rago Route le 05/11 (voir plus haut) ([[Proxy]]) |
| 31/10 | **Règle n°1 : le vault doit correspondre en tout point à l'état actuel du projet** ; chaque Claude détecte les changements et abandons, met à jour ou supprime, et demande en cas de doute | DÉCIDÉ ([[Mettre à jour le vault]]) |
| 31/10 | 1.2.1 déposée dans Supabase par Sofiene | exécuté ([[Version 1.2.1]]) |
| 29/10 | « ok tout fonctionne push tout sur la prod » : serveur (mises à jour + collecte réseau) en prod, 1.2.1 construite | DÉCIDÉ, exécuté ([[Version 1.2.1]]) |
| 29/10 | Tests réseau envoyés sans demander : carte « Automatique », avec une ligne dans la politique de confidentialité ; avant la prod, « il faut vérifié que la nouvelle version récupère bien les stats et les villes des utilisateurs pour les futurs proxy » | DÉCIDÉ, fait dans la 1.2.1 (PR #63, #64, #65) ([[Test réseau]]) |
| 28/10 | « fait moi une version qui vérifie des le lancement au lieu d'avoir a attendre » (mise à jour automatique) | fait, PR #62 ([[Mise à jour automatique]]) |
| 22/10 | Barre en jeu : « changer le raccourci par défaut car celui ci ouvre le gestionnaire des taches et que l'indiquateur de ping fps soit à gauche de l'écran » | fait : Alt+X, pastille à gauche ([[Barre en jeu]]) |
| 22/10 | GAME V1 : carte « Sans fichiers de jeu » (carte graphique performante et mode hautes performances le temps de jouer, rien d'écrit dans les fichiers des jeux) | fait dans la 1.2.0 ([[Catalogue des tweaks]]) |
| 22/10 | Dépôt `rago` public pour compiler gratuitement : « j'ai passé le repo en github en public pour que tu puisse compiler » | en vigueur jusqu'au 30/11 ; privé à partir du 01/12 (décision du 10/11) ([[CI GitHub Actions]]) |
| 17/10 | Bibliothèque : jeux détectés automatiquement avec leur image ; proxy à moindre coût, sinon mis de côté | DÉCIDÉ ([[Bibliothèque de jeux]], [[Proxy]]) |
| 16/10 | Refonte : rester dans la charte mais s'inspirer d'Apple, beaucoup d'effet verre ; **ne rien changer aux optimisations ni au fonctionnement** | DÉCIDÉ ([[Refonte glass]]) |
| 16/10 | 3 tweaks de confort passent en gratuit (notifications, bulles et suggestions, Copilot et Recall) → 11 gratuits ; « ne donne pas les meilleurs optimisations » | DÉCIDÉ ([[Offres et prix]]) |
| 15/10 | Plan gratuit : seulement des réglages du module Windows et les outils de Restaurer ; rien de Latence, Réseau, Hitreg ni Minecraft | DÉCIDÉ |
| 15/10 | 1.1.13 mise de côté, 1.1.10 = référence ; la suite = [[Version 1.1.14]] (base 1.1.10 + correctifs) | DÉCIDÉ puis exécuté |
| 15/10 | « non personne n'a la 1.1.12 c'est toi qui doit mettre à jour linear tu peux appelé la nouvelle version 1.1.14 et tu dois construire la nouvelle version à partir de la 1.1.10 » ; carte « que mettre dans la 1.1.14 » → « Tout » | exécuté (PR #52) ([[Version 1.1.14]]) |
| 14/10 20:43 | « il faut qu'il ne puisse pas faire stop à la déconnection et que ça désactive tout avant obligatoirement et à la désinstallation aussi il faut que tout les paramètre revienne dans l'état ou ils etaient » | DÉCIDÉ ([[Remise à zéro]]) |
| 14/10 | Sécuriser l'app « à 100 % » (chiffrement des scripts) | demande en vigueur |
| 13/10 | [[RBW Mod]] « Activé » = exactement `Rago-RBW-Fix.ps1` ; « Désactivé » = valeurs Windows ; lancé en dernier | DÉCIDÉ |
| 10/10 | Fin d'abonnement et désinstallation : remise automatique, invisible, impossible à arrêter | DÉCIDÉ ([[Version 1.1.10]]) |
| 08/10 | Une description courte et honnête par tweak, sans gain promis ; tweaks risqués retirés | DÉCIDÉ |

## Offre, prix, marketing
| Date | Décision | Statut |
|---|---|---|
| 01/11 | Pas de plan de visibilité : « le but est de faire des vidéos et de poster sur TikTok, YouTube et Insta » | DÉCIDÉ ([[Marketing]]) |
| 01/11 | Annonces Discord uniquement en anglais | DÉCIDÉ ([[Discord]]) |
| 01/11 | Code RAGO50 supprimé : « la période de lancement est terminée » ; pas de code suivant | DÉCIDÉ ([[Promotions et affiliation]]) |
| 01/11 | E-mail aux titulaires de compte sur la collecte des tests réseau : « il faudrait les envoyer » | À FAIRE ([[Test réseau]]) |
| 29/10 | Plans de prix réécrits : dire ce que chaque plan apporte vraiment (« full rago app on s'en fou ») | DÉCIDÉ ([[Offres et prix]]) |
| 31/10 | Lifetime à **59,99 $** : « le prix est bien à 59,99 c'est normal » | DÉCIDÉ ([[Offres et prix]]) |
| 16/10 | Lifetime : « L'option A mais le prix est passé à 59.99$ pour le life time » (les codes promo marchent aussi sur le Lifetime) | DÉCIDÉ, fait (PR #54, #55) ([[Offres et prix]]) |
| 16/10 | Offre **Lifetime** et page Partners | DÉCIDÉ |
| 14/10 | RBW : 230 $, code RBWS820, 30 % de commission, Premium staff (5 max), 30 jours d'exclusivité | DÉCIDÉ ([[Partenaires et créateurs]]) |
| 14/10 | Un créateur YouTube : accès à vie tant que partenaire, code, 50 % | en attente : Abel lui a dit d'attendre la version avec Rago Route dans l'app (Sofiene, 10/11) ([[Partenaires et créateurs]]) |
| 10/10 | Récompenses Discord VIP / MVP / boosts ; offres partenaires 10 % / 30 % | DÉCIDÉ ([[Discord]]) |
| 10/10 | Anciens acheteurs du `.bat` : 6 mois offerts (rôle Old Premium). L'échéance du 17/10 n'est pas appliquée : toujours donné au 01/11, « ils ont quasiment tous récupéré leur premium » | EN COURS ([[Discord]]) |
| 07/10 | 5,99 $/mois, 29,99 $/an ; affiliation −5 % / 3 filleuls = 6 mois | DÉCIDÉ |
| 09/10 | Aucun gain chiffré promis ; jamais d'avis inventé | DÉCIDÉ ([[Voix et ton]]) |
| 04-05/10 | Tout en anglais en public ; abonnement plutôt qu'achat unique (assoupli le 16/10 par le Lifetime) | DÉCIDÉ |
| 05-06/10 | Charte v1.1 (rouge `#FF3B30`, pas d'orange, arrondis) ; nom « Rago Optimizer » | DÉCIDÉ ([[Charte graphique]]) |

## Abandonné
Une ligne par projet ou fonctionnalité arrêtés, pour qu'aucun Claude ne les relance. Le reste du vault n'en parle plus.
| Date | Quoi | Raison |
|---|---|---|
| 10/11 | Posts LinkedIn automatiques (un par jour, demandés le 04/11) | « je veux supprimer le linkedin automatisé » ; tâche planifiée supprimée, plus aucun post |
| 10/11 | Trailer de la 1.2 (versions v1 à v4, plans Kling) | « finalement on a pas sorti de trailer pour la 1.2 » ; jamais publié |
| 10/11 | Partenariats YouTube et questions marketing à Abel (vidéos, RAG-35, 39, 51, 54, 56) | « il faut supprimer tout ça » ; Abel a dit au partenaire YouTube d'attendre la version avec Rago Route dans l'app |
| 10/11 | Ancien Rago OS sur lequel on démarrait le PC (PR #60) | « il faut le supprimer l'oublié » ; le nouveau [[Rago OS]] sera vendu une fois fini |
| 09/11 | Rago OS : styles d'horloge Classique et Chronographe, choix de la police (thème et écran de veille), animation d'ouverture de la Météo | « je garde le 2,4,5,6 » ; « ne propose plus le fait de changer de police » ; « enlève l'animation d'ouverture de l'app météo » |
| 08/11 | Rago OS : économiseur d'écran (Horloge, Aurore, Diaporama) | « supprimer complétement l'écran de veille car l'écran de vérouillage sert déjà d'écran de veille » |
| 08/11 | Rago OS : 12 thèmes sur 15 (Signal, Néon, Piste, Abysse, Aurore, Magma, Terminal, Horizon, Affiche, Graphite, Rago Clair, Papier) et leurs fonds d'écran ; FPS et ping en direct dans la Dynamic Island, et son coup d'œil enrichi (météo, ping, CPU, RAM, boutons) | « garde uniquement le premier thème et le deuxième [...] ainsi que le dernier » ; la barre en jeu de l'app affiche déjà FPS et ping, île « épuré » |
| 08/11 | Ancien proxy simple (`relay.py`, TCP 25565 et 25566, sans compte) | Remplacé par Rago Route réservé au Premium (« Oui, tout de suite ») ; retiré par le nouveau `install.sh` ([[Proxy]]) |
| 05/11 | Proxy chez OVHcloud | VPS-1 indisponible, VPS-2 (7 €) seulement en Amérique du Nord : « faut pas prendre chez ovh » ([[Proxy]]) |
| 05/11 | Proxy : journée de test sur 6 serveurs Vultr loués à l'heure | « je veux pas ta journée de test » ; serveurs configurés directement ([[Proxy]]) |
| 04/11 | Nouvelle charte graphique : chartes « Affiche » 2.0 à 2.2 et charte finale, sites 2.0 et 2.2, maquettes de l'app (01/11 au 03/11), PR #69 | « on abandonne ce projet » ; q30 : « Non, on garde l'actuelle » ; PR #69 fermée le 04/11 (q32). De la maquette, seules l'analyse du PC, l'avant/après, la fenêtre Premium avec les prix et la résiliation dans l'app sont gardées, construites dans la [[Version 1.3.0]] |
| 01/11 | Point après la première semaine de ventes (RAG-16) et logo Rago à côté des e-mails `noreply@` et `support@` (RAG-21) | « On les abandonne » |
| 01/11 | Série de vidéos courtes « Milli » (mascotte, épisodes #000 à #005) | « arrêtée » |
| 01/11 | Plan de visibilité écrit du 17/10 (17/10 → 15/11) | « on ne suit pas de plan » |
| 31/10 | Rago OS (PR #60, exe de test du 21/10) | « abandonné » (remplacé par le nouveau [[Rago OS]] fait ailleurs) |
| 19/10 | Film publicitaire 4K procédural pour YouTube (demandé le matin même) | « c'est horrible je préfère 1000 fois la première version basé sur la vidéo de clean my mac » ([[Vidéos YouTube]]) |
| 13/10 | PR #46 (RBW Mod), et plus de création pour l'app sans demande | « Non annule tout » |
| 11/10 | PR #26 (astuce de restauration après suppression d'applis) | « inutile » |
| 07/10 | `.bat` gratuit comme produit d'appel | seule l'app est gratuite |
| 07/10 | Point de restauration obligatoire (1.1.7) | retour au fonctionnement 1.1.6 le 08/10 |

## Obsolètes (pour mémoire)
- 15/10 « 1.1.10 = référence » : remplacée dans les faits par la 1.1.14 (16/10) puis la 1.2.x.
- 07/10 « pas d'achat à vie » : remplacée par le Lifetime (16/10).
- 14/10 12:43 « déconnexion = Premium seulement » : remplacée à 20:43.
- 29/10 et 03/11 « 15 slots » ou « 15 optimization gratuite » : remplacé le 04/11 par 73 réglages gratuits dont 30 actifs (confirmé le 10/11, q68).
- 01/11 « Version 1.2.2 » envoyée seule : remplacée le 04/11 (entrée dans la 1.3.0) puis le 10/11 (une seule grosse sortie).
- 17/10 « proxy à moindre coût, sinon mis de côté » : remplacée le 04/11 (« maintenant je veux qu'on développe les proxy »), puis par Rago Route (05/11).
