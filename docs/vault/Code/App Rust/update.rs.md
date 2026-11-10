---
type: code
tags: [code, app, rust, mise-a-jour]
fichier: app/src-tauri/src/update.rs
lignes: 202
maj: 2026-11-10
---
# update.rs

**Mises à jour automatiques** (RAG-24) : l'app demande au serveur s'il y a une version plus récente, la télécharge en arrière-plan, vérifie sa signature, prévient l'interface, et l'installe quand le joueur clique « Redémarrer » ou ferme l'app. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Mise à jour automatique]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 17/10 ; le 28/10, vérification dès le lancement et résultat visible (`last_check`).

## Rôle et place dans l'ensemble
- `watch` est lancé dans `setup` de [[lib.rs]] avec, comme graine de l'identifiant du PC, le MachineGuid haché de [[license.rs]] (sinon le nom du PC).
- Commandes de [[lib.rs]] : `update_ready`, `update_status`, `update_install` ; `quit` et la fermeture de la fenêtre installent sans rouvrir (`install(false)`) si une mise à jour est prête et qu'aucun lot ne tourne.
- Côté serveur : route `GET <API_BASE>/update/{target}/{arch}/{current_version}` ([[API du serveur]]), avec déploiement progressif par PC.
- Plugin `tauri-plugin-updater` ([[Cargo.toml]]) ; configuration `plugins > updater` de `tauri.conf.json` ([[Configuration Tauri]]).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `EVERY = 4 h` | délai entre deux recherches sans résultat |
| `RETRY = 30 min` | délai après un échec (hors ligne, serveur coupé) |
| `struct Ready {version, notes}` | mise à jour prête ; `notes` vides retirées |
| `struct Updates {ready, last}` | `ready` : `(Update, octets de l'installateur)` en mémoire ; `last` : résultat de la dernière recherche |
| `Updates::ready()` | `Option<Ready>` |
| `Updates::last_check()` | « `<date> UTC: no update` », « `… 1.2.1 ready to install` », « `… error: <raison>` », « `… off, this build has no update key` », ou `None` avant la première recherche |
| `Updates::install(restart)` | lance l'installateur (barre de progression, sans question, `installMode: passive`) et quitte l'app ; `restart` : elle se rouvre. Ne revient qu'en cas d'échec (la mise à jour reste en attente). Sans mise à jour → `no_update` |
| `enabled(app)` | vrai si `API_BASE` existe **et** si `plugins.updater.pubkey` n'est pas vide (la CI ne la met qu'avec la clé de signature) |
| `endpoint(api_base)` | `<api_base>/update/{{target}}/{{arch}}/{{current_version}}` (l'updater remplace les variables) |
| `device_tag(graine)` | 12 premiers octets de sha256(`rago-update-v1\|<graine>`) en hexadécimal (24 caractères) : toujours le même pour ce PC, sans rien révéler de l'empreinte |
| `watch(app, updates, device)` | la boucle de fond |

## Fonctionnement détaillé
1. `watch` : si `enabled` est faux, note « off, this build has no update key » et s'arrête (exe de développement, build sans clé).
2. Sinon un fil : calcule le `device_tag`, puis en boucle `check` **dès le lancement** :
   - `Ok(true)` (téléchargée) : note « `<version> ready to install` » et **le fil s'arrête** : plus rien à chercher jusqu'à l'installation ;
   - `Ok(false)` : note « no update », attend 4 h ;
   - `Err(e)` : `eprintln!("[update] …")`, note « error: … », attend 30 min.
3. `check` : updater construit avec l'endpoint, l'en-tête **`X-Rago-Device: <device_tag>`** et un délai de **30 s** pour la question au serveur. S'il y a une version : délai de **15 min** pour le téléchargement (l'installateur pèse une dizaine de Mo) ; `download` **vérifie la signature** avec la clé publique de mise à jour (un fichier non signé par Rago s'arrête là) ; garde les octets ; émet **`update:ready`** `{version, notes}` à l'interface.
4. `causes(e)` déroule toute la chaîne d'erreurs (« error sending request: … ») pour savoir si c'est le DNS, le certificat ou un délai.

La date de `last_check` vient de `report::utc` ([[report.rs]]). Le texte est repris par le rapport de support et affiché dans les [[Paramètres de l'app]] de l'exe de test (`update_status`).

## Données touchées
Réseau : `GET <API_BASE>/update/windows/x86_64/<version actuelle>` (forme attendue par la route `/update/:target/:arch/:current` de `licensing/src/app.js` ; réponse 204 = rien à installer), puis l'URL de téléchargement donnée par le serveur (route `/update/file/:version`). L'installateur est gardé **en mémoire**, pas sur disque, jusqu'à l'installation.

## Erreurs et cas limites
- Une mise à jour ne s'installe **jamais** sans action du joueur (clic, fermeture, « Quitter »), ni pendant un lot ou une remise à zéro (`busy`, [[lib.rs]]).
- Si l'app est quittée avant l'installation, l'installateur téléchargé est perdu ; il sera retéléchargé au lancement suivant.

## Tests
`endpoint_keeps_the_updater_variables`, `device_tag_is_stable_and_opaque`, `nothing_waits_at_first`, `last_check_is_dated`, `causes_are_spelled_out`.

## À savoir avant de modifier
- La clé publique de mise à jour est mise dans `tauri.conf.json` par la CI (variable `RAGO_UPDATER_PUBKEY`) avec `createUpdaterArtifacts: true` ; la clé privée est le secret `TAURI_SIGNING_PRIVATE_KEY` ([[CI GitHub Actions]], [[Clés et secrets]]). Ne jamais les changer : les exes déjà installés n'accepteraient plus les mises à jour.
- Publier une mise à jour : [[Publier une version]].
