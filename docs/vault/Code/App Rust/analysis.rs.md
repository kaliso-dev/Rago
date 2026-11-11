---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/analysis.rs
lignes: 169
maj: 2026-11-11
---
# analysis.rs

« Analyze my PC » ([[Version 1.3.0]]) : ce que Windows dit du PC, **lu sans rien changer** : fréquence de l'écran, processus, vitesse de la mémoire, câble ou Wi-Fi, Game DVR, notifications, mode d'alimentation, logiciels qui tournent en fond. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Analyse du PC]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 04/11.

## Rôle et place dans l'ensemble
- Appelé par la commande `analysis_facts` de [[lib.rs]] (dans `spawn_blocking`), qui ajoute au résultat le champ `lastMatch` (dernière partie suivie par la [[Barre en jeu]], [[overlay.rs]]).
- L'interface (`app/src/pages/Analysis.tsx`) ajoute elle-même le test réseau ([[nettest.rs]]), la charge du processeur ([[stats.rs]]) et l'âge du pilote graphique ([[tools.rs]]), puis compare chaque valeur à sa norme et dit ce qui la règle : le plan gratuit, Premium, ou le joueur.
- Emprunte à [[session.rs]] : `Check`, `checks(procs, false)` (logiciels en fond, mêmes listes que pendant une partie) et `parse_scheme` ; à [[games.rs]] : `process_paths()`.
- **PR #91** (11/11, pas encore dans `staging`) : `refresh()` devient publique (fréquence actuelle et la plus haute de l'écran), pour que [[tips.rs]] la relise pendant une partie ([[Conseils au lancement du jeu]]) ; et `checks` y ajoute Medal et Wallpaper Engine, qui apparaissent donc aussi dans « Applis en arrière-plan » de l'[[Analyse du PC]].

## Ce que le fichier expose
`struct Facts` (JSON camelCase) et `facts() -> Facts`.

| Champ | Sens | Source |
|---|---|---|
| `refresh`, `refresh_max` | fréquence actuelle de l'écran principal et la plus haute proposée à la même définition (Hz) | `EnumDisplaySettingsW` : mode courant, puis tous les modes (2000 au plus) de même largeur et hauteur ; 0 ou 1 (« par défaut du matériel ») → `None` |
| `processes` | nombre de processus en cours | `games::process_paths()` |
| `mem_speed` | vitesse réglée de la mémoire (MT/s) | plus petite `ConfiguredClockSpeed` > 0 de `Win32_PhysicalMemory` |
| `mem_rated` | vitesse prévue par les barrettes | plus grande `Speed` |
| `wired` | `true` câble, `false` Wi-Fi, `None` inconnu | `PhysicalMediaType` de la carte de la route par défaut (`Get-NetRoute 0.0.0.0/0`, plus petite métrique) : contient « 802.3 » → câble ; « 802.11 » ou « wireless » → Wi-Fi |
| `game_dvr` | enregistrement en fond de la Xbox Game Bar actif | `HKCU\System\GameConfigStore\GameDVR_Enabled` et `HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR\AppCaptureEnabled` : **absent vaut actif** (défaut de Windows), l'un des deux à 0 le coupe |
| `notifications` | notifications de Windows actives | `HKCU\…\PushNotifications\ToastEnabled` ≠ 0 |
| `power_scheme` | GUID du mode d'alimentation actif | `powercfg /getactivescheme`, lu par `session::parse_scheme` (par exemple le GUID « Utilisation normale ») |
| `background` | téléchargements, synchronisation, enregistrement qui tournent | `session::checks(procs, false)` |

## Fonctionnement détaillé
Un seul script PowerShell (`SCRIPT`) rend `{memSpeed, memConfigured, media, dvr, capture, toast, scheme}` en JSON compact ; `from_raw` le transforme (testé hors Windows). Tout ce qui manque reste `None`. Hors Windows, `read()` rend des valeurs vides et `refresh` rend `(None, None)`.

## Tests
`reads_the_script` : un relevé complet (mémoire 4800/6000, câble, DVR actif, notifications coupées, plan « Utilisation normale ») et un relevé partiel (Wi-Fi « Native 802.11 », DVR coupé, notifications actives par défaut).

## À savoir avant de modifier
- Rien ici ne doit **écrire** : l'analyse est une lecture. Ce qui règle une valeur, c'est un réglage du catalogue ([[Moteur des tweaks]]).
- Les normes et les textes affichés sont dans l'interface, pas ici.
