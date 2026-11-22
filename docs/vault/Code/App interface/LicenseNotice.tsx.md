---
type: code
tags: [code, app, typescript, react, licence]
fichier: app/src/components/LicenseNotice.tsx
lignes: 69
maj: 2026-11-10
---
# LicenseNotice.tsx

Le **bandeau de licence** en haut de la page : quand Premium a été perdu au rafraîchissement (abonnement terminé, licence révoquée, autre PC) ou ne peut plus être vérifié hors ligne, le joueur l'apprend ici au lieu de retomber sans un mot sur le plan gratuit. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Licence dans l'app]], [[Abonnement dans l'app]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- Affiché si `licenseNotice` du store n'est pas nul (posé par `refreshLicense`, [[store.tsx]]).
- **Texte** : en anglais, le message du serveur tel quel (voix de la marque) ; sinon la clé `notice.<code>` :
  - `revoked` avec lien d'achat → « Ton abonnement Premium a pris fin : tu es repassé sur le plan gratuit. » (`notice.subscription_ended`) ;
  - `revoked` sans lien → « Ta licence Premium a été désactivée… » ;
  - `bound_to_other_device` → « Ta licence est maintenant active sur un autre PC… » ;
  - `invalid_token` → « Ta licence n'est plus valable sur ce PC. Reconnecte-toi pour retrouver Premium. » ;
  - `expired` → « Impossible de vérifier ta licence. Connecte-toi à internet pour garder Premium. » (bandeau orange) ;
  - code inconnu → le texte de `revoked`.
- **Bouton principal** :
  - `expired` → « Réessayer » : `refreshLicense(await api.licenseStatus())`, même chemin qu'au démarrage ;
  - lien d'achat fourni par le serveur → « Renouveler » (ouvre le lien) ;
  - `invalid_token` ou `bound_to_other_device` → « Se connecter » (offre `signin`) ;
  - sinon → « Passer Premium » (ouvre `SITE_URL/#pricing`).
- **Bouton d'aide** « Aide sur Discord » (si `SUPPORT_URL` est défini) pour `revoked` sans lien d'achat, `bound_to_other_device` et `invalid_request`.
- Croix « Fermer » : efface le bandeau (jusqu'au prochain rafraîchissement).

## Liens avec le reste
- Monté par [[App.tsx]] en tête de la zone de page.
- URLs : `SITE_URL`, `SUPPORT_URL` de [[LicenseGate.tsx]].
- Moteur : [[license.rs]] (rafraîchissement, codes d'erreur) ; serveur : [[API du serveur]].
