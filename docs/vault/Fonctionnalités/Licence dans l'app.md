---
type: fonctionnalité
tags: [fonctionnalité, app, licence]
version_app: 1.3.0
maj: 2026-11-10
---
# Licence dans l'app

Comment Premium s'active et se perd côté app (`license.rs`, `LicenseGate.tsx`, `Upsell.tsx` ; détail dans la section « Code »). Côté serveur : [[Serveur de licences]].

- **Plan gratuit sans compte** : toute l'app est visible ; les tweaks Premium ont un cadenas. Depuis la [[Version 1.3.0]] (sur `staging`, Sofiene le 04/11) : **73 tweaks gratuits** (tout le module Windows, le stockage, le nettoyage des pilotes NVIDIA et AMD, les outils de Restaurer), dont **30 au plus appliqués en même temps** (« 30 places » ; les actions ne comptent pas). Barre latérale : « Plan gratuit · 73 réglages sur 218 ouverts · Passer Premium » (les deux chiffres sont calculés : nombre de tweaks de `free.json` et nombre de tweaks distincts du catalogue). Clic sur un tweak verrouillé : fenêtre « Débloque les 218 réglages » (tous les modules, mode jeu Rago, RBW Mod, Minecraft, presets, mode expert). Le moteur Rust revérifie le verrou et les 30 places avant chaque lot.
- **Retour gratuit** : pour deux tweaks Premium (RBW Mod « Activé », mode jeu « Désactivé »), le retour arrière reste gratuit.
- **Connexion** : email + mot de passe du compte Rago, ou, depuis la 1.3.0 (`staging`), boutons **Google** et **Discord** qui ouvrent le navigateur sur le site du compte (code de 4 caractères à vérifier, voir [[Connexion Google et Discord]]). Puis « Activer Rago Optimizer sur ce PC ? » : la licence est **liée à ce PC** (1 licence = 1 PC).
- **Jeton** : JWT EdDSA de 30 jours vérifié hors ligne (signature, expiration, empreinte), rafraîchi par l'interface **au démarrage puis toutes les 24 h** tant que l'état est actif ou expiré. Le moteur calcule aussi « expire dans moins de 7 jours » (`needs_refresh`), mais l'interface ne s'en sert pas. Empreinte PC = 2 sur 3 parmi MachineGuid, UUID SMBIOS, n° de série carte mère (chaque valeur hachée, jamais envoyée en clair). Sans réseau, le jeton actuel est gardé ; un jeton expiré hors ligne ne déclenche pas de remise à zéro.
- **Scripts Premium** : à chaque connexion ou rafraîchissement réussi, le serveur donne la clé qui ouvre les scripts Premium de cette version ; elle est gardée chiffrée (`scripts.bin`) et utilisée seulement tant que la licence est active ([[Moteur des tweaks]]).
- **Erreurs expliquées** : identifiants faux, pas de licence, licence sur un autre PC (« la page de ton compte indique comment y passer ta licence »), révoquée, trop de tentatives, réseau, version non reliée au serveur.
- **Fin de Premium** (abonnement fini, révoquée, passée sur un autre PC, jeton invalide) : bandeau d'explication + [[Remise à zéro]] automatique.
- **Se déconnecter** ne libère pas le PC ; tous les tweaks appliqués sont annulés en arrière-plan (« Annuler et me déconnecter »), sans bouton Stop.
- Exe de test : bandeau « Serveur de test (staging) ». À VÉRIFIER : l'exe de test et le vrai gardent leur jeton au même endroit (`%LOCALAPPDATA%\Rago\`), donc l'un peut écraser celui de l'autre sur un même PC (voir [[license.rs]]).

## Code
- Empreinte, connexion, activation, jeton, rafraîchissement, clé des scripts, coffre DPAPI : [[license.rs]] ; compte et abonnement : [[account.rs]].
- Commandes `license_*`, règles de l'offre (`start_tweaks`) et remise de fin de licence (`reset_after_license`) : [[lib.rs]] ; plan gratuit et 30 places côté moteur : [[catalog.rs]] ; données du plan : [[free.json]].
- Interface : [[store.tsx]] (état de licence, rafraîchissement toutes les 24 h), [[api.ts]] ; côté serveur : [[fingerprint.js]], [[tokens.js]].
