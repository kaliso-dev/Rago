---
type: code
tags: [code, app, react, page, presets, support]
fichier: app/src/pages/Share.tsx
lignes: 541
maj: 2026-11-25
---
# Share.tsx

La page **« Partage et support »** : créer ou importer un code de preset (`RAGO2_…`, ou un fichier `.rago`), et créer le rapport texte à joindre à un ticket Discord. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Partage et support]], [[Presets]]. Tickets : RAG-44 (partage), RAG-70 (rapport).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`), avec l'écran v5 de la PR #127.

**Écran v5 (23/11, dans `staging` par la PR #127, fusionnée le 23/11, jamais testé sur Windows)** : la page est refaite à l'identique des maquettes `app-share.html` et `app-share-states.html` (demande de Sofiene du 23/11 : l'app doit être « strictement conforme au design »). Le fonctionnement ne change pas, sauf trois détails notés plus bas (message « rien à ajouter », bouton « Afficher dans le dossier » visible aussi dans la démo, texte du rapport qui défile dans son cadre). Racine `pg-mod pg-pages pg-share is-page`, CSS des maquettes `s5/pages/pages.css` et bloc « Partage » de `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]).

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "share"`. **Pas d'entrée dans la barre latérale** : on y arrive par la ligne « Partage et support » de [[Settings.tsx]] (`goTo("share")`). Pendant ce temps, l'entrée « Paramètres » de la [[Sidebar.tsx]] reste en surbrillance. En haut de page, le surtitre commence par « ‹ settings » (bouton `.bk`), qui ramène aux paramètres.
- Utilise [[share.ts]] pour le code, [[catalog.ts]] pour comprendre les réglages importés, [[store.tsx]] pour la sélection et « Mes presets », [[api.ts]] pour le presse-papiers, les fichiers et le rapport.
- **Gratuit** : créer, importer et garder un preset marche sans licence. Les réglages Premium d'un preset importé sont comptés à part et ne sont pas ajoutés sans licence.

## Ce que le fichier expose
- `Share()` : la page. En-tête (titre géant, et dans l'étiquette rouge le nombre de réglages du code avec une barre de traits), puis deux colonnes (`.setgrid.shgrid`) : à gauche « Partager un preset » et « Importer le preset d'un ami », à droite « Rapport pour le support ».
- Interne : `PARTS` (les 5 parties du rapport), le type `Preview` (ce que l'import changerait sur ce PC, avec `marks`, un segment par réglage), `ORDER` (ordre des segments : nouveaux, déjà allumés, Premium, indisponibles), `Field` (case `.in3` de la maquette avec un `<input>` transparent dedans), `ReportText` (texte du rapport) et `titleSize` (96 px comme la maquette, plus petit si le titre est plus long).

## Fonctionnement détaillé

### Colonne de gauche, bloc 1 : « Partager un preset »
- En-tête de la page : le nombre, « tweaks » et « in your code, ready to send » (« prêts à partager » en français ; « turn some on to share » à 0), et une barre d'un trait par réglage (60 au plus). Titre du bloc : étiquette « {n} réglages allumés », calculé sur `currentSetup` du store. Ce sont les réglages de type `tweak` allumés (appliqués ou cochés), avec leur variante, dans l'ordre du catalogue ; les actions ponctuelles n'y sont pas.
- Aucun réglage allumé : le cadre ne montre que l'icône et « Aucun réglage allumé pour l'instant… » (`.emp2`).
- Champ **« Nom du preset »** (facultatif, `MAX_NAME` = 40 caractères ; « Ton ami le verra en collant le code. »).
- Le code se refait tout seul à chaque changement de la liste ou du nom (`encodePreset({ n, t })`). Il s'affiche dans un **ticket** (`.tkt`) : « preset » et le nom (« sans nom » en gris s'il est vide), le code avec `RAGO2_` en rouge, et à droite le nombre de réglages et le bouton rouge **« Copier »** (`api.copyText`, le bouton passe à « Copié », neutre avec une coche, pendant 2,2 s).
- **« Enregistrer en fichier .rago »** : `api.savePresetFile(code, nom, titre)`. Le nom de fichier proposé vient de `presetFileName` (« mon-preset-rago » si le nom est vide). Dans l'app, une boîte « Enregistrer sous » s'ouvre (`@tauri-apps/plugin-dialog`), puis la commande `save_preset_file` écrit le code (voir [[lib.rs]]).
- Échec de l'encodage, de la copie ou de l'enregistrement : « Impossible de créer ou de copier le code. Réessaie. ».

### Colonne de gauche, bloc 2 : « Importer le preset d'un ami »
- Champ texte (indice `RAGO2_…`), bouton **« Aperçu »** (ou la touche Entrée), lien **« Ouvrir un fichier .rago »**. Le lien passe par `api.openPresetFile` : boîte « Ouvrir », puis commande `read_preset_file`.
- `decodePreset` lit le texte collé, même s'il contient un message Discord entier. En cas d'erreur, la case du code passe au rouge et un encadré (`.err2`) s'affiche selon le code d'erreur de [[share.ts]] :
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
- L'aperçu (`.pv2`) montre le nom du preset (ou « Preset d'un ami »), le nombre d'entrées, une **barre à segments** (un par réglage : rouge pour un nouveau, avec un point au-dessus s'il demande un redémarrage, gris pour un déjà allumé, hachuré rouge pour un réservé à Premium, vide pour un indisponible ; chaque groupe garde l'ordre du code) et la légende avec les nombres (« 15 nouveaux pour toi », « 7 déjà allumés », « 4 demandent un redémarrage », « 3 réservés à Premium », « 2 indisponibles sur ce PC »).
- L'aperçu **se recalcule** quand le PC détecté, la licence ou les réglages appliqués changent, tant que rien n'a encore été ajouté.
- **« Ajouter à ma sélection »** : `selectMany(entries)` du store coche les réglages ; **rien n'est appliqué**. Le bouton laisse la place au message « {n} réglages ajoutés à ta sélection, à appliquer depuis la barre du bas » ([[ApplyBar.tsx]]). S'il n'y a rien de nouveau, pas de bouton : « Rien à ajouter : tout est déjà allumé. » s'affiche dès l'aperçu, seulement si c'est vrai (au moins un déjà allumé et aucun réservé à Premium ; avant le 23/11 : bouton grisé, puis ce message même quand le reste était réservé à Premium).
- Sans licence et avec des réglages réservés : bouton « Passer Premium » (`free.upgrade`), qui ouvre la fenêtre Premium (`setUpsell("plan")`, voir [[Upsell.tsx]]).
- **« Garder dans Mes presets »** : champ « Nom dans Mes presets », rempli avec le nom choisi par l'ami et modifiable, puis `savePreset(nom, entrées)` du store. Le preset garde toutes les entrées d'origine (`preset.t`), pas seulement celles ajoutées. Ensuite : « Enregistré dans Mes presets. » et bouton « Modifier », qui ouvre [[PresetEditor.tsx]] sur le nouveau preset.

### Colonne de droite : « Rapport pour le support » (RAG-70)
- À droite du titre : « Pour un ticket sur Discord ». Le texte d'accroche promet que le nom, celui du PC, l'e-mail, la clé de licence et les adresses IP sont masqués, et que rien n'est envoyé.
- 5 lignes à cocher (`PARTS`, `role="checkbox"`, à la souris, à Espace ou à Entrée), toutes cochées sauf la dernière :
  - `pc` : version de Windows, processeur, carte graphique, RAM ;
  - `tweaks` : réglages appliqués ;
  - `history` : 50 derniers changements ;
  - `logs` : 3 derniers journaux ;
  - `network` : détails de la carte réseau, **décochée d'office**.
- La carte du rapport finit à la hauteur de la colonne de gauche (25/11, PR #139, après le test de Sofiene : un grand vide restait sous le bouton) : la liste des cases s'étire et les lignes se partagent la place (`s5/grids.css`). Jamais testé sur Windows.
- **« Créer le rapport »** (rouge ; grisé si aucune case n'est cochée ; une icône tourne pendant la création) : `api.supportReport(parts)`, commande `support_report`. Le fichier est écrit dans le dossier `reports\` des données de l'app (voir [[report.rs]]).
- Ensuite, la carte montre :
  - le nom du fichier et sa taille en Ko ;
  - le lien « Voir le contenu » / « Masquer », qui affiche le texte dans la page (`ReportText`) : les titres « == … == » en blanc, la ligne « Hidden in this file… » avec un liseré rouge ; le texte défile dans un cadre de 330 px, avec un fondu en bas qui disparaît en fin de texte ;
  - « Afficher dans le dossier » (« Ouvrir le dossier » en français) : `api.showReport(nom)` ouvre l'Explorateur sur le fichier ;
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
Avec `npm run window` ([[api.ts]], `mockApi`) : « Enregistrer en fichier .rago » télécharge le fichier par le navigateur, « Ouvrir un fichier .rago » passe par un sélecteur de fichier du navigateur, le rapport est un texte d'exemple écrit comme celui de [[report.rs]] (en-tête, ligne de ce qui est masqué, PC de démo, réglages appliqués et historique de la démo), et « Afficher dans le dossier » ne fait rien.

## Liens avec le reste
- Fonctionnalités : [[Partage et support]], [[Presets]]. Code du preset : [[share.ts]]. Modifier un preset : [[PresetEditor.tsx]]. Partager un de « Mes presets » depuis l'accueil : [[Dashboard.tsx]].
- Rust : [[report.rs]] (rapport masqué), [[lib.rs]] (`save_preset_file`, `read_preset_file`, `show_report`).
- Textes : clés `share.*` de [[i18n.ts]]. Styles : `s5/pages/pages.css` et bloc « Partage » de `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]) ; l'ancienne section de `features.css` est retirée le 23/11 ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Les règles de l'aperçu doivent rester les mêmes que celles de `selectMany` dans [[store.tsx]] : sinon l'aperçu annonce un nombre que l'ajout ne respecte pas.
- Ajouter une partie au rapport : `ReportParts` dans [[api.ts]], `report::Parts` dans [[report.rs]], `PARTS` ici et `share.part.<clé>` dans [[i18n.ts]].
