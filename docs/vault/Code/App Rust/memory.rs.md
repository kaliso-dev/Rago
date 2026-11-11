---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/memory.rs
lignes: 290
maj: 2026-11-11
---
# memory.rs

Bouton **« Nettoyer »** sous la jauge de RAM : vide la liste « standby » de Windows (le cache des fichiers lus récemment) et, en option, réduit la mémoire des applis en arrière-plan. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Tableau de bord]], [[Paramètres de l'app]] (option de réduction).

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 17/10 (RAG-48, décidé le 17/10/2026).

## Rôle et place dans l'ensemble
- Appelé par la commande `clean_ram(trim)` de [[lib.rs]], qui passe les dossiers d'installation des jeux de la bibliothèque (`library.install_dirs()`, [[games.rs]]), et par la commande `clean_ram` du pont [[Rago OS]] (sans réduction).
- Aucune appli n'est fermée et aucune donnée n'est perdue : le cache se reconstruit tout seul.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct Cleaned {standby, trimmed, apps}` | cache vidé (octets), mémoire rendue par les applis réduites (octets), nombre d'applis réduites |
| `clean(trim, keep) -> Result<Cleaned, String>` | réduit d'abord si `trim` (les pages rendues passent par la liste standby), puis vide la liste standby. Hors Windows : `Err("Windows only")` |
| `PROTECTED` | processus jamais réduits (en minuscules) ; `pub(crate)` depuis la PR #91 (11/11, pas encore dans `staging`) : [[tips.rs]] ne signale jamais ces processus comme gourmands |

## Fonctionnement détaillé

### Vider la liste standby (`purge_standby`)
1. Active le privilège `SeProfileSingleProcessPrivilege` du jeton de l'app (administrateur : elle l'a, désactivé par défaut). `AdjustTokenPrivileges` réussit même sans le privilège : `GetLastError` doit valoir 0. Échec → erreur `"privilege"`.
2. Compte les pages standby avant : `NtQuerySystemInformation` classe **80** (`SystemMemoryListInformation`), somme des 8 priorités de `standby_by_priority`.
3. `NtSetSystemInformation(80, MemoryPurgeStandbyList = 4)`. Les deux fonctions de `ntdll.dll` sont chargées à l'exécution (`GetProcAddress`) : elles ne sont pas dans `windows-sys`. Statut négatif → `NTSTATUS 0x…`.
4. Résultat = (pages avant − pages après) × 4096 octets.

### Réduire les applis en arrière-plan (`trim_background`, option)
Parcourt les processus (`CreateToolhelp32Snapshot`) et **saute** : PID ≤ 4, l'app elle-même, le processus de la fenêtre au premier plan, les noms de `PROTECTED`, les processus d'une autre session Windows. Pour les autres : lit le chemin de l'exe avec le droit le plus faible (`PROCESS_QUERY_LIMITED_INFORMATION`) ; saute ceux sous un dossier de jeu de la bibliothèque (`keep`) ou sous `%SystemRoot%`. Puis rouvre avec `PROCESS_SET_QUOTA | PROCESS_VM_READ`, vérifie que c'est le même exe (un PID peut être réutilisé), mesure le working set, `K32EmptyWorkingSet`, mesure à nouveau.

`PROTECTED` contient : les processus de Windows (`system`, `csrss.exe`, `lsass.exe`, `svchost.exe`, `dwm.exe`, `explorer.exe`, `audiodg.exe`, Defender `msmpeng.exe`…), les **anti-cheat** (ouvrir leur processus peut les alerter : Vanguard `vgc.exe`, EasyAntiCheat, BattlEye, FACEIT, EA AntiCheat, ESportal, GameGuard, XIGNCODE, nProtect) et des jeux courants même hors bibliothèque (`javaw.exe`, `java.exe`, Minecraft, Valorant, League of Legends, CS2, Fortnite, Apex, Overwatch, Rainbow Six, Call of Duty, Roblox, Rocket League, Dota 2, Elden Ring, GTA V, Deadlock, Marvel Rivals).

## Erreurs et cas limites
- La jauge « RAM utilisée » bouge à peine : Windows compte déjà ce cache comme disponible. L'interface annonce donc le **cache vidé**, jamais de la « RAM libérée » (honnêteté voulue, voir [[Voix et ton]]).
- Seulement au clic : un nettoyage automatique en boucle ralentirait le PC (Windows relirait sans cesse les mêmes fichiers).
- L'option de réduction est **désactivée par défaut** (Paramètres).

## Tests
`protected_names_are_lowercase` (et `javaw.exe`, `vgc.exe` présents).

## À savoir avant de modifier
- Ne jamais ouvrir un processus de jeu ou d'anti-cheat avec plus que `PROCESS_QUERY_LIMITED_INFORMATION` : ajouter le nom à `PROTECTED` plutôt.
- La décision de Sofiene (RAG-48, 17/10) : bouton manuel et honnête ; voir [[Décisions]] et [[Linear]].
