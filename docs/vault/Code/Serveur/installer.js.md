---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/installer.js
lignes: 134
maj: 2026-11-10
---
# installer.js

Trouve le fichier d'installation Windows (`.exe`) et fabrique un lien de téléchargement ; fournit aussi la mise à jour automatique (dernière version + signature `.sig`). Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Mise à jour automatique]], [[Publier une version]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

L'installateur vit dans un **bucket privé Supabase Storage** ([[Supabase]]). Le serveur ne le sert jamais lui-même en production : il crée un **lien signé de 5 minutes** et redirige le navigateur. Le même `.exe` le plus récent sert au téléchargement depuis le site (`/download`), depuis le compte (`/account/download`) et à la mise à jour automatique de l'app (RAG-24, `GET /api/v1/update/...`), une fois sa signature `<exe>.sig` déposée à côté. [[app.js]] crée l'objet avec `createInstaller(cfg)`.

## Ce que le fichier expose

`createInstaller(cfg, {fetchImpl, log})` → objet avec :

| Méthode | Retour | Rôle |
|---|---|---|
| `resolve({fresh})` | `{url, source, file}` (redirection), `{file, size, source}` (fichier local) ou `{error}` | Où télécharger l'installateur. `fresh: true` relit le bucket. |
| `latest({fresh})` | `{version, path, name, date, signature}` ou `{error}` | La mise à jour proposée à l'app (cache 5 min). |
| `signedLink(path)` | URL ou `null` | Lien de 5 min vers un fichier précis (le fichier de mise à jour). |

## Fonctionnement détaillé

**Ordre de recherche (`resolve`)** :
1. `INSTALLER_URL` : n'importe quel lien public, utilisé tel quel (`source: 'INSTALLER_URL'`).
2. Supabase (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) :
   - `INSTALLER_OBJECT` (défaut `downloads/RagoOptimizer-Setup.exe`) donne le **bucket** (avant le premier `/`) et le **dossier** ;
   - le fichier trouvé est gardé **1 minute** (on ne liste pas le bucket à chaque téléchargement) ;
   - sinon `POST /storage/v1/object/list/<bucket>` (préfixe = dossier, **100** fichiers au plus, triés par `created_at` décroissant) ; on garde le `.exe` le plus récent, **quel que soit son nom** ;
   - lien signé : `POST /storage/v1/object/sign/<bucket>/<chemin>` avec `expiresIn: 300` ;
   - si aucun `.exe` n'est listé, essai direct du fichier exact `INSTALLER_OBJECT` (sauf refus 401/403) ;
   - le lien final ajoute `download=<nom>` : le navigateur enregistre toujours le fichier sous `INSTALLER_FILENAME` (défaut `RagoOptimizer-Setup.exe`).
3. `INSTALLER_PATH` : fichier sur le disque du serveur (utilisé par les tests et en local), envoyé en flux par [[app.js]].
4. Rien → `{error: 'No installer configured…'}`.

**En-têtes Supabase** : `apikey` = la clé ; si la clé commence par `eyJ` (ancienne clé `service_role` au format JWT), elle va aussi dans `Authorization: Bearer`. Les nouvelles clés `sb_secret_` vont seulement dans `apikey`.

**Mise à jour (`readLatest`)** :
1. dernier `.exe` du bucket ;
2. version lue dans le nom avec `VERSION_IN_NAME` = `/_(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)_/` (Tauri nomme le fichier `Rago Optimizer_1.2.0_x64-setup.exe`) ; pas de version → erreur qui demande de garder le nom donné par le build ;
3. lecture de `<exe>.sig` (`GET /storage/v1/object/<bucket>/<chemin>.sig`) : absente → erreur « upload "<nom>.sig" (in the same GitHub zip) next to it » ;
4. la signature doit être du base64 de **4096 caractères au plus** ;
5. résultat gardé **5 minutes** (chaque app demande au démarrage puis toutes les quelques heures). Une erreur est journalisée `[update] …`.

**Routes qui l'utilisent** (détail dans [[app.js]]) :
- `GET /account/download` (connecté) et `GET /download` (public, 30/h par IP) : audit `download` avec `{source}`, redirection 302 ; sinon `/account?n=nofile` ou page 503 « The Windows app is on its way. » ;
- `GET /download/status` (30/h) : `{ok, source, file}` ou `{ok:false, error}` (503), sans rien de secret ;
- `GET /api/v1/update/:target/:arch/:current` : 204 si rien à installer ; sinon `{version, notes, pub_date?, url, signature}` ;
- `GET /api/v1/update/file/:version` : seulement la version proposée, sinon 404 `not_found` ; lien signé, sinon 503 `unavailable` ; audit `update_download` ; redirection 302 ;
- `GET /api/v1/update/status` : `{ok, version, file, paused, rollout}` ou `{ok:false, error, paused, rollout}`.

## Données touchées

Réseau (API Supabase Storage). Écrit dans [[Table audit]] via [[app.js]] (`download`, `update_download`).

## Erreurs et cas limites

- 400/401/403 de Supabase → « Supabase refused the key … check SUPABASE_SERVICE_ROLE_KEY ».
- Aucun `.exe` → « No installer in bucket "<bucket>" … upload the .exe there (the file inside the GitHub zip, not the zip) ».
- Panne réseau → « Supabase unreachable … Check SUPABASE_URL ».
- Déposer un `.exe` **sans** son `.sig` bloque la mise à jour automatique mais pas le téléchargement.

## Liens avec le reste

Créé et utilisé par [[app.js]] ; contrôlé par la page Services de [[admin.js (serveur)]]. Procédure de dépôt : [[Publier une version]] ; bucket : [[Supabase]] ; variables : [[config.js]], [[Variables d'environnement]].

## Tests

`flow.test.js` : « installer from Supabase Storage: signed link, any file name, clear reason when missing », « automatic update: newest installer with its .sig, newer versions only, rollout and pause », « installer version… » ([[Tests du serveur]]).

## À savoir avant de modifier

- Le lien signé est une **URL secrète temporaire** : ne jamais la journaliser ni la recopier dans le vault.
- Le dernier `.exe` déposé devient tout de suite la version téléchargée **et** la mise à jour proposée : déposer d'abord sur le bucket de staging ([[Branches et environnements]]).
