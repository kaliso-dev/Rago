---
type: code
tags: [code, app, rust, jeux, conseils]
fichier: app/src-tauri/src/tips.rs
lignes: 416
maj: 2026-11-11
---
# tips.rs

Le moteur des **[[Conseils au lancement du jeu]]** : quel jeu à conseils tourne, quels réglages en jeu le joueur a cochés « fait », et ce que le PC montre pendant la partie (applis gourmandes, mémoire presque pleine, écran sous sa meilleure fréquence, Game DVR). Il ne change rien et ne ferme rien. Fiche parente : [[Code de l'app (Rust)]].

**Fichier ajouté le 11/11 par la PR #91 (brouillon, pas encore dans `staging`), jamais testé sur Windows.** Tout ce qui suit est CONFIRMÉ (code de la branche `claude/project-thread-g3od2h`, 11/11).

## Rôle et place dans l'ensemble
- [[session.rs]] l'appelle à chaque tour de 4 s : `game_of` (jeu de la partie), `Done` (réglages cochés, garde `tips-done.json`), `pc_checks` (écran et Game DVR, toutes les minutes).
- `Hogs` vit dans la **boucle des jeux** de [[lib.rs]] et non dans `Session` : les compteurs de Windows (PDH) ne peuvent pas changer de fil. La boucle passe ce qu'il trouve à `Session::tick` (paramètre `hogs`).
- La liste des réglages vient de `app/src/data/tips.json` ([[tips.json]]), incluse dans l'exe (`include_str!`) ; l'interface lit le même fichier pour les textes ([[tips.ts]]). Ici, seuls les identifiants comptent.

## Ce que le fichier expose
- `game_of(exes) -> Option<&'static str>` : la clé du jeu (`valorant`, `fortnite`…) d'après les **exes des jeux en cours** (pas tous les processus) : la clé de `games::preset_key` ([[games.rs]]) du premier exe qui a des conseils. Un exe dont le nom contient `launcher` ou commence par `leagueclient` passe après les autres (tri stable) : le client de League of Legends resté ouvert ne cache pas une partie de VALORANT.
- `Done` : `new(data_dir)` (lit `tips-done.json`), `list()`, `set(id, done)` (renvoie la liste ; un identifiant inconnu n'est jamais ajouté ; écrit le fichier, ou le supprime quand la liste est vide), `left(jeu)` (réglages du jeu pas cochés ; 0 pour un jeu inconnu).
- `pc_checks()` : `refresh` et `gamedvr` (voir plus bas).
- `refresh_check(actuelle, max)` : `Check { id: "refresh", apps: [actuelle, max] }` si `max >= actuelle + 5` (59 contre 60 Hz n'est pas un écart).
- `pretty(exe)` : nom affiché : `chrome.exe` → Google Chrome, `msedge.exe` → Microsoft Edge, Firefox, Opera, Brave, Discord, Spotify, `steamwebhelper.exe` et `steam.exe` → Steam, Epic Games Launcher, `tiworker.exe` et `mousocoreworker.exe` → Windows Update, `searchindexer.exe` → Windows Search ; sinon le nom de l'exe sans `.exe`.
- `Sample { apps: nom d'exe → (part du processeur en %, mémoire en octets), ram: mémoire du PC occupée en % }`.
- `exe_of_instance(instance, skip)` : nom d'exe d'une instance du compteur `\Process(*)` (« chrome#3 » → `chrome.exe`) ; `None` pour `_Total`, les processus jamais signalés et les exes du jeu (`skip`).
- `Hogs` : `reset()` (fin de partie : tout repart de zéro, compteurs fermés), `tick(exes du jeu)` (mesure puis jugement), `judge(&Sample)` (testable hors Windows).

## Fonctionnement détaillé

### Seuils (constantes)
| Constante | Valeur | Sens |
|---|---|---|
| `CPU_HIGH` | 10,0 % | part de **tout** le processeur à partir de laquelle une appli est gourmande |
| `RAM_HIGH` / `RAM_OK` | 85 % / 80 % | mémoire occupée qui allume le signal / qui l'éteint |
| `RAM_APP` | 500 Mio | une appli nommée pour la mémoire en prend au moins autant |
| `STRIKES_ON` / `STRIKES_OFF` | 2 / 3 tours | tours de suite (4 s chacun) au-dessus avant de signaler, en dessous avant de ne plus signaler |

### Mesure (`measure`, Windows)
- Deux compteurs PDH ouverts à la première partie : `\Process(*)\% Processor Time` lu **sans plafond à 100 %** (`values_uncapped` de [[stats.rs]] : 100 % par cœur) puis divisé par le nombre de cœurs logiques, et `\Process(*)\Working Set - Private` (mémoire privée). Les instances d'un même exe (« chrome », « chrome#1 »…) sont additionnées.
- **Aucun processus n'est ouvert** (pas de `OpenProcess`, contrairement au rafraîchissement des processus de `sysinfo`, qui demande `PROCESS_VM_READ`) : rien que l'anti-triche du jeu puisse voir. `sysinfo` ne sert qu'à la mémoire totale du PC.
- Hors Windows : seule la mémoire du PC est lue (les tests passent par `judge`).

### Jugement (`judge`)
- **Processeur** : chaque exe au-dessus de `CPU_HIGH` deux tours de suite est signalé ; il le reste jusqu'au troisième tour de suite en dessous. Les deux plus gourmands (triés par part, puis par nom) donnent `Check { id: "cpu", apps }` avec leur nom (`pretty`, sans doublon).
- **Mémoire** : au moins `RAM_HIGH` deux tours de suite allume le signal ; sous `RAM_OK` il s'éteint ; entre les deux, il reste comme il est. Signal allumé : `Check { id: "ram", apps }` avec les deux applis d'au moins 500 Mio qui en prennent le plus (liste vide possible : l'interface dit alors seulement que la mémoire est presque pleine).
- **Jamais signalés** (`ignored`) : la liste `PROTECTED` de [[memory.rs]] (Windows, l'Explorateur, l'antivirus Defender, les anti-triche, les jeux connus), `system idle process`, `idle`, `memory compression`, `interrupts`, `msedgewebview2.exe` (fenêtres de Rago), tout ce qui commence par `presentmon` ou `rago`, et les exes du jeu en cours.

### Écran et Game DVR (`pc_checks`)
- `refresh` : fréquence actuelle et la plus haute de l'écran principal à la même définition (`analysis::refresh`, [[analysis.rs]]).
- `gamedvr` (module `win`) : actif sauf si `HKCU\System\GameConfigStore` `GameDVR_Enabled` = 0 ou `HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR` `AppCaptureEnabled` = 0 (valeur absente = actif, comme l'[[Analyse du PC]]). Hors Windows : jamais.

## Données touchées
- `<data>\tips-done.json` : tableau JSON trié des identifiants cochés (ex. `["valorant.highlight"]`).
- Lecture seule : compteurs de performance de Windows, deux valeurs du registre (`HKCU`), mode d'affichage de l'écran.

## Erreurs et cas limites
- Compteur PDH impossible à ouvrir (compteurs désactivés) : aucune appli n'est signalée, la mémoire du PC reste mesurée.
- Fichier `tips-done.json` illisible : liste vide. Écriture ratée : ignorée (la case reste cochée jusqu'à la fermeture de l'app).
- `tips.json` invalide : l'app s'arrête au premier usage (`expect`) ; le test `every_tip_belongs_to_a_known_game` le voit avant.
- Verrou empoisonné repris (`PoisonError::into_inner`).

## Liens avec le reste
- Appelé par [[session.rs]] et [[lib.rs]] ; utilise [[games.rs]] (`preset_key`), [[analysis.rs]] (`refresh`), [[memory.rs]] (`PROTECTED`), [[stats.rs]] (compteurs PDH), [[reg.rs]] (Game DVR), `session::file_of` et `session::Check`.
- Fonctionnalité : [[Conseils au lancement du jeu]] ; affichage : [[SessionCard.tsx]], [[GameTips.tsx]], [[Overlay.tsx]].

## Tests
- `every_tip_belongs_to_a_known_game` : chaque jeu de `tips.json` a des réglages, un exe connu ([[games.rs]]) et des identifiants préfixés par sa clé ; aucun identifiant en double.
- `finds_the_game_from_its_exe` : exe de VALORANT et de Fortnite reconnus ; Roblox (connu, sans conseils) et liste vide → rien ; client de League of Legends + VALORANT → VALORANT dans les deux ordres ; client + partie de League of Legends, ou client seul → LoL.
- `keeps_done_tips_and_counts_the_rest` : cocher, identifiant inconnu ignoré, relu depuis le disque, fichier supprimé quand tout est décoché.
- `flags_the_screen_below_its_best_refresh_rate` : 60 sur 144 Hz → signalé ; 144/144 et 59/60 → rien.
- `flags_busy_apps_only_after_two_rounds_and_keeps_them_steady` : Chrome à 14 % signalé au 2e tour ; sous le seuil, encore signalé deux tours, retiré au 3e.
- `names_the_biggest_apps_when_memory_is_almost_full` : 91 % → Chrome et Discord au 2e tour (pas l'appli de 50 Mo) ; 82 % → toujours signalé ; 75 % → plus rien.
- `reads_windows_counter_instances` : `chrome#3`, `Discord`, `Streamlabs OBS` lus ; `_Total`, `Idle`, `System`, `dwm`, `vgc`, l'exe du jeu, `Rago Optimizer`, `msedgewebview2#2` et vide écartés.
- `never_flags_windows_or_rago` : `dwm.exe`, `vgc.exe`, PresentMon et Rago écartés, Chrome non ; `pretty`.

## À savoir avant de modifier
- Ne jamais ouvrir un processus pour le mesurer (anti-triche) : rester sur les compteurs de Windows.
- Ajouter un jeu : ses réglages dans [[tips.json]] avec des identifiants `<clé>.<réglage>`, la clé devant exister dans `PRESET_EXES` de [[games.rs]] (le test le vérifie).
- Ne jamais changer l'identifiant d'un réglage existant : les cases cochées des joueurs seraient perdues (l'ancien identifiant est ignoré).
