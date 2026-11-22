---
type: code
tags: [code, app, rust, minecraft, rbw]
fichier: app/src-tauri/src/rbw.rs
lignes: 178
maj: 2026-11-10
---
# rbw.rs

**Vérification Ranked Bedwars** : état de ce que lit le vérificateur de RBW (RBW-SS, `Services.ps1`, relevé le 13/10/2026, voir `app/tools/rbw.py`), affiché sous le module RBW Mod. **Lecture seule.** Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[RBW Mod]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Commande `rbw_status` de [[lib.rs]] (dans un fil à part) ; l'interface (`RbwStatus.tsx`) la relit **toutes les 5 s**.
- Ce qui corrige, c'est le réglage RBW Mod « Activé » (`rbw_mode`, catalogue, script `Rago-RBW-Fix.ps1`) ; ce fichier ne change rien.

## Ce que le fichier expose

- `SERVICES` (ordre du vérificateur, 11) : `SysMain`, `PcaSvc`, `DPS`, `BAM`, `EventLog`, `WSearch`, `DusmSvc`, `BFE`, `AppInfo`, `DCOMLaunch`, `PlugPlay` ; suivis de chaque instance `CDPUserSvc_<xxxx>` (une par session, trouvée dans `HKLM\SYSTEM\CurrentControlSet\Services` ; le modèle `CDPUserSvc` seul ne tourne jamais).
- `SETTINGS` (nom affiché par le vérificateur, clé, valeur) :

| Nom | Clé | Valeur |
|---|---|---|
| CMD | `HKCU\Software\Policies\Microsoft\Windows\System` | `DisableCMD` |
| PowerShell Scriptblock Logging | `HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging` | `EnableScriptBlockLogging` |
| Activities Cache | `HKLM\SOFTWARE\Policies\Microsoft\Windows\System` | `EnableActivityFeed` |
| Prefetch | `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters` | `EnablePrefetcher` |
| Jump Lists | `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced` | `Start_TrackDocs` |

- `APPCOMPAT` = `HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat` : sa présence coupe la journalisation PCA (« PCA Logging: Disabled »).
- `Check { name, kind, ok, state, start }` : `kind` = `service` ou `setting` ; `state` = `running`, `stopped`, `starting`, `stopping`, `paused`, `missing` pour un service, `on`/`off` pour un réglage ; `start` = `auto`, `manual`, `disabled`, `boot`, `system`.
- `setting(nom, valeur)`, `status()`.

## Fonctionnement détaillé

1. Chaque service : ouvert en lecture (état et configuration) ; `ok` seulement s'il **tourne** ; introuvable → `missing`. Le type de démarrage est lu par `QueryServiceConfigW`.
2. Chaque réglage : **en rouge seulement s'il existe et vaut 0** ; absent = valeur par défaut de Windows = bon.
3. Ligne finale « PCA Logging » : bonne si la clé `AppCompat` n'existe pas.
4. Total : 11 services + les `CDPUserSvc_*` + 5 réglages + PCA Logging (les « 6 réglages » de [[RBW Mod]]).

## Données touchées

Lecture seule : gestionnaire de services Windows et registre (via [[reg.rs]]). Rien d'écrit.

## Erreurs et cas limites

- Hors Windows, chaque service est `missing` et aucun réglage n'est lu.

## Liens avec le reste

- Appelé par [[lib.rs]] (`rbw_status`) ; utilise [[reg.rs]].
- Fonctionnalité : [[RBW Mod]] ; réglage correcteur : [[Tweaks RBW Mod]] et [[Catalogue des tweaks]].

## Tests

- `settings_are_red_only_at_zero` : absent ou 3 → bon ; 0 → `off`.
- `same_checks_as_the_checker` : chaque service et chaque réglage figure dans `app/tools/rbw.py` (même liste que le vérificateur et que le RBW Mod) ; `status()` rend `SERVICES` + `SETTINGS` + 1 lignes hors Windows.

## À savoir avant de modifier

- Toute nouvelle vérification de RBW-SS doit être ajoutée **ici et dans `app/tools/rbw.py`** (le test le vérifie) et au script du RBW Mod.
- Rester en lecture seule : ce qui corrige est le RBW Mod « Activé ».
