---
type: fonctionnalité
tags: [fonctionnalité, app, premium, 1.3]
version_app: 1.3.0
maj: 2026-11-04
---
# Abonnement dans l'app

Ajouté en 1.3.0 (PR #70, pas sortie), demandé par Sofiene le 04/11 avec la maquette « Fonctions gardées de la maquette de l'app » ([[Décisions]]). Voir [[Offres et prix]], [[Licence dans l'app]], [[Analyse du PC]], [[Version 1.3.0]].

## Fenêtre Premium (plan gratuit)
- Les prix viennent du serveur (`GET /api/v1/plans` : mensuel, annuel, Lifetime lus dans Stripe, et la durée de l'essai), donc toujours ceux de Stripe. Trois cartes : Yearly (choisie par défaut, avec le prix par mois), Monthly, Lifetime.
- Promesses affichées : « Undo stays free », et « Cancel anytime » pour les abonnements. Pas de fausse urgence, pas de compte à rebours.
- Bouton principal « Start 3-day free trial » avec la phrase sur le débit à la fin de l'essai, et le lien « Pay now, without the trial ». Lifetime ouvre l'achat Lifetime. Le paiement se fait dans le navigateur ; l'app dit ensuite de se connecter avec le même email.
- Variantes selon l'origine : un tweak Premium (son nom), un preset, les 30 places pleines, le plan, et l'[[Analyse du PC]] (liste des points que Premium règle). Sans prix lisibles, le bouton ouvre la page des prix du site.

## Résiliation dans l'app (Paramètres)
- Les [[Paramètres de l'app]] montrent l'offre (essai, mensuel, annuel), le prochain paiement avec son prix et sa date, ou la date de fin si c'est résilié. Bouton « Cancel subscription » (« Cancel free trial » pendant l'essai) ou « Resume ».
- Un seul écran « Before you cancel » : la date de fin, le nombre de tweaks Premium qui reviendront comme avant ce jour-là, le gain mesuré sur ce PC (dernier avant/après de l'[[Analyse du PC]]), « Undo stays free ». Deux boutons de même taille, « Keep Premium » et « Cancel subscription ». Pas de remise, pas de second écran.
- Puis un message de confirmation, et un email « Your subscription is canceled » / « Your free trial is canceled ». Premium reste jusqu'à la fin de la période payée.
- Serveur : `GET /api/v1/account/subscription`, `POST /api/v1/account/subscription/cancel` et `/resume` (fin de période dans Stripe, `cancel_at_period_end`), traces `subscription.canceled_in_app` / `resumed_in_app` (`licensing/src/app.js`, `mailer.js`). App : `SubscriptionCard.tsx`, `Upsell.tsx`, `account.rs`.

## Pas faits, en attente d'une réponse de Sofiene
- Rappel 7 jours avant le renouvellement et « même prix au renouvellement » : q40.
- Remboursement sous 14 jours : q36. Parrainage : q39. Variante Packet Optimizer en gratuit : q41.
