---
type: code
tags: [code, app, typescript, catalogue]
fichier: app/src/lib/catalog.ts
lignes: 188
maj: 2026-11-11
---
# catalog.ts

Charge [[catalog.json]] et en tire les tables et fonctions dont toute l'interface se sert : types du catalogue, réglages par id, module de chaque réglage, variante automatique, disponibilité sur ce PC, recherche. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- C'est la seule porte d'entrée du catalogue côté front : [[store.tsx]], [[ModulePage.tsx]], [[TweakRow.tsx]], [[SearchPalette.tsx]], [[Dashboard.tsx]], [[Games.tsx]], [[Share.tsx]], [[PresetEditor.tsx]], [[Overlay.tsx]] et le simulateur de [[api.ts]] l'importent.
- Le calcul est fait **une fois**, au chargement du module (tables construites à l'import).
- Le moteur Rust a sa propre lecture du même fichier ([[catalog.rs]]) : les deux doivent rester d'accord (même notion de jumeau, de retour, de redémarrage).

## Ce que le fichier expose

### Types
- `Lang` = `"fr" | "en"` ; `I18n` = `{ fr, en }` ; `Risk` = `"safe" | "advanced"`.
- `Variant { id, label, auto?, revert?, reboot?, lines? }`.
- `Tweak { id, name, desc, risk, reboot, kind: "tweak" | "action", variants?, defaultVariant?, requires, confirm?, native?, lines, optifine?, twin?, gain?, cons?, restore? }`.
- `Retired { id, name, reason, reboot, module }` : réglage retiré, encore annulable.
- `Section { id, name, requires?, tweaks: (Tweak | { ref })[] }`, `Module { id, icon, name, tagline, sections }`.
- `Preset { id, name, desc, tweaks, game?, tag?, match? }`.
- `Availability { ok, warn?, block? }`.

### Données
| Nom | Contenu |
|---|---|
| `catalog` | le JSON tel quel, typé `Catalog { version, modules, presets, retired }` |
| `retired` | `Map` id → `Retired` (17 entrées en 1.3.0) |
| `tweaks` | `Map` id → `Tweak` (231 entrées ; les `ref` sont ignorés à la construction) |
| `tweakModule` | `Map` id → id du module où le réglage est **déclaré** |
| `totalTweaks` | nombre de réglages annoncé (app et site) : ids distincts après fusion des jumeaux (`twin`) → **218** |

### Fonctions
| Fonction | Ce qu'elle fait |
|---|---|
| `needsReboot(tw, variant?)` | `reboot` de la variante si elle en a un, sinon celui du réglage (RBW Mod « On » redémarre, « Off » non) |
| `normalizeName(name)` | minuscules, lettres et chiffres seuls (expression `[^\p{L}\p{N}]` retirée) ; même règle que [[games.rs]] |
| `presetForGame(name)` | preset dont un mot de `match` est contenu dans le nom normalisé ; garde **le mot le plus long** (« Minecraft for Windows » prend Bedrock, `minecraftforwindows`, et pas `mc_pvp`, `minecraft`) |
| `sectionTweaks(section)` | réglages d'une section, renvois `ref` résolus |
| `distinctKey(id)` | `twin` du réglage ou son id (pour compter sans doublons) |
| `autoVariant(tw, sys)` | sans variantes : `undefined` ; avec un PC connu, la première variante dont `auto` correspond (`ram:<palier>` comparé à `sys.ramTier`, `cpu:<marque>` à `sys.cpuVendor`, `os:11`/`os:10` à `sys.isWin11`) ; sinon `defaultVariant`, sinon la première |
| `availability(tw, sys)` | ce qui bloque un réglage sur ce PC (voir plus bas) |
| `searchTweaks(q, lang)` | recherche plein texte (voir plus bas), 40 résultats au plus |

## Fonctionnement détaillé

### Disponibilité (`availability`)
Sans infos du PC (`sys` nul) : tout est disponible. Sinon, pour chaque exigence de `requires` :
- `gpu:<marque>` : aucune carte graphique de cette marque → `{ ok: false, block: "noGpu.<marque>" }` ;
- `cpu:<marque>` : processeur d'une autre marque → `{ ok: false, block: "noCpu.<marque>" }` ;
- `res:<fichier>` : outil absent de `sys.resources` → `{ ok: false, block: "missingRes" }`, **sauf** `smartctl.exe` (le réglage marche en partie sans) ;
- `wmic` sans WMIC sur le PC → `{ ok: true, warn: "needsWmic" }` (le réglage reste possible, WMIC est installé en tête du lot). Aucun réglage du catalogue 1.3.0 ne demande plus `wmic`.

Les valeurs `block`/`warn` sont des **clés i18n** (préfixe ajouté par l'appelant, voir [[TweakRow.tsx]] et [[i18n.ts]]).

### Recherche (`searchTweaks`)
1. Normalise la requête : décomposition Unicode (`NFD`), accents retirés, minuscules ; découpe en mots.
2. Pour chaque réglage, texte cherché = nom dans la langue + description dans la langue + nom anglais + id, normalisé pareil.
3. Garde les réglages qui contiennent **tous** les mots ; coupe à 40.
Utilisée par la palette Ctrl+K ([[SearchPalette.tsx]]).

## Erreurs et cas limites
- `sectionTweaks` filtre un `ref` vers un id inconnu (au lieu de planter).
- `catalog` est typé par une conversion forcée (`as unknown as Catalog`) : une erreur de format dans le JSON ne se voit qu'à l'exécution.

## Liens avec le reste
- Lit [[catalog.json]], produit par [[build_catalog_v6.py]].
- Utilisé par [[store.tsx]] (verrous, variantes, lots, `itemName`), [[ModulePage.tsx]], [[TweakRow.tsx]], [[SearchPalette.tsx]], [[Games.tsx]] (`presetForGame`, `normalizeName`), [[Dashboard.tsx]], [[Share.tsx]], [[PresetEditor.tsx]], [[Overlay.tsx]], [[api.ts]] (simulateur), et depuis la PR #90 (11/11) [[Tools.tsx]] (`catalog`, `sectionTweaks`, `distinctKey` : les actions de tous les onglets, jumeaux comptés une fois).
- Miroir Rust : [[catalog.rs]].

## À savoir avant de modifier
- `totalTweaks` est le chiffre affiché partout (« 218 réglages ») : le site le recopie par `site/tools/sync_app.py`. Changer la façon de compter change les textes publics.
- Toute nouvelle forme d'exigence (`requires`) doit être ajoutée ici **et** dans le moteur.
