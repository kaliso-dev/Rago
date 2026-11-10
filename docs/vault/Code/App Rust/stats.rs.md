---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/stats.rs
lignes: 326
maj: 2026-11-10
---
# stats.rs

Usage du PC **en direct** pour le tableau de bord : mémoire vive, processeur et carte graphique, en %. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Tableau de bord]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 09/10 (1.1.8).

## Rôle et place dans l'ensemble
- [[lib.rs]] garde un `stats::Sampler` dans `AppState` ; la commande `live_stats` (appelée **chaque seconde** par le tableau de bord) et la commande `stats` du pont [[Rago OS]] renvoient `Sampler::latest()`.
- Le bouton « Nettoyer » sous la jauge de RAM est dans [[memory.rs]] ; le bouton vers le Gestionnaire des tâches est `open_task_manager` ([[lib.rs]]).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct LiveStats {ready, ram, cpu, gpu, ram_used, ram_total}` | JSON camelCase. `ready` faux jusqu'à la première mesure ; pourcentages 0 à 100 en `f32` ; `None` quand la mesure n'existe pas sur ce PC (**jamais un faux 0 %**) ; `ram_used`, `ram_total` en octets |
| `struct Sampler` (Default) | état partagé `Arc<Mutex<Shared {latest, last_poll, running}>>` |
| `Sampler::latest()` | note l'heure de la demande, relance le fil s'il était arrêté, renvoie la dernière mesure |

## Fonctionnement détaillé
- Fil nommé **`rago-stats`**, lancé à la demande : il dort `PERIOD` = **1 s**, mesure, et s'arrête tout seul si aucune demande n'est venue depuis `IDLE` = **5 s** (fenêtre réduite, autre page) : rien ne tourne quand personne ne regarde. En s'arrêtant, il remet la mesure à zéro pour que la demande suivante reparte d'une mesure neuve. S'il ne peut pas être lancé, `latest` renvoie `ready: true` et tout à `None`.
- **RAM** : `sysinfo` : utilisée = totale − disponible.
- **Processeur** (Windows) : compteur PDH anglais `\Processor Information(_Total)\% Processor Time`, repli `\Processor(_Total)\% Processor Time`. Hors Windows : `sysinfo`.
- **Carte graphique** (Windows) : compteur à instances `\GPU Engine(*)\Utilization Percentage`. `busiest_engine` regroupe les instances `pid_1234_luid_0x…_phys_0_eng_3_engtype_3D` par moteur (tout ce qui suit `luid_`), additionne les processus de chaque moteur, et garde le **moteur le plus occupé**, comme le Gestionnaire des tâches. Hors Windows : `None`.
- Module `pdh` : une requête PDH par compteur (`PdhOpenQueryW`, `PdhAddEnglishCounterW` : noms anglais indépendants de la langue de Windows), un premier relevé à l'ouverture (un pourcentage se calcule entre deux relevés), `PdhGetFormattedCounterValue` ou `PdhGetFormattedCounterArrayW` (3 essais si la liste des instances grandit entre la demande de taille et la lecture), statut `VALID_DATA` ou `NEW_DATA` exigé. Un compteur absent (carte sans pilote WDDM 2, compteurs désactivés) ne bloque pas les autres.
- `pct(v)` : borne entre 0 et 100 ; une valeur non finie donne `None`.

## Tests
`gpu_load_is_the_busiest_engine_summed_over_processes`, `percentages_are_clamped_and_never_invented`, `sampler_measures_ram_and_cpu`, `gpu_counter_reads_when_windows_has_it` (Windows).

## À savoir avant de modifier
- Garder l'arrêt automatique du fil : l'app tourne souvent en arrière-plan ([[Arrière-plan et démarrage]]) et ne doit rien mesurer pour rien.
- La [[Barre en jeu]] a ses propres mesures (FPS, ping) dans [[overlay.rs]] et [[fps.rs]], pas ici.
