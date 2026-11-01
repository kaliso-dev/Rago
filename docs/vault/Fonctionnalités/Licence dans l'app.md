---
type: fonctionnalité
tags: [fonctionnalité, app, licence]
version_app: 1.2.1
maj: 2026-10-31
---
# Licence dans l'app

Comment Premium s'active et se perd côté app (`license.rs`, `LicenseGate.tsx`, `Upsell.tsx`). Côté serveur : [[Serveur de licences]].

- **Plan gratuit sans compte** : toute l'app est visible ; les tweaks Premium ont un cadenas. Barre latérale : « Plan gratuit · 11 réglages sur 218 ouverts · Passer Premium ». Clic sur un tweak verrouillé : fenêtre « Débloque les 218 réglages » (tous les modules, mode jeu Rago, RBW Mod, Minecraft, presets, mode expert). Le moteur Rust revérifie le verrou.
- **Retour gratuit** : pour certains tweaks Premium (RBW Mod « Activé », mode jeu « Désactivé »), le retour arrière reste gratuit.
- **Connexion** : email + mot de passe du compte Rago (un compte créé avec Google/Discord doit d'abord choisir un mot de passe, voir [[Connexion Google et Discord]]). Puis « Activer Rago Optimizer sur ce PC ? » : la licence est **liée à ce PC** (1 licence = 1 PC).
- **Jeton** : JWT EdDSA de 30 jours vérifié hors ligne, rafraîchi au démarrage puis toutes les 24 h, et s'il expire dans moins de 7 jours. Empreinte PC = 2 sur 3 parmi MachineGuid, UUID SMBIOS, n° de série carte mère.
- **Erreurs expliquées** : identifiants faux, pas de licence, licence sur un autre PC (« la page de ton compte indique comment y passer ta licence »), révoquée, trop de tentatives, réseau, version non reliée au serveur.
- **Fin de Premium** (abonnement fini, révoquée, passée sur un autre PC, jeton invalide) : bandeau d'explication + [[Remise à zéro]] automatique.
- **Se déconnecter** ne libère pas le PC ; tous les tweaks appliqués sont annulés en arrière-plan (« Annuler et me déconnecter »), sans bouton Stop.
- Exe de test : bandeau « Serveur de test (staging) ».
