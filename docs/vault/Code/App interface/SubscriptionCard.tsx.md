---
type: code
tags: [code, app, typescript, react, abonnement]
fichier: app/src/components/SubscriptionCard.tsx
lignes: 155
maj: 2026-11-23
---
# SubscriptionCard.tsx

Les **lignes d'abonnement des Paramètres** (1.3.0) : l'offre, le prochain paiement ou la date de fin, la résiliation en un seul écran « Avant de résilier », et la reprise. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Abonnement dans l'app]].

**Écran v5 (23/11, dans `staging` par la PR #126, fusionnée le 23/11, jamais testé sur Windows)** : une ligne `.sr` du bloc compte (maquette `app-settings.html`), « Résilier l'abonnement » en lien ; résilié, la ligne `.sr.cxl` et le bouton rouge « Reprendre l'abonnement » (maquette `app-settings-canceled.html`). Les fenêtres « Avant de résilier » et « Abonnement résilié » reprennent les maquettes `app-cancel-before.html` et `app-cancel-done.html` depuis la PR #130 (vers `staging`, 23/11) : `Modal` avec `v5="sm cxm"`, titre en ruban, une ligne `ul.cf > li` par fait avec son icône (`clock`, `undo`, `activity`, `shield`), la date, le nombre de tweaks et le gain mesuré en gras (marques `**…**` dans les textes, lues par `Rich`), deux boutons de même largeur (`div.mf.even`) ; l'écran « résilié » a un seul bouton rouge « close ». Une erreur s'affiche dans un cadre `p.err2`.

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `useSubscription()` : lit l'abonnement au montage, renvoie `[abonnement, setAbonnement]` ; [[Settings.tsx]] s'en sert pour la ligne et pour l'en-tête.
- `SubscriptionRow({ sub, onChange })` : la ligne et ses fenêtres, montée par [[Settings.tsx]] dans le bloc compte, sous l'offre.
- `longDate(lang, iso)` : date longue (« December 14, 2026 »).

## Fonctionnement détaillé
- `useSubscription` : `accountApi.subscription()` ([[accountApi.ts]], commande `account_subscription`). `null` (pas d'abonnement : gratuit, À vie, offert) ou erreur → **pas de ligne** (l'en-tête dit alors « active » et « verified until {date} »).
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
- [[accountApi.ts]] (abonnement), [[api.ts]] (`signOutPlan`, `licenseRefresh`), [[analysis.ts]] (`lastGain`), `Modal` ([[Petits composants de l'interface]]), `I` et `Rich` (`s5/I.tsx`, [[Maquettes v5 dans l'app (s5)]]).
- Serveur : résiliation et reprise Stripe ([[Paiements Stripe]], [[API du serveur]]) ; la fin de Premium déclenche la remise à zéro du moteur ([[Remise à zéro]]).

## À savoir avant de modifier
- Écran de résiliation honnête : décision de la 1.3.0 (voir [[Étude - Convertir honnêtement]] et [[Décisions]]). Pas de piège, pas de remise de dernière minute.
