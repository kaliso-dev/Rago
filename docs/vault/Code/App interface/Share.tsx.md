---
type: code
tags: [code, app, react, page, presets, support]
fichier: app/src/pages/Share.tsx
lignes: 375
maj: 2026-11-10
---
# Share.tsx

La page **« Partage et support »** : créer ou importer un code de preset (`RAGO2_…`, ou un fichier `.rago`), et créer le rapport texte à joindre à un ticket Discord. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Partage et support]], [[Presets]]. Tickets : RAG-44 (partage), RAG-70 (rapport).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "share"`. **Pas d'entrée dans la barre latérale** : on y arrive par la ligne « Partage et support » de [[Settings.tsx]] (`goTo("share")`). Pendant ce temps, l'entrée « Paramètres » de la [[Sidebar.tsx]] reste en surbrillance. En haut de page, un lien « ‹ Paramètres » ramène aux paramètres.
- Utilise [[share.ts]] pour le code, [[catalog.ts]] pour comprendre les réglages importés, [[store.tsx]] pour la sélection et « Mes presets », [[api.ts]] pour le presse-papiers, les fichiers et le rapport.
- **Gratuit** : créer, importer et garder un preset marche sans licence. Les réglages Premium d'un preset importé sont comptés à part et ne sont pas ajoutés sans licence.

## Ce que le fichier expose
- `Share()` : la page, en deux cartes (`share-grid`).
- Interne : `PARTS` (les 5 parties du rapport) et le type `Preview` (ce que l'import changerait sur ce PC).

## Fonctionnement détaillé

### Carte 1, partie haute : « Partager un preset »
- En-tête : « {n} réglages allumés », calculé sur `currentSetup` du store. Ce sont les réglages de type `tweak` allumés (appliqués ou cochés), avec leur variante, dans l'ordre du catalogue ; les actions ponctuelles n'y sont pas.
- Aucun réglage allumé : « Aucun réglage allumé pour l'instant… ».
- Champ **« Nom du preset »** (facultatif, `MAX_NAME` = 40 caractères ; « Ton ami le verra en collant le code. »).
- Le code se refait tout seul à chaque changement de la liste ou du nom (`encodePreset({ n, t })`). Il s'affiche dans un cadre avec le bouton **« Copier »** (`api.copyText`, le bouton passe à « Copié » pendant 2,2 s).
- **« Enregistrer en fichier .rago »** : `api.savePresetFile(code, nom, titre)`. Le nom de fichier proposé vient de `presetFileName` (« mon-preset-rago » si le nom est vide). Dans l'app, une boîte « Enregistrer sous » s'ouvre (`@tauri-apps/plugin-dialog`), puis la commande `save_preset_file` écrit le code (voir [[lib.rs]]).
- Échec de l'encodage, de la copie ou de l'enregistrement : « Impossible de créer ou de copier le code. Réessaie. ».

### Carte 1, partie basse : « Importer le preset d'un ami »
- Champ texte (indice `RAGO2_…`), bouton **« Aperçu »** (ou la touche Entrée), lien **« Ouvrir un fichier .rago »**. Le lien passe par `api.openPresetFile` : boîte « Ouvrir », puis commande `read_preset_file`.
- `decodePreset` lit le texte collé, même s'il contient un message Discord entier. En cas d'erreur, un texte s'affiche selon le code d'erreur de [[share.ts]] :
  - `format` → « Ce n'est pas un code de preset Rago Optimizer… » ;
  - `broken` → « Ce code est incomplet ou abîmé… » ;
  - `newer` → « …version plus récente… Mets l'app à jour ».
  - Un champ vide n'affiche rien.
- **Aperçu** (`analyse`) : chaque entrée `id` ou `id:variante` est rangée dans une seule des cases suivantes.
  - **Indisponible sur ce PC** : id inconnu dans cette version, action ponctuelle, ou réglage non disponible ici (`availability` de [[catalog.ts]]).
  - **Réservé à Premium** : réglage fermé (`isLocked`) ou variante fermée (`variantLocked`) pour ce compte.
  - **Déjà allumé** : le réglage est déjà allumé ici avec la même variante.
  - **Nouveau pour toi**. Ceux qui demandent un redémarrage sont aussi comptés (`needsReboot`).
  - Une variante inconnue de cette version est retirée. C'est alors la variante choisie pour ce PC qui s'applique (`variants`, sinon `autoVariant`).
- L'aperçu montre le nom du preset (ou « Preset d'un ami »), le nombre d'entrées et le résumé, par exemple « 12 nouveaux pour toi · 3 déjà allumés · 2 réservés à Premium ».
- L'aperçu **se recalcule** quand le PC détecté, la licence ou les réglages appliqués changent, tant que rien n'a encore été ajouté.
- **« Ajouter à ma sélection »** : `selectMany(entries)` du store coche les réglages ; **rien n'est appliqué**. Le message dit « {n} réglages ajoutés à ta sélection, à appliquer depuis la barre du bas » ([[ApplyBar.tsx]]), ou « Rien à ajouter : tout est déjà allumé. ». Le bouton est grisé s'il n'y a rien de nouveau.
- Sans licence et avec des réglages réservés : bouton « Passer Premium » (`free.upgrade`), qui ouvre la fenêtre Premium (`setUpsell("plan")`, voir [[Upsell.tsx]]).
- **« Garder dans Mes presets »** : champ « Nom dans Mes presets », rempli avec le nom choisi par l'ami et modifiable, puis `savePreset(nom, entrées)` du store. Le preset garde toutes les entrées d'origine (`preset.t`), pas seulement celles ajoutées. Ensuite : « Enregistré dans Mes presets. » et bouton « Modifier », qui ouvre [[PresetEditor.tsx]] sur le nouveau preset.

### Carte 2 : « Rapport pour le support » (RAG-70)
- Texte d'en-tête : « Pour un ticket sur Discord ». Le texte d'accroche promet que le nom, celui du PC, l'e-mail, la clé de licence et les adresses IP sont masqués, et que rien n'est envoyé.
- 5 cases (`PARTS`), toutes cochées sauf la dernière :
  - `pc` : version de Windows, processeur, carte graphique, RAM ;
  - `tweaks` : réglages appliqués ;
  - `history` : 50 derniers changements ;
  - `logs` : 3 derniers journaux ;
  - `network` : détails de la carte réseau, **décochée d'office**.
- **« Créer le rapport »** (grisé si aucune case n'est cochée) : `api.supportReport(parts)`, commande `support_report`. Le fichier est écrit dans le dossier `reports\` des données de l'app (voir [[report.rs]]).
- Ensuite, la carte montre :
  - le nom du fichier et sa taille en Ko ;
  - le lien « Voir le contenu » / « Masquer », qui affiche le texte dans la page ;
  - « Afficher dans le dossier », seulement dans l'app : `api.showReport(nom)` ouvre l'Explorateur sur le fichier ;
  - « Recréer » ;
  - **« Ouvrir le support Discord »** (`SUPPORT_URL` de [[LicenseGate.tsx]] : `VITE_SUPPORT_URL`, sinon le Discord de Rago).
- Échec : « Le rapport n'a pas pu être créé. Réessaie. ».

## Données touchées
- « Mes presets » (`rago.myPresets` dans le `localStorage`, via [[store.tsx]]) quand le joueur garde un preset.
- La sélection en cours du store (rien n'est appliqué sans la barre du bas).
- Fichiers : le `.rago` choisi par le joueur ; les rapports dans `reports\`.

## Erreurs et cas limites
- Le code se recalcule à chaque changement de la liste. Le hook suit le contenu (`setupKey` = la liste jointe par des virgules) et non la référence du tableau, qui change à chaque rendu du store.
- Le nom donné à un preset importé sans nom est « Preset d'un ami ».
- Le commentaire de [[lib.rs]] au-dessus de `save_preset_file` parle encore d'un « code RAGO1-… » : les codes créés sont en `RAGO2_` depuis la 1.2.0 (voir [[share.ts]]). Commentaire en retard, sans effet.

## Simulateur
Avec `npm run window` ([[api.ts]], `mockApi`) : « Enregistrer en fichier .rago » télécharge le fichier par le navigateur, « Ouvrir un fichier .rago » passe par un sélecteur de fichier du navigateur, le rapport est un texte d'exemple en anglais, et le bouton « Afficher dans le dossier » est caché (`isTauri` faux).

## Liens avec le reste
- Fonctionnalités : [[Partage et support]], [[Presets]]. Code du preset : [[share.ts]]. Modifier un preset : [[PresetEditor.tsx]]. Partager un de « Mes presets » depuis l'accueil : [[Dashboard.tsx]].
- Rust : [[report.rs]] (rapport masqué), [[lib.rs]] (`save_preset_file`, `read_preset_file`, `show_report`).
- Textes : clés `share.*` de [[i18n.ts]]. Styles : section « Partage et support » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Les règles de l'aperçu doivent rester les mêmes que celles de `selectMany` dans [[store.tsx]] : sinon l'aperçu annonce un nombre que l'ajout ne respecte pas.
- Ajouter une partie au rapport : `ReportParts` dans [[api.ts]], `report::Parts` dans [[report.rs]], `PARTS` ici et `share.part.<clé>` dans [[i18n.ts]].
