---
type: code
tags: [code, app, rust, build, catalogue]
fichier: app/src-tauri/embed_scripts.rs
lignes: 98
maj: 2026-11-10
---
# embed_scripts.rs

Partie de [[build.rs]] (incluse par `include!`) qui **sépare et chiffre les scripts** des réglages en deux paquets : le paquet gratuit (plan gratuit, retours arrière, moteur libre du Packet Optimizer) et le paquet Premium. Aucune commande n'est en clair dans l'exe. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]], [[Licence dans l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble
- Entrées : `scripts/scripts.json`, `scripts/probes.json`, `scripts/undo.json` ([[Scripts embarqués (JSON)]]), `app/src/data/free.json`, `app/src/data/catalog.json`, `netopt/common.ps1`, `netopt/apply.ps1`, `netopt/main.ps1` (moteur PowerShell de [[netopt.rs]]).
- Sorties dans `OUT_DIR` : `scripts.plain.sealed` et `scripts.sealed`, lues par [[catalog.rs]].
- Chiffrement : `seal::offline_key(version)` et `seal::version_key(secret, version)` de [[seal.rs]].

## Fonctionnement détaillé (`embed_scripts(manifest, out)`)
1. `cargo:rerun-if-changed` sur les 8 fichiers d'entrée, `rerun-if-env-changed` sur `RAGO_SCRIPTS_SECRET` et `RAGO_API_BASE`.
2. Lit les fichiers (un fichier absent ou invalide fait paniquer, avec « (npm run catalog) » pour `probes.json` et `undo.json`). `free` = ensemble des `tweaks` de `free.json` ; `reverts` = ensemble des `id:variante` marqués `revert: true` dans `catalog.json`.
3. **Secret** : `RAGO_SCRIPTS_SECRET` (nettoyé). Absent ou vide : en build **release connecté** (profil `release` et `RAGO_API_BASE` posé), panique « RAGO_SCRIPTS_SECRET manque : ajoute le secret GitHub RAGO_SCRIPTS_SECRET (même valeur que SCRIPTS_SECRET sur Railway) » ; sinon `seal::TEST_SECRET`. Si le secret vaut le secret de test en release connecté : panique « RAGO_SCRIPTS_SECRET est le secret de TEST : mets celui du serveur de production ».
4. **Tri** :
   - un **script** `id:variante` va dans le paquet gratuit si l'id est gratuit **ou** si `id:variante` est une variante de retour arrière ; sinon dans le Premium ;
   - un **relevé** va dans le paquet gratuit seulement si l'id est gratuit (les variantes de retour d'un réglage Premium n'ont pas besoin de relevé : elles annulent) ;
   - une **annulation** (`undo.json`) va dans le paquet gratuit seulement si l'id est gratuit.
5. **Moteur du Packet Optimizer** : paquet gratuit `engine = {"netopt": common.ps1, "netopt.main": main.ps1}` (remise, valeurs de Windows, tests) ; paquet Premium `engine = {"netopt.apply": apply.ps1}` (application).
6. Chaque paquet = JSON `{"scripts", "probes", "undo", "engine"}`, chiffré par `seal` avec un nonce = 16 premiers octets de `HMAC(clé, "nonce|<horodatage>|<taille>")` :
   - `scripts.plain.sealed` avec `offline_key(CARGO_PKG_VERSION)` (obfuscation : la clé est reconstruite dans l'exe) ;
   - `scripts.sealed` avec `version_key(secret, CARGO_PKG_VERSION)` (la vraie protection : seul le serveur de licences connaît le secret et donne la clé à une licence active).

Chiffres du 10/11 (calculés sur `staging`) : paquet gratuit 80 scripts, 75 relevés, annulations de 56 id ; paquet Premium 218 scripts, annulations de 151 id. Détail dans [[Scripts embarqués (JSON)]].

## À savoir avant de modifier
- Le secret de la CI (`RAGO_SCRIPTS_SECRET`, secret GitHub) doit être **identique** à `SCRIPTS_SECRET` du serveur de production sur [[Railway]] : sinon la clé envoyée par le serveur n'ouvre pas le paquet, et aucun réglage Premium ne tourne (`premium_scripts_unavailable`). Voir [[Variables d'environnement]].
- Un build local sans secret marche (secret de test) mais son paquet Premium ne s'ouvre qu'avec un serveur local qui utilise aussi le secret de test.
- Changer les règles de tri change ce qui tourne sans licence : vérifier `free_plan` et `scripts_are_sealed` dans [[catalog.rs]].
