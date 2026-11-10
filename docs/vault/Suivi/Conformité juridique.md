---
type: suivi
tags: [juridique, rgpd, site]
maj: 2026-11-10
---
# Conformité juridique

Ce que le [[Site]] et le [[Serveur de licences]] font pour être en règle (RGPD, vente en ligne), et ce qui manque. Vérifié le 04/11 sur la PR #70 ([[Version 1.3.0]]). Voir [[Offres et prix]], [[Questions ouvertes]].

## En place
- Pages `terms.html`, `privacy.html` (et `refunds.html` en prod seulement, supprimée sur `staging`), générées par `site/tools/make_legal.py` (en anglais, comme tout le site), liées depuis chaque pied de page.
- Politique de confidentialité : chaque donnée gardée et pourquoi, base légale, sous-traitants (Stripe, Supabase, Railway, Netlify, Resend, OVHcloud, Discord, Google), transferts hors UE, durées, droits, CNIL. La 1.3.0 y ajoute la connexion Google/Discord, le code d'inscription, l'essai (email et empreinte de carte), le bot du Discord et les cookies `rg_signup`, `rg_oauth`, `rago_admin`.
- Cookies et stockage : seulement nécessaires ou liés à une action (affiliation, offre d'accueil) ; aucun cookie de pub ni de mesure d'audience, aucune police ni script tiers : **pas de bandeau cookies nécessaire**.
- Durées appliquées par le serveur (balayage horaire) : tests réseau 12 mois (`network.js`) ; dans la 1.3.0, `retention.js` : journal de sécurité 12 mois, essais 2 ans, membres partis du Discord 12 mois, codes d'inscription un jour. Avant, le journal de sécurité n'était jamais effacé alors que la politique promettait 12 mois.
- Essai de 3 jours : prix, date du débit et façon de résilier écrits sous le bouton, sur la page Stripe, dans l'email de confirmation et sur la page compte ; résiliation depuis la page compte (portail Stripe).
- Droit de rétractation : les CGV demandent l'accès immédiat et la renonciation aux 14 jours au paiement.

## Manque (À RÉGLER par Sofiene)
- **Identité du vendeur** : la loi demande le nom, l'adresse et le SIREN du vendeur sur le site (mentions légales et CGV). Les CGV disent seulement « the Rago Optimizer team ». Sofiene n'est pas encore inscrit comme vendeur (q44, 04/11) et a 17 ans : **sa mère sera inscrite comme vendeuse** (q49, 10/11) ; à qui est le compte Stripe aujourd'hui : non dit. Adresse : pas de domiciliation (trop cher pour l'instant) et Sofiene ne veut pas mettre une adresse personnelle (q46, reformulée). Argent : Sofiene et Abel doivent partager à deux, sans accord écrit ni société pour l'instant (q45) ; Straight n'a aucun droit.
- **TVA** : les CGV disent « TVA non applicable, art. 293 B du CGI », ce qui suppose une micro-entreprise inscrite. Faux tant que personne n'est inscrit.
- **Collecte des tests réseau** : base « intérêt légitime », sans accord demandé dans l'app. Sofiene, 10/11 (q37) : on continue d'envoyer sans prévenir, mais ce point est **à régler avant de soumettre l'app à la signature de code** (RAG-83). E-mail aux titulaires de compte à envoyer ([[Test réseau]]).
- **Remboursement** : Sofiene ne rembourse plus (q36, 10/11). Sur `staging` (PR #76) : CGV section 6 « Cancellation, no refunds » (annulation, essai, pas de remboursement, litiges, renonciation au droit de rétractation gardée), `refunds.html` supprimée, case des CGV au paiement et e-mail d'achat à jour. Un paiement en double ou par erreur reste rendu : c'est une obligation légale (paiement indu), pas un remboursement commercial. Les CGV gardent aussi « Nothing in these terms limits your statutory rights ».
- À VÉRIFIER : la règle européenne du « bouton de rétractation » (directive 2023/2673, applicable depuis le 19/06/2026) s'applique-t-elle quand le client a renoncé à la rétractation ? Pas vérifié auprès d'un juriste.
