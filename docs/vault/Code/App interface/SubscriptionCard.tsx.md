---
type: code
tags: [code, app, typescript, react, abonnement]
fichier: app/src/components/SubscriptionCard.tsx
lignes: 121
maj: 2026-11-10
---
# SubscriptionCard.tsx

Les **lignes d'abonnement des Paramètres** (1.3.0) : l'offre, le prochain paiement ou la date de fin, la résiliation en un seul écran « Avant de résilier », et la reprise. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Abonnement dans l'app]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `SubscriptionRows()` : malgré le nom du fichier, le composant exporté s'appelle `SubscriptionRows`. Il est monté par [[Settings.tsx]] dans la carte Compte, sous les lignes de la licence.

## Fonctionnement détaillé
- Au montage : `accountApi.subscription()` ([[accountApi.ts]], commande `account_subscription`). `null` (pas d'abonnement : gratuit, À vie, offert) ou erreur → **rien n'est affiché**.
- **Ligne** : « Premium, essai gratuit » / « Premium annuel » / « Premium mensuel » ; dessous « Prochain paiement : {prix} le {date} » ou, si résilié, « Résilié. Premium reste actif jusqu'au {date}, plus aucun débit. » (date longue, ex. « 13 novembre 2026 »).
- Bouton : « Résilier l'abonnement » (ou « Résilier l'essai ») ; si déjà résilié : « Reprendre l'abonnement » → `resumeSubscription()`.
- **Écran « Avant de résilier »** (règle écrite en tête du fichier : un seul écran, pas de remise, pas de second écran, pas de frais) :
  - « Premium reste actif jusqu'au {date}. Rien d'autre n'est débité. » (ou, en essai, « Ton essai s'arrête le {date} et tu ne seras pas débité. ») ;
  - « Ce jour-là, Rago remet comme avant les réglages Windows de tes {n} tweaks appliqués. » avec `n` = longueur de `api.signOutPlan()` (réglages que le moteur remettra) ;
  - « Mesuré sur ce PC avec tes réglages : {gain}. » si l'analyse du PC a un avant/après positif (`lastGain` de [[analysis.ts]]) ;
  - « Annuler un tweak reste gratuit, toujours. » ;
  - deux boutons **de même taille** : « Garder Premium » et « Résilier ».
- Résilier → `cancelSubscription()` → écran « Abonnement résilié » / « Essai résilié » : « Premium reste actif jusqu'au {date}. Plus aucun débit. La confirmation est dans tes e-mails. » + « Fermer ».
- Après résiliation ou reprise : `api.licenseRefresh()` en arrière-plan (le jeton de licence suit le nouvel état).
- Erreur : message du serveur, sinon « Impossible de joindre le serveur. Réessaie dans une minute. ». La fenêtre ne se ferme pas pendant un appel.

## Liens avec le reste
- [[accountApi.ts]] (abonnement), [[api.ts]] (`signOutPlan`, `licenseRefresh`), [[analysis.ts]] (`lastGain`), `Modal`/`Button` ([[Petits composants de l'interface]]).
- Serveur : résiliation et reprise Stripe ([[Paiements Stripe]], [[API du serveur]]) ; la fin de Premium déclenche la remise à zéro du moteur ([[Remise à zéro]]).

## À savoir avant de modifier
- Écran de résiliation honnête : décision de la 1.3.0 (voir [[Étude - Convertir honnêtement]] et [[Décisions]]). Pas de piège, pas de remise de dernière minute.
