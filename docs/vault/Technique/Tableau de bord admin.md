---
type: technique
tags: [technique, serveur, admin]
maj: 2026-11-10
---
# Tableau de bord admin (`/admin`)

L'outil où Sofiene voit tout le projet et gère les joueurs sans passer par les commandes Railway. Demandé par Sofiene le 10/11 : « un tableau de bord qui permets de tout voir le max d'info et de possibilité de gestion des utilisateurs au meme endroit ». Code dans le [[Serveur de licences]] (`licensing/src/admin.js`, `admin-views.js`, `sales.js`, `support.js`). **PR #77 vers `staging`, pas fusionnée** (10/11) : en prod, `/admin` reste l'ancienne page (pop-up, contrôles Stripe et Discord, tests réseau).

## Accès
- `https://account.rago-optimizer.com/admin` (staging : `rago-staging.up.railway.app/admin`), avec la clé `ADMIN_KEY` (variable Railway, 16 caractères au moins ; sans elle, `/admin` n'existe pas). Cookie de 7 jours limité à `/admin`. Pages en français.
- Chaque action est un formulaire de même origine et est notée dans le journal (`audit`, types `admin.*`). Aucun secret n'arrive dans la page ; les liens (mot de passe, création de compte) sont affichés une seule fois.

## Pages
| Page | Adresse | Contenu |
|---|---|---|
| Vue d'ensemble | `/admin` | ventes (jour, hier, mois, mois dernier, total, revenu mensuel récurrent, graphique 30 jours), joueurs (comptes, Premium par offre, essais, résiliés, PC actifs, achats non rattachés, bannis, Discord, avis, tests réseau), services, derniers inscrits, dernières ventes, derniers événements |
| Joueurs | `/admin/utilisateurs` | recherche (e-mail, nom public, clé, `cus_…`, `sub_…`, pseudo Discord), filtres Premium, abonnés, essais, résiliés, à vie, offerts, gratuits, bannis ; 50 par page |
| Fiche joueur | `/admin/utilisateurs/<id>` | licences, PC (nom, Windows, version de l'app, vu quand, IP), liens Stripe, Discord, avis, affiliation, essais, historique, et les actions ci-dessous |
| Offrir et achats | `/admin/achats` | Premium pour un ou plusieurs e-mails (jours, mois, à vie), achats pas encore sur un compte (nouveau lien de réclamation) |
| Ventes | `/admin/ventes` | lues dans Stripe (mode de la clé), heure de Paris, cache 5 min : encaissé par période, reçu après frais, par type (abonnements, paiements uniques), abonnements (actifs, essais, impayés, résiliés, renouvellements à 7 jours), 100 derniers paiements |
| Services | `/admin/services` | serveur Railway (environnement, commit, depuis quand, mémoire, avertissements du démarrage), base Supabase (temps de réponse, taille), stockage et [[Mise à jour automatique]], site Netlify, ancienne adresse `rago-production.up.railway.app` (en prod), Stripe, e-mails Resend, rôle Pro Discord, [[Bot communauté Discord]], villes DB-IP. Vérifiés chaque minute |
| Tests réseau | `/admin/reseau` | la page des [[Test réseau|tests réseau]] ([[Proxy]]) |
| Site et promos | `/admin/site` | pop-up de réduction, création de codes promo Stripe, avis du site, arrêt des licences de test ([[Promotions et affiliation]]) |
| Journal | `/admin/journal` | tous les événements, filtrables (actions admin, licences, comptes, PC, abonnements, affiliation) |

## Actions sur un joueur
Offrir des jours ou des mois (un abonné Stripe voit ses prochains paiements décalés) · Premium à vie · révoquer / rétablir une licence · libérer le PC · lien de mot de passe (1 h) · rattacher un achat · résilier en fin de période, annuler la résiliation ou arrêter tout de suite (sans remboursement) · **bannir** / lever le bannissement · remettre le rôle Discord à jour, délier Discord · masquer ou afficher l'avis, retirer la photo, changer le nom · recalculer l'affiliation · supprimer le compte (RGPD, il faut recopier l'e-mail).

## Bannissement (nouveau, PR #77)
Un compte banni (`users.banned_at`, `banned_reason`) ne se connecte plus nulle part (site, Google, Discord, app, compte de l'app), ses sessions sont fermées, sa licence est révoquée (raison `banned`), son abonnement Stripe est arrêté et le rôle Pro retiré. L'app reçoit l'erreur `account_banned` et affiche le message du serveur : **jamais testé sur Windows**. Lever le bannissement rend la licence si elle est encore valable (à vie, temps offert pas fini, abonnement encore actif dans Stripe).

## Ce qui reste dans le terminal
`npm run admin -- export-keys` (clés à sauvegarder, jamais affichées dans une page) et les commandes de test (`create-user`). Toutes les autres commandes ont leur bouton ; elles marchent toujours.

## Pas encore surveillé
Serveurs Rago Route (Vultr) et facturation de Railway, Supabase et Netlify.
