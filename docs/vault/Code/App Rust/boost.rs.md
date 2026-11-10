---
type: code
tags: [code, app, rust, jeux, services, rago-os, premium]
fichier: app/src-tauri/src/boost.rs
lignes: 224
maj: 2026-11-10
---
# boost.rs

**Mode jeu total** : le temps d'une partie, les services Windows non essentiels qui tournent sont arrêtés, puis relancés à la fin. Demandé par [[Rago OS]] par le pont, **et par lui seul**. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Mode jeu]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Commande de pont `boost` ([[bridge.rs]], traitée dans `bridge_handler` de [[lib.rs]]) : `{"cmd": "boost", "on": true|false}`. Allumer demande une **licence active** (sinon `premium_required:boost`). Réponse : `State`. La commande `status` du pont renvoie aussi `boost`.
- Pas de bouton dans l'app : seul Rago OS le demande, au lancement d'un jeu.
- Créé au démarrage par [[lib.rs]] (`Boost::new`), qui **relance d'abord** ce qu'une partie interrompue a laissé arrêté.
- La boucle de fond de [[lib.rs]] (toutes les 4 s) l'éteint après **5 tours sans jeu** (~20 s, le temps qu'un launcher passe la main au vrai exe) : Rago OS fermé ou planté en pleine partie.

## Ce que le fichier expose

- `SERVICES` (22 services, nom et description en clair) :

| Service | Rôle |
|---|---|
| `WSearch` | Indexation de la recherche |
| `Spooler` | Impression |
| `SysMain` | Préchargement des applis |
| `DiagTrack` | Télémétrie de Windows |
| `dmwappushservice` | Messages de télémétrie |
| `WerSvc` | Rapports d'erreurs |
| `DoSvc` | Partage des mises à jour avec d'autres PC |
| `MapsBroker` | Cartes hors connexion |
| `lfsvc` | Géolocalisation |
| `PcaSvc` | Assistant de compatibilité des programmes |
| `TrkWks` | Suivi des liens de fichiers |
| `WMPNetworkSvc` | Partage multimédia du Lecteur Windows |
| `Fax` | Télécopie |
| `RetailDemo` | Mode démo des magasins |
| `wisvc` | Programme Windows Insider |
| `DPS` | Diagnostics de performances |
| `WdiServiceHost` | Diagnostics (hôte du service) |
| `WdiSystemHost` | Diagnostics (hôte du système) |
| `edgeupdate`, `edgeupdatem` | Mises à jour de Microsoft Edge |
| `gupdate`, `gupdatem` | Mises à jour de Google |

- `State { active, stopped }` (`stopped` = descriptions en clair des services arrêtés).
- `Boost::new(data_dir)`, `is_active`, `state`, `on`, `off`.

## Fonctionnement détaillé

1. `on` : si rien n'est déjà arrêté, liste les services de `SERVICES` **qui tournent**, les **écrit dans `boost.json` avant de les arrêter** (un arrêt brutal pendant la boucle laisse de quoi tout relancer), puis les arrête un par un (`ControlService` STOP, attente de **3 s** au plus par service ; un service encore « en cours d'arrêt » compte comme arrêté). La liste gardée est celle des arrêts réussis. Une deuxième demande pendant la partie ne fait rien de plus.
2. `off` : relance chaque service noté (s'il ne tourne pas déjà), vide `boost.json`.
3. **Le type de démarrage n'est jamais changé** : Windows peut relancer un service s'il en a besoin, et un redémarrage du PC remet tout comme avant quoi qu'il arrive. Un service déjà arrêté avant la partie reste arrêté.

## Données touchées

- Fichier `boost.json` du dossier de données (`{"stopped": [...]}`), supprimé quand la liste est vide.
- Services Windows de la liste (arrêt et relance par le gestionnaire de services).

## Erreurs et cas limites

- Rien n'est relancé à la **fermeture de l'app** ni à la désinstallation ([[reset.rs]] n'appelle pas `boost`) : les services sont relancés au lancement suivant de l'app, ou par le redémarrage du PC (CONFIRMÉ par lecture du code).
- `SysMain`, `PcaSvc`, `DPS` et `WSearch` font aussi partie des services lus par le vérificateur de Ranked Bedwars ([[rbw.rs]]) : pendant une partie en Mode jeu total, la vérification RBW les voit arrêtés. À VÉRIFIER : la règle du [[RBW Mod]] dit qu'aucun preset, nettoyage ou outil ne touche à ce que lit le vérificateur ; le code de `boost.rs` n'en tient pas compte (question pour Sofiene).

## Liens avec le reste

- Appelé par [[lib.rs]] (pont et boucle de fond) ; demandé par [[Rago OS]] ([[bridge.rs]]).
- À ne pas confondre avec le réglage « Mode jeu Rago » (`game_mode`, catalogue), que Rago OS peut aussi allumer par le pont : voir [[Mode jeu]].

## Tests

- `jamais_de_service_de_securite_ni_de_reseau` : aucun de ces 25 services n'est dans la liste : `WinDefend`, `mpssvc`, `wuauserv`, `BFE`, `Dnscache`, `Dhcp`, `nsi`, `Audiosrv`, `AudioEndpointBuilder`, `vgc`, `vgk`, `EasyAntiCheat`, `BEService`, `FACEIT`, `XblAuthManager`, `XblGameSave`, `GamingServices`, `BITS`, `CryptSvc`, `EventLog`, `Schedule`, `RpcSs`, `hidserv`, `TokenBroker`, `WlanSvc`.
- `rien_a_relancer_sans_partie` : sans `boost.json`, rien d'actif et `off` ne fait rien.

## À savoir avant de modifier

- Ne jamais ajouter un service de sécurité (Defender, pare-feu, Windows Update), du réseau, du son, des périphériques, un anti-triche ni Xbox (sauvegardes des jeux du Store) : le test le vérifie pour les principaux.
- Arrêter seulement, jamais désactiver.
- Toujours écrire `boost.json` avant d'arrêter.
