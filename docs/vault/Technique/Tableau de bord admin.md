---
type: technique
tags: [technique, serveur, admin]
maj: 2026-11-10
---
# Tableau de bord admin (`/admin`)

L'outil où Sofiene voit tout le projet et gère les joueurs sans passer par les commandes Railway. Demandé par Sofiene le 10/11 : « un tableau de bord qui permets de tout voir le max d'info et de possibilité de gestion des utilisateurs au meme endroit ». Code dans le [[Serveur de licences]] (`licensing/src/admin.js`, `admin-views.js`, `sales.js`, `support.js`). **Dans `staging` depuis le 10/11 (PR #77, « fusionne » de Sofiene), pas encore en prod** : en prod, `/admin` reste l'ancienne page (pop-up, contrôles Stripe et Discord, tests réseau).
Le même jour, Sofiene a trouvé l'interface « baclé remplis de bug pas optmisé » et demandé « la meilleur interface possible comme si ça devait etre commercialisé » : refonte complète dans la **PR #82, fusionnée dans `staging` le 10/11 sur « fusionne et push sur staging » de Sofiene**, puis retouchée par la **PR #83** (pas de trous, Stripe seulement dans Services, fusionnée le 10/11 sur « fusionne »), pas encore en prod (voir « Interface » plus bas).

## Accès
- `https://account.rago-optimizer.com/admin` (staging : `rago-staging.up.railway.app/admin`), avec la clé `ADMIN_KEY` (variable Railway, 16 caractères au moins ; sans elle, `/admin` n'existe pas). Cookie de 7 jours limité à `/admin`. Pages en français. **Abel utilise la même clé** (choix de Sofiene du 10/11 pour qu'il ouvre le [[Cerveau du vault]] : « La clé admin complète », donc tout l'admin).
- Chaque action est un formulaire de même origine et est notée dans le journal (`audit`, types `admin.*`). Aucun secret n'arrive dans la page ; les liens (mot de passe, création de compte) sont affichés une seule fois.

## Pages
| Page | Adresse | Contenu |
|---|---|---|
| Vue d'ensemble | `/admin` | encaissé aujourd'hui et ce mois (comparés à la même période d'avant), revenu mensuel récurrent, joueurs Premium, graphique 30 jours, « À traiter » (services en panne, achats non rattachés, paiements échoués, impayés, licences de test, avertissements du démarrage), joueurs et communauté, derniers paiements, répartition Premium, activité récente, services, derniers inscrits |
| Joueurs | `/admin/utilisateurs` | recherche (e-mail, nom public, clé, `cus_…`, `sub_…`, pseudo Discord ; un e-mail, une clé ou un id exact ouvre directement la fiche), filtres Premium, abonnés, essais, résiliés, à vie, offerts, gratuits, bannis avec leur nombre, tri (`?tri=` récents, anciens, vus dans l'app, Premium qui finit, e-mail) ; 50 par page ; export CSV (`/admin/utilisateurs.csv`, même recherche, filtre et tri, noté `admin.users_export`) |
| Fiche joueur | `/admin/utilisateurs/<id>` | licences, PC (nom, Windows, version de l'app, vu quand, IP), liens Stripe, Discord, avis, affiliation, essais, historique, et les actions ci-dessous |
| Offrir et achats | `/admin/achats` | Premium pour un ou plusieurs e-mails (jours, mois, à vie), achats pas encore sur un compte (nouveau lien de réclamation) |
| Ventes | `/admin/ventes` | lues dans Stripe (mode de la clé), heure de Paris : encaissé par période (comparé à la période d'avant), graphiques 30 jours et 12 mois, reçu après frais, par type (abonnements, paiements uniques), abonnements (actifs, essais, impayés, résiliés, revenu mensuel et sur un an, renouvellements à 7 jours), 500 derniers paiements filtrables (`?etat=` payés, remboursés, échoués, litiges), 50 par page |
| Services | `/admin/services` | serveur Railway (environnement, commit, depuis quand, mémoire, avertissements du démarrage), base Supabase (temps de réponse, taille), stockage et [[Mise à jour automatique]], site Netlify, ancienne adresse `rago-production.up.railway.app` (en prod), Stripe, e-mails Resend, rôle Pro Discord, [[Bot communauté Discord]], villes DB-IP. Résultat gardé 1 minute. Dessous : le détail des contrôles Stripe (avec le bouton qui arrête les licences de test), du rôle Pro Discord et du bot communauté. **Stripe n'est que là** depuis le 10/11 (Sofiene : « pas besoin de les avoir aussi dans sites et promo ») |
| Tests réseau | `/admin/reseau` | la page des [[Test réseau|tests réseau]] ([[Proxy]]) |
| Site et promos | `/admin/site` | pop-up de réduction (formulaire à gauche, état et aperçu à droite), création de codes promo Stripe, avis du site ([[Promotions et affiliation]]) |
| Journal | `/admin/journal` | tous les événements, filtrables (actions admin, licences, comptes, PC, abonnements, affiliation), 100 par page ; le filtre « affiliation » ne montre pas `referral.created`, et les types `discord.*`, `affiliate.*`, `trial.*`, `review.*`, `profile.photo`, `update_download`, `license.duplicate`, `license.subscription_stopped`, `user.email_verified` s'affichent sans libellé |
| Cerveau | `/admin/cerveau` | le vault du projet en graphe animé, avec un lecteur pour chaque note et chaque fichier du dépôt ; section « Projet » du menu ; PR #85 du Cerveau, fusionnée dans `staging` le 10/11, pas en prod. Détail : [[Cerveau du vault]] |

## Interface (refonte, PR #82)
- Menu fixe à gauche groupé en Pilotage, Joueurs, Produit, Système, avec le nombre de joueurs, une pastille rouge pour les achats non rattachés et un point vert, orange ou rouge pour l'état des services ; sur téléphone, un tiroir qui s'ouvre sans JavaScript. Mode Stripe (live, test, absent) et environnement visibles dans le menu.
- Sur un serveur qui n'est pas la prod (staging), un bandeau jaune rappelle que Stripe y est en mode test : les ventes et abonnements affichés ne sont pas les vrais (réponse à la question de Sofiene sur les « 4 abonnements actifs » du 10/11 ; le vrai chiffre est sur l'admin de prod).
- Cartes, chiffres clés avec évolution, graphiques en barres (30 jours, 12 mois), journal groupé par jour, tables à en-tête fixe et lignes cliquables.
- **Pas de trou** (demande de Sofiene du 10/11 : « fait en sorte que y a pas de trou dans l'interface que les élément soit bien disposé ») : les cartes côte à côte finissent toujours à la même hauteur, une liste (activité, historique du joueur) remplit la place restante et défile dedans, les grilles (services, chiffres, contrôles Stripe) remplissent leur dernière ligne. Ventes : les deux graphiques côte à côte, puis « Reçu sur le compte Stripe » et « Par type » (panier moyen, remboursé, paiements ratés). Fiche joueur : Premium et historique | Gérer l'accès et essais ; Discord et affiliation | avis ; suppression en bas sur toute la largeur.
- Recherche partout avec `/` ou Ctrl+K ; confirmation dans une fenêtre avant une action importante (en rouge si elle est irréversible) ; bouton occupé pendant l'envoi ; boutons copier (e-mail, clé, liens) ; messages de succès qui disparaissent seuls, erreurs qui restent ; recharger la page ne renvoie pas un formulaire.
- Feuilles à part `licensing/public/admin.css` et `public/admin.js` (plus rien de l'admin dans `account.css` ni `views.js`) ; chaque page et chaque formulaire marchent sans JavaScript ; CSP stricte gardée (aucun style dans le HTML).
- Rapidité : les ventes (5 min) et les services (1 min) sont gardés et relus en arrière-plan ; une page n'attend Stripe qu'au tout premier chargement, et les deux sont préchargés 5 s après le démarrage. La vue d'ensemble attend au plus 1,5 s le premier contrôle des services. Bouton « Actualiser » pour forcer (`?frais=1`).
- Vérifiée page par page dans Chromium, en 1440 px et 390 px (téléphone) ; tests `test/sales.test.js` (sommes, revenu mensuel, jours de Paris, cache).

## Actions sur un joueur
Offrir des jours ou des mois (un abonné Stripe voit ses prochains paiements décalés) · Premium à vie · révoquer / rétablir une licence · libérer le PC · lien de mot de passe (1 h) · rattacher un achat · résilier en fin de période, annuler la résiliation ou arrêter tout de suite (sans remboursement) · **bannir** / lever le bannissement · remettre le rôle Discord à jour, délier Discord · masquer ou afficher l'avis, retirer la photo, changer le nom · recalculer l'affiliation · supprimer le compte (RGPD, il faut recopier l'e-mail).

## Bannissement (nouveau, PR #77)
Un compte banni (`users.banned_at`, `banned_reason`) ne se connecte plus nulle part (site, Google, Discord, app, compte de l'app), ses sessions sont fermées, sa licence est révoquée (raison `banned`), son abonnement Stripe est arrêté et le rôle Pro retiré. L'app reçoit l'erreur `account_banned` et affiche le message du serveur : **jamais testé sur Windows**. Lever le bannissement rend la licence si elle est encore valable (à vie, temps offert pas fini, abonnement encore actif dans Stripe).

## Ce qui reste dans le terminal
`npm run admin -- export-keys` (clés à sauvegarder, jamais affichées dans une page), les commandes de test (`create-user`), `growth` (le même rapport que `/growth` sur Discord) et `discord` sans e-mail (resynchronise tous les comptes ; le serveur le fait seul toutes les 5 min). Toutes les autres commandes ont leur bouton ; elles marchent toujours ([[admin.js (script serveur)]]).

## Pas encore surveillé
Serveurs Rago Route (Vultr) et facturation de Railway, Supabase et Netlify.

## Code

[[admin.js (serveur)]] (routes, garde `ADMIN_KEY`, données, actions, contrôles des services), [[admin-views.js]] (pages), [[admin.js (page admin)]] (script du navigateur), `admin.css` ([[Styles du serveur (CSS)]]), [[sales.js]] (ventes), [[support.js]] (suppression). Carte : [[Code du serveur]].
