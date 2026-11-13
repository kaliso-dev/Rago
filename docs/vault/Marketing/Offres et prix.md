---
type: produit
tags: [marketing, produit, prix]
maj: 2026-11-10
---
# Offres et prix

Prix en **USD**, paiement Stripe sur le [[Site]], **1 licence = 1 PC**. Voir [[Marketing]] et [[Décisions]].

| Offre | Prix | Contenu (site, 29/10) |
|---|---|---|
| **Free** | 0 | app entière visible ; **11 tweaks** en prod (module Windows et outils de Restaurer). **Dans la [[Version 1.3.0]] (PR #70, pas sortie)** : 73 réglages ouverts (module Windows, section stockage de Latence, télémétrie NVIDIA/AMD, Restaurer) mais **30 activés en même temps au plus** ; stats de la [[Barre en jeu]], [[Test réseau]], Clean RAM, nettoyage, pilotes, [[Bibliothèque de jeux]], partage de presets ; désinstallation des applis préinstallées à partir de la 1.2.2 ([[Page Outils]]) |
| **Premium** | **5,99 $/mois** ou **29,99 $/an** ; dans la 1.3.0, **essai de 3 jours** avec carte, puis le mensuel débité automatiquement | les 218 tweaks sans limite, [[Packet Optimizer]] (entièrement Premium dans la 1.3.0), Rago Route en bêta (1.3.0, [[Proxy]]), 20 [[Presets]] dont 15 de jeux, Optimize and play, 21 tweaks en pleine partie, suppression des applis préinstallées, rôle Discord Pro |
| **Option Rago Route** | **3 $/mois** en plus du Premium, sans engagement (Sofiene, 13/11 : « il faut payer 3$ en plus de l'abonnement premium il faut que ça soit une option », puis « 3$ par mois en plus de l'abonnement c'est le mieux ») | [[Proxy|Rago Route]] ; abonnement Stripe à part (prix `STRIPE_PRICE_ROUTE`, à créer dans Stripe), pris depuis la page compte (`/buy/route`) ou le bouton de l'onglet Rago Route de l'app, pour tout Premium actif (mensuel, annuel, Lifetime, récompense) ; s'arrête avec le Premium ; **comprise dans l'essai gratuit** de 3 jours (Sofiene, 13/11 : « pendant l'essai gratuit ils ont accès à tout ») ; CGV section 4a. **sur `staging` depuis le 13/11** (« passe en staging ») |
| **Lifetime** | **59,99 $** une fois | Premium sans renouvellement, versions futures incluses ; vendu seulement si le prix Stripe (`LIFETIME_PRICE`) correspond, sinon « Coming soon » |

- Plan gratuit : `app/src/data/free.json` (`tweaks` et `slots: 30`), vérifié aussi par le moteur Rust (`catalog::over_free_slots`). Règle du 04/11 : « on va ajouter directement la suite : 50 - 100 tweaks gratuit (laisser les meilleur et les plus demandé en premium surtout network et hitreg) mais seulement 30 slot de tweaks disponible gratuitement a activé simultanement » ; réseau, hitreg, Minecraft et les meilleurs réglages de latence restent Premium.
- Essai (1.3.0, PR #70) : `/buy?interval=month|year&trial=1` ; Checkout Stripe avec `trial_period_days`, carte obligatoire ; un essai par email et par carte (table `trials`, empreinte Stripe de la carte), sinon débit immédiat ; pas d'essai pour Lifetime ni avec une récompense d'affiliation. Réglage serveur `TRIAL_DAYS` (3 par défaut, 0 = coupé). Le site met l'essai en avant (« Start 3-day free trial », prix et date de débit écrits sous le bouton). Offre débitée après l'essai : **mensuel seulement, 5,99 $** (Sofiene, 10/11, q48) : le serveur prend toujours le prix mensuel pour un essai (`buildCheckout`, `billing.js`), le site et l'app envoient `interval=month&trial=1` et le disent ; l'annuel et le Lifetime se paient tout de suite (PR #76, `staging`).
- **Prochaine version publique** (Sofiene, 10/11, q47) : tout sort en une fois, « l'app avec les 30 opti 15 slots essaie gratuit connexion google/discord et proxy ». « 30 opti 15 slots » était une erreur : Sofiene confirme **73 réglages gratuits dont 30 actifs** (q68, 10/11, « ah nan oui c'est bien ça 73 réglages gratuits dont 30 actifs pardon »). [[Packet Optimizer]] entièrement Premium dans cette version (q41, PR #76).
- **Pas de remboursement** (Sofiene, 10/11, q36) : l'essai gratuit le remplace. Fait dans la PR #76 (`staging`) : `refunds.html` supprimée (redirigée vers `terms.html#cancel`), CGV section 6 « Cancellation, no refunds », case des CGV au paiement Stripe, e-mail d'achat, FAQ « Can I get a refund? ». Seule exception écrite : un paiement en double ou par erreur est rendu (obligation légale). En prod, le site parle encore de remboursement jusqu'à la sortie.
- **Même prix à chaque renouvellement** (q40), « sauf si nos prix change ». Idée pour plus tard : un plan **Ultimate** avec un prix d'appel le premier mois, puis plus cher (« comme norton ») ; rien de décidé.
- Parrainage : reste sur le site seulement, pas dans l'app (q39).
- Lifetime : demandé à 69,99 $ le 16/10, livré à 59,99 $ ; **59,99 $ confirmé par Sofiene le 31/10** (« c'est normal »).
- Historique : achat unique (04/10) → abonnement (05/10) → 5,99 / 29,99 (07/10) → Lifetime ajouté (16/10).
- **Dans Stripe (04/11, CONFIRMÉ)** : un seul produit actif, « Rago Optimizer Premium », avec trois prix actifs en USD : 5,99 $/mois, 29,99 $/an et 59,99 $ en paiement unique (Lifetime). Aucune période d'essai sur les prix : l'essai de la 1.3.0 est un paramètre du Checkout, pas un nouveau prix. Le compte garde aussi deux anciens produits archivés de sites web « Kaliso » (sans lien avec Rago).
- Ventes, abonnés, résiliations : [[Ventes Stripe]].
- Codes, affiliation, récompenses : [[Promotions et affiliation]].
