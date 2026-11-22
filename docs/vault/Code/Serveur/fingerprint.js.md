---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/fingerprint.js
lignes: 51
maj: 2026-11-10
---
# fingerprint.js

Lit et compare l'empreinte du PC envoyée par l'app (3 identifiants hachés) et applique la règle « même PC = 2 sur 3 ». Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Licence dans l'app]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Une licence Premium est verrouillée sur **un seul PC**. L'app envoie à chaque appel un objet `device` avec une empreinte faite de 3 identifiants matériels/système, chacun déjà haché par l'app : `hex(SHA-256("rago-fp-v1|" + nom + "|" + valeur normalisée))`. Le serveur ne voit donc jamais les valeurs brutes. Ce module valide cet objet et décide si deux empreintes désignent le même PC. La même règle est codée côté app (Rust) : elles doivent rester identiques (voir [[API du serveur]]).

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `COMPONENTS` | `['machine_guid', 'smbios_uuid', 'board_serial']`. |
| `DeviceError` | Erreur levée quand l'objet `device` est mal formé ; [[app.js]] la transforme en `400 invalid_request` avec `detail`. |
| `parseDevice(input)` | Valide `device` et renvoie `{fp: {machine_guid, smbios_uuid, board_serial}, name, os, appVersion}`. |
| `sameDevice(stored, incoming)` | Vrai si les deux empreintes sont celles du même PC. |

## Fonctionnement détaillé

`parseDevice` :
1. `device` doit être un objet, `device.fingerprint.v` doit valoir **1** (sinon « device.fingerprint.v must be 1 ») ;
2. chaque composant vaut `null`, `undefined` ou `''` (devient `null`), ou une chaîne de **64 caractères hexadécimaux** (mise en minuscules) ; toute autre valeur lève une erreur ;
3. `machine_guid` est **obligatoire** ;
4. `name` coupé à 64 caractères (défaut « Windows PC »), `os` à 64, `app_version` à 32 (espaces de début et de fin retirés).

`sameDevice` : compte les composants présents des deux côtés (`comparable`) et ceux qui sont égaux (`matches`). Résultat : `matches >= min(2, comparable)`, et faux si `comparable = 0`. Conséquences :
- 3 composants lisibles : 2 égaux suffisent. Réinstaller Windows (nouveau `MachineGuid`, mais UUID et numéro de carte mère inchangés) : **même PC**. Changer la carte mère (UUID et numéro changent ensemble, seul `machine_guid` reste) : 1 sur 3, **autre PC** ;
- si seul `machine_guid` est lisible des deux côtés, il doit être égal.

| Identifiant | Source côté app | Change quand |
|---|---|---|
| `machine_guid` | registre `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` | Windows réinstallé |
| `smbios_uuid` | WMI `Win32_ComputerSystemProduct.UUID` | carte mère changée |
| `board_serial` | WMI `Win32_BaseBoard.SerialNumber` | carte mère changée |

## Données touchées

Aucune directement. Les empreintes validées sont écrites par [[licensing.js]] dans [[Table devices]] et recopiées dans [[Table referrals]] ; [[affiliates.js]] les enregistre dans [[Table account_devices]].

## Liens avec le reste

- Appelé par [[app.js]] (`parseDevice` sur `/auth/login`, `/licenses/activate`, `/licenses/refresh`), [[licensing.js]] (`sameDevice` dans `deviceState` et `activate`), [[affiliates.js]] (comparaison avec les PC de l'affilié).
- Contrat complet de l'empreinte et liste des valeurs bidon remplacées par `null` côté app : `licensing/docs/API.md` (voir [[Documentation et configuration du serveur]]).

## Tests

« app: login, activate, one device only, reinstall tolerated, refresh, refund » et « concurrent activations from two PCs: exactly one wins » dans `flow.test.js` ([[Tests du serveur]]).

## À savoir avant de modifier

- Toute modification de la règle doit être faite **en même temps** dans l'app (Rust), sinon l'app et le serveur ne sont plus d'accord sur « même PC ».
- `v: 1` est la version du format de hachage : un changement de normalisation côté app impose `v: 2` et une période de compatibilité.
