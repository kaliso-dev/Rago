---
type: code
tags: [code, app, catalogue, générateur, python, archive]
fichier: app/tools/fix_free_bat.py
lignes: 149
maj: 2026-11-10
---
# fix_free_bat.py

Fabriquait « Rago Free », une version gratuite **corrigée** de l'ancien `.bat` Premium v5.2. **Gardé pour mémoire seulement** : le site ne propose plus de `.bat` gratuit depuis le 07/10/2026 (choix de Sofiene), seule l'app est gratuite. Ce script ne fait partie d'aucune chaîne de fabrication. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Anciens scripts .bat]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `6c2bcad`, app 1.1.5), jamais modifié depuis. La décision d'abandon est notée dans [[Décisions]] (« `.bat` gratuit comme produit d'appel » → « seule l'app est gratuite », 07/10).

## Rôle et place dans l'ensemble
- **Commande** : `python3 tools/fix_free_bat.py [sortie]` (depuis `app/`). Sans argument, il écrit `<racine du dépôt>/free/rago-free-v5.2.bat` (le dossier `free/` n'existe pas dans le dépôt : il serait créé). Aucun `npm run` ni aucune CI ne le lance.
- Il reprend les corrections mécaniques de [[extract_bat.py]] (en les recodant, sans l'importer) mais travaille sur **le fichier entier**, menus compris, en gardant toutes les options : il produit un `.bat` jouable, pas des scripts pour l'app.
- Les octets d'origine sont conservés (lecture et écriture en `latin-1`, lignes séparées par CRLF, faux BOM `FF FE` gardé).

## Fonctionnement détaillé
Pour chaque ligne (hors `echo`, `::`, `rem`, `set "$message`) :
1. « Disabling »/« Enabling » → « Disable »/« Enable » ;
2. `reg add … /v DevicePriority|MessageNumberLimit /f` sans valeur → `reg delete … >nul 2>&1` ;
3. `REG_BINARY /d 90 00 00 00` → `9012038010000000` ;
4. `HKU\!USER_SID!\` → `HKCU\` ;
5. chemin du profil NVIDIA sur le PC de l'auteur → `NIP` : import par `nvidiaProfileInspector.exe -silentImport` posé **à côté du `.bat`** (`%~dp0`), sinon message `[skip]`.
Puis, sur toutes les lignes :
6. suppression de `EdgeWebView`, `EdgeUpdate`, `EdgeCore`, `Temp` d'Edge → `echo [skip] Edge WebView2 kept: Rago Optimizer needs it.` ;
7. vidage de `C:\Windows\Prefetch` → `rem Prefetch folder left untouched.` (lu comme des traces effacées en screenshare, voir [[RBW Mod]]) ;
8. `netsh advfirewall reset` → seulement si `RAGO_FIREWALL` vaut 1 ; `FeatureSettingsOverride` 1 ou 3 (Spectre/Meltdown) → seulement si `RAGO_SPECTRE` vaut 1 ;
9. ligne collée de ChatGPT (`contentReference[oaicite`) → `rem (invalid line removed)` ; MTU sur la carte « Ethernet » en guillemets typographiques → boucle `MTU` sur toutes les cartes connectées (hors Loopback) ; `.nip` lancé par association de fichier → `NIP` ; `sc config|start CDPUserSvc_5d3cf` → boucle `CDP` sur tous les `CDPUserSvc_*` ;
10. en-têtes « Thanks for your Purchase ! » → « Thanks for downloading Rago Free ! » et « Premium Version V5 » → « Rago Free V5.2 ».
Ensuite : les boucles `do set "str=%%i" (` sont rattachées à leur corps (`& (`), fermées après la dernière ligne qui utilise `%%i`. Enfin, juste avant la ligne `:: Warning`, un bloc `ASK` pose **deux questions** au lancement (`choice /c YN`) : autoriser la remise à zéro du pare-feu, et couper les protections Spectre/Meltdown ; les réponses remplissent `RAGO_FIREWALL` et `RAGO_SPECTRE` (0 par défaut).
Contrôle final : aucune ligne modifiée ne contient `(\'` (un antislash avant l'apostrophe ferait lire à `for /f` une liste de fichiers). Affiche le chemin écrit et le nombre de corrections par type.

## Données touchées
Lit `app/legacy/Premium v5.2 - Rago Hub.bat` ([[Anciens scripts .bat]]) ; écrit le `.bat` de sortie (crée son dossier). **Ne pas lancer sans argument dans le dépôt** : il créerait un dossier `free/` à la racine.

## Erreurs et cas limites
- `lines.index(':: Warning')` lève `ValueError` si l'en-tête du `.bat` change. Au 10/11, la ligne existe toujours (le changement des crédits du 10/11, commit `a190565`, n'y touche pas).

## Liens avec le reste
- Mêmes corrections que [[extract_bat.py]] et que `SAFETY_DROPS` de [[build_catalog.py]].
- Plan gratuit actuel de l'app : [[free.json]], [[Offres et prix]].

## À savoir avant de modifier
- Code mort côté produit : ne pas le faire évoluer sans une demande de Sofiene. S'il n'est plus utile même pour mémoire, sa suppression est une décision à lui demander (le fichier est cité dans l'historique du projet).
