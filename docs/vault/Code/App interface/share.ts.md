---
type: code
tags: [code, app, typescript, presets]
fichier: app/src/lib/share.ts
lignes: 152
maj: 2026-11-10
---
# share.ts

Encode et décode les **codes de preset partagés** (`RAGO2_…`, et l'ancien `RAGO1-…`) : la liste des réglages allumés et de leurs variantes, compressée, sans rien sur le PC ni le joueur. Aucun serveur n'est interrogé. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Partage et support]], [[Presets]]. Ticket d'origine : RAG-44.

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Utilisé par [[Share.tsx]] (créer un code, coller un code, fichier `.rago`), [[Dashboard.tsx]] (partager un de « Mes presets ») et [[PresetEditor.tsx]] (`MAX_NAME`).
- Le code se colle sur Discord ou s'enregistre dans un fichier `.rago` ([[api.ts]] `savePresetFile` / `openPresetFile`).

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `SharedPreset { n?, t }` | nom facultatif et entrées `"id"` ou `"id:variante"` (même format que les presets du catalogue) |
| `MAX_NAME` | 40 caractères de nom |
| `encodePreset(p)` | → `"RAGO2_" + base62(deflate-raw(JSON))` |
| `decodePreset(text)` | → `SharedPreset`, ou lève `ShareError` |
| `ShareError` | erreur dont le message est `empty`, `format` (pas un code Rago), `broken` (un code, mais incomplet ou abîmé) ou `newer` (version plus récente de l'app) |
| `presetFileName(name)` | nom de fichier proposé : accents retirés, tout sauf lettres et chiffres → `-`, minuscules, 40 caractères au plus, extension `.rago` ; vide → `rago-preset.rago` |

## Fonctionnement détaillé

### Pourquoi `RAGO2_` (1.2.0)
Le format `RAGO1-` d'avant (base64url) se cassait une fois collé sur Discord : un double-clic n'en prenait qu'un morceau (le `-` coupe le mot) et Discord efface les `__` qu'il prend pour du souligné. `RAGO2_` n'a que des lettres et des chiffres après le préfixe. Les deux formats se lisent encore.

### Encodage
1. JSON `{ v: 2, n?: <nom coupé à 40>, t: [...] }` (le nom n'est mis que s'il n'est pas vide).
2. Compression `CompressionStream("deflate-raw")` (API du navigateur, WebView2).
3. Conversion en **base 62** (`0-9A-Za-z`) : un octet `0x01` est ajouté devant pour garder les zéros de tête, le tout est lu comme un grand nombre (`BigInt`) et découpé par paquets de 8 caractères (62⁸ tient dans un nombre JavaScript exact) ; les `0` de tête du résultat sont retirés.

### Décodage
1. Retire les caractères invisibles que certaines messageries glissent (`U+00AD`, `U+200B` à `U+200D`, `U+2060`, `U+FEFF`) ; texte vide → `empty`.
2. Cherche un code avec l'expression `RAGO(\d+)([-_])([A-Za-z0-9_-]+)` (insensible à la casse) : le code peut être seul, entre accents graves, dans une phrase, ou entouré du nom et de l'heure d'un message Discord copié. Essai d'abord sur le texte tel quel, puis **sans aucun espace ni retour à la ligne** (code coupé en deux lignes).
3. Pour chaque code trouvé : version autre que 1 ou 2 → `newer` ; séparateur incorrect (`_` pour la v2, `-` pour la v1) ou corps de plus de **16 000 caractères** → `broken` ; pour la v2, seuls les caractères alphanumériques du début comptent.
4. Décompression limitée à **64 Kio** de JSON (au-delà, lecture arrêtée : protection contre une archive piégée qui gonfle sans fin).
5. Vérifie que `t` est un tableau ; `v` > 2 → `newer` ; garde les entrées qui respectent `^[a-z0-9_]{1,64}(:[a-z0-9_]{1,64})?$`, sans doublon, **600 au plus** ; aucune → `broken`.
6. Nom : caractères de contrôle retirés, coupé à 40.
7. Si plusieurs codes échouent, `newer` l'emporte sur `broken` (il faut d'abord mettre l'app à jour).

Le décodage ne vérifie pas que les ids existent dans le catalogue : c'est l'appelant qui filtre (via `selectMany` / `toApply` de [[store.tsx]]).

## Erreurs et cas limites
- Tout code abîmé donne une `ShareError` lisible ; [[Share.tsx]] affiche le texte correspondant (`share.*` dans [[i18n.ts]]).
- Le catalogue entier tient en moins de 8 Ko de JSON : les limites (64 Kio, 600 entrées, 16 000 caractères) ne gênent jamais un vrai preset.

## À savoir avant de modifier
- Un nouveau format doit garder la lecture de `RAGO1-` et `RAGO2_` : des codes circulent sur le Discord.
- Changer le préfixe ou l'alphabet casse tous les codes déjà partagés.
