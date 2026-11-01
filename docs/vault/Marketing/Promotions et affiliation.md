---
type: marketing
tags: [marketing, promo]
maj: 2026-11-01
---
# Promotions et affiliation

Voir [[Offres et prix]] et [[Discord]]. Code serveur : `promo.js`, `affiliates.js`, `discord.js` ([[Serveur de licences]]).

- **Un seul code par paiement** ; lien `/buy?promo=CODE`.
- **Plus de code de lancement** : RAGO50 (−50 %) a été supprimé, « la période de lancement est terminée » (Sofiene, 01/11). Aucun code suivant. Le pop-up de réduction du site est un réglage (`/admin` ou `npm run admin -- popup`, `promo.js`) : il ne sert que si Sofiene crée un nouveau code.
- RAGO15 (−15 %) : ancien code par défaut, obsolète.
- **Codes partenaires** (premier paiement) : RBWS820 (RBW), ARBW20… créés avec `npm run admin -- create-promo`.
- **Affiliation** (07/10) : le filleul a −5 % ; 3 filleuls maximum ; à 3 filleuls, l'affilié gagne 6 mois de Premium, une seule fois.
- **Récompenses Discord** : VIP (10 invitations) = 1 mois + code −10 % ; MVP (15) = 3 mois + −30 % ; 1 boost = 2 semaines + −10 % ; 2 boosts = 1 mois + −30 %. Une fois par compte.
- **Commissions** : franchise 30 %, partenaires Discord 10 %, RBW 30 %, un créateur YouTube 50 % (sans doute arrêté, voir [[Partenaires et créateurs]]). **Aucun suivi dans le code** : calcul à la main depuis Stripe. Voir [[Partenaires et créateurs]].
