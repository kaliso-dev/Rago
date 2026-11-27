---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/shell.rs
lignes: 94
maj: 2026-11-25
---
# shell.rs

Lancement de programmes **sans fenêtre de console**, raccourci PowerShell, et test « l'app tourne-t-elle en administrateur ». Fiche parente : [[Code de l'app (Rust)]]. Fonctionnement : [[Architecture de l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11 ; `decode_output` ajouté le 25/11, PR #139, jamais testé sur Windows). Créé le 07/10 (1.1.5).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `CREATE_NO_WINDOW = 0x0800_0000` | drapeau de `CreateProcess` (Windows seulement) |
| `hidden(program) -> Command` | `Command::new(program)` avec `CREATE_NO_WINDOW` et **entrée standard fermée** (`Stdio::null()`) : aucune fenêtre noire, et un `pause` ou une question dans un script ne bloque jamais |
| `powershell(script) -> Option<String>` | lance `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; <script>"`, garde stdout (stderr jeté), renvoie le texte nettoyé ou `None` s'il est vide ou si PowerShell ne démarre pas |
| `decode_output(bytes) -> String` | texte d'une sortie de programme : UTF-8 s'il est valide, sinon lu dans la **page de code de la console** (`oem_to_string`, `MultiByteToWideChar(CP_OEMCP)`, Windows seulement), sinon conversion avec pertes. Ajouté le 25/11 (PR #139) : `powercfg /list` écrit « Recommandé par HP » en page OEM (850), lue en UTF-8 elle donnait « RECOMMAND� PAR�HP » |
| `is_elevated() -> bool` | `OpenProcessToken` + `GetTokenInformation(TokenElevation)` ; toujours `false` hors Windows |

## Liens avec le reste
- `hidden` est utilisé partout où l'app lance un programme : [[runner.rs]] (`cmd.exe`, `powershell.exe`, `nvidiaProfileInspector.exe`, `taskkill.exe`), [[backup.rs]] (`reg.exe`, `bcdedit.exe`, `schtasks.exe`, `powercfg.exe`, `sc.exe`), [[repair.rs]], [[background.rs]] (`schtasks.exe`), [[lib.rs]] (`shutdown.exe`), [[license.rs]] (`reg.exe query`), [[tools.rs]], [[netopt.rs]], [[games.rs]], [[session.rs]], [[fps.rs]].
- `powershell` sert aux sondes : [[system.rs]], [[analysis.rs]], [[license.rs]] (UUID et numéro de série), [[tools.rs]].
- `is_elevated` : champ `is_admin` de la sonde ([[system.rs]], affiché en bas de la barre latérale), et deux tests qui ne tournent qu'en administrateur ([[catalog.rs]], [[games.rs]]).

## À savoir avant de modifier
- Les programmes Windows (`powercfg`, `reg`, `schtasks`…) écrivent dans la page de code de la console, pas en UTF-8 : passer leur sortie par `decode_output` dès qu'elle contient du texte traduit par Windows ([[tools.rs]] le fait pour les plans d'alimentation).
- La sortie de PowerShell est forcée en UTF-8 : sans ça, les accents des noms de matériel (langue de Windows) arrivent abîmés.
- `-ExecutionPolicy Bypass` ne vaut que pour cette commande ; il ne change rien sur le PC.
- L'app est toujours lancée en administrateur (`requireAdministrator` dans `app.manifest`, voir [[Configuration Tauri]]) : `is_elevated` ne devrait être faux qu'en développement.
