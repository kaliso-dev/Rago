---
type: code
tags: [code, app, typescript, react, overlay]
fichier: app/src/overlay/Overlay.tsx
lignes: 344
maj: 2026-11-27
---
# Overlay.tsx

L'interface de la **barre en jeu** : la pastille FPS/ping gardée à l'écran, et la barre ouverte par le raccourci (mesures, bouton « Nettoyer » la RAM, vérifications de la partie, réglages applicables en pleine partie). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Barre en jeu]]. Côté Rust : [[overlay.rs]], [[fps.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #132, 24/11). Ticket d'origine : RAG-82.

## Rôle et place dans l'ensemble
- Rendu par [[main.tsx (barre en jeu)]] dans la fenêtre Tauri « overlay » (page `overlay.html`), **sans store** : la langue (`rago.lang`) et l'option de nettoyage (`rago.cleanTrim`) sont lues directement dans `localStorage`, partagé avec la fenêtre principale (même origine).
- Le moteur ([[overlay.rs]]) montre, cache et place la fenêtre ; il prévient l'interface par l'événement `overlay:mode`.
- Les lots lancés d'ici passent par le même moteur que l'app ([[runner.rs]]) ; la fenêtre principale ignore leurs événements tant qu'un lot terminé y est encore affiché ([[store.tsx]]).

## Ce que le fichier expose
- `LIVE_TWEAKS` : les réglages proposés dans la barre, par groupe. Ce sont des réglages **qui s'appliquent en pleine partie** : sans redémarrage, sans couper la carte réseau ni relancer l'Explorateur, sans point de restauration conseillé. Le mode jeu, Hitreg, OptiFine et RBW Mod restent dans l'app.

| Groupe (clé) | Libellé | Ids |
|---|---|---|
| `overlay.group.cpu` | Processeur | `cpu_parking`, `cpu_cstates_cfg`, `cpu_cstates_off`, `cpu_device_idle`, `cpu_pstates`, `cpu_boost_epp`, `cpu_throttle`, `cpu_turbo`, `cpu_cooling`, `cpu_ac`, `cpu_away` |
| `overlay.group.power` | Alimentation | `pow_plan`, `pow_hwp`, `pow_devices` |
| `overlay.group.memory` | Mémoire | `mem_compression`, `mem_combining` |
| `overlay.group.system` | Réseau, Windows et carte graphique | `net_dca`, `win_visual`, `win_transparency`, `win_autoplay`, `nv_profile` |

  Un réglage n'est affiché que s'il existe dans le catalogue, est de type `tweak`, **sans variantes**, et disponible sur ce PC (`availability`, [[catalog.ts]]). Un groupe vide disparaît.
- `Overlay()` : le composant.

## Fonctionnement détaillé

### Chargement et événements
- `refresh()` : `overlayInfo()` (mode, jeu, raccourci, épingle, `fpsAvailable`, `passive`), `applied()` et `licenseStatus()` en parallèle ; Premium = licence `active`. Le mode initial vient de `overlayInfo` tant que l'état local est `hidden`.
- `systemInfo()` une fois (pour la disponibilité des réglages).
- `overlay:mode` : change le mode, efface les messages ; si la barre devient visible, `refresh()`.
- `run:done` : fin du chargement du réglage en cours et relecture des réglages appliqués.
- Événement `storage` du navigateur sur `rago.lang` : la barre change de langue en même temps que l'app.

### Mesures
- Tant que la barre ou la pastille est visible : `overlayLive()` (FPS, ping) **chaque seconde** ; en mode barre ouverte, aussi `liveStats()` (CPU, GPU, RAM). Rien n'est mesuré quand c'est caché.
- Valeurs arrondies ; absente → `—`. Ping précédé de `≈` quand `pingEstimate` (le serveur ne répond pas au ping : mesuré jusqu'au dernier routeur avant lui, « à 1 ou 2 ms près »).

### Mode `pill` (pastille)
Logo rond (`rago-cap.svg`) + FPS + ping, rien d'autre (`aria-live="off"`, `.igpill`). La pastille ne prend ni le focus ni les clics ([[overlay.rs]]).

### Mode `panel` (barre ouverte)
1. **En-tête** : logo (`rago-app-dark-64.svg`), « Barre en jeu », nom du jeu (sinon « Jeu »), trois boutons : épingler (garder FPS et ping à l'écran, `overlaySetPin`), « Ouvrir Rago Optimizer » (`overlayOpenApp()`), « Revenir au jeu » (`overlayClose()`).
2. **Tuiles** : FPS (infobulle « Mesure des FPS indisponible dans cette version » si PresentMon n'est pas livré), Ping (infobulle « Aucun serveur de jeu repéré pour l'instant… » si pas de ping, ou l'explication du `≈`), CPU, GPU, RAM en %.
3. Bouton **Nettoyer** : `cleanRam(readTrim())` ; pendant le nettoyage, icône qui tourne et « Nettoyage… » ; puis, sous les mesures, « {n} Go de cache vidés » si au moins **50 Mo** de cache vidé, sinon « Cache déjà vide » (icône coche verte, `--ok`), ou l'échec « Nettoyage impossible, réessaie » en rouge, texte et icône alerte au jeton `--red` de la [[Charte graphique]] (classes `ignote bad igcf`, règle dans `s5/overlay.css` ; décision de Sofiene du 27/11, q116) (clés `live.*`).
4. **Pendant la partie** : `SessionChecks` de [[SessionCard.tsx]] (mode d'alimentation, conseils), si une session est en cours (`useSession`).
5. **Réglages en pleine partie** : une ligne par réglage (bouton `role="switch"`, nom et interrupteur) ; en gratuit, liste grisée (`locked`, lignes désactivées) et badge « Premium » qui ferme la barre et ouvre l'offre dans l'app (`overlayOpenApp("premium")`, reçu comme `app:goto` → offre `plan`). Pendant qu'un réglage change : icône qui tourne sur sa ligne, les autres interrupteurs grisés.
   - Clic : rien si pas Premium ou si un réglage est déjà en cours ; sinon `isRunning()` (déjà un lot → erreur), puis `runTweaks` d'**un seul** élément : annulation (`undo: true` avec la variante appliquée) s'il est appliqué, sinon application.
   - Erreurs affichées en rouge sous les deux colonnes (classe `ignote bad` de la maquette : texte `#FF6B61`, icône `--red`) : « Une optimisation est déjà en cours dans l'app. » ; refus `premium…` → texte `err.premium_scripts_unavailable` ; autre → « Le réglage n'a pas pu être changé. Ouvre l'app pour voir le détail. »
6. **Pied** : « Alt+X ou Échap pour revenir au jeu » (raccourci réel des préférences, `Alt+X` par défaut ; le raccourci et Échap sont dessinés en touches `<kbd>` par `Keys`) ; en mode `passive` (barre ouverte sans prendre le premier plan au jeu, Minecraft) : « Alt+X, Échap ou ✕ ferment la barre » ; puis « Ping du serveur où tu joues (Minecraft : mesuré comme dans le jeu) ».
- **Échap** ou clic hors de la barre (dans la marge transparente de la fenêtre, `.ovw`) : `overlayClose()`.
- Animation d'ouverture : fondu, glissement de 10 px et échelle 0,98 → 1 en 0,22 s.

### Conseils au lancement du jeu (PR #91, 11/11)
- **Rappel** : quand le moteur le demande (`nudge` de `overlayInfo`, puis l'événement `overlay:nudge`, [[overlay.rs]]), la pastille élargie montre le logo, une ampoule, le texte « {n} conseils pour {jeu} » (n = réglages pas faits + points à vérifier) ou « {n} points à vérifier », un séparateur et « Alt+X pour voir » (raccourci réel des préférences), avec `aria-live="polite"`. Nom du jeu : [[tips.ts]] `tipsFor`.
- **Barre ouverte** : `SessionChecks` et le bloc [[GameTips.tsx]] (3 réglages, ouvert s'il en reste à faire) sont dans la colonne « This game » de gauche, qui défile à part (fondu en bas). Affichée quand une partie est en cours ou qu'un jeu à conseils est connu (`session.game`).
- Commandes et événements en plus : `tips_done`, `tips_mark`, `tips:done` (par [[GameTips.tsx]]), `overlay:nudge`. Démo : `overlay.html?pill&nudge` (`&game=cs2` pour un autre jeu). Fonctionnalité : [[Conseils au lancement du jeu]].

## Données touchées
- Lit `localStorage` `rago.lang` et `rago.cleanTrim` (écrits par la fenêtre principale).
- Commandes : `overlay_info`, `overlay_live`, `overlay_close`, `overlay_set_pin`, `overlay_open_app`, `get_applied`, `license_status`, `get_system_info`, `live_stats`, `clean_ram`, `is_running`, `run_tweaks`, `session_state`.
- Événements : `overlay:mode`, `run:done`, `games:session` (par `useSession`).

## Erreurs et cas limites
- Démo navigateur : ouvrir `overlay.html` (avec `?pill`, `?passive`, `?estimate`) ; la session y est toujours « en cours », sur VALORANT (`&game=cs2` pour un autre jeu, voir [[api.ts]]).
- Un réglage appliqué depuis la barre reste appliqué après la partie : on le retire dans l'app ou dans la barre.

## Maquette v5 (PR #132, 24/11, jamais testée sur Windows)
Refaite sur les maquettes `app-ingame.html` (barre ouverte) et `app-ingame-states.html` (pastille, rappel, gratuit, réglage qui change, nettoyage, infobulles) : même HTML (classes `ig*`), même CSS (`s5/pages/ingame.css`, [[Maquettes v5 dans l'app (s5)]]). À 100 %, la barre fait **780 × 600** et la pastille **236 × 44**, comme la maquette.
- La fenêtre est plus grande que la barre (836 × 656, [[overlay.rs]]) : 28 points de chaque côté et 56 dessous pour l'ombre de la maquette ; un clic dans cette marge ramène au jeu.
- Icônes : `I` de `s5/I.tsx` (imprimées : pinoff, appwin, brush, bulb, zap, gauge, alert, lock, check ; au trait : x, chev, loader), filtres posés par `IconDefs` ([[main.tsx (barre en jeu)]]).
- Corps `.igb` : avec une partie (`advice`), deux colonnes, « This game » à gauche (296 px) et les réglages en direct à droite ; sinon une seule colonne (`.igb.one`), les groupes de réglages sur deux colonnes (`.igl.cols2`). Les deux listes défilent sans barre (`.igsc`).
- Infobulles des mesures : `title` natif (dessinée par Windows, comme dans la maquette).
- Pastille de rappel (`.igpill.nd`) : largeur au texte, dans une fenêtre de 440 × 44.

## Liens avec le reste
- Composants réutilisés : `SessionChecks` et `useSession` ([[SessionCard.tsx]]), [[GameTips.tsx]], `I` (icônes de la maquette, [[Maquettes v5 dans l'app (s5)]]).
- Réglages de la barre (activer, raccourci, épingle) : [[BackgroundCard.tsx]] dans [[Settings.tsx]].
- Styles : `s5/pages/ingame.css` (repris de la maquette) et `s5/overlay.css` (ce que la fenêtre change), voir [[Maquettes v5 dans l'app (s5)]].

## À savoir avant de modifier
- La langue par défaut de la barre est le **français** (`readLang` renvoie `fr` quand `rago.lang` est absent), alors que l'app démarre en **anglais** (défaut `en` de [[store.tsx]]). Sans effet visible : le store écrit `rago.lang` dès la première ouverture de l'app, et les deux fenêtres partagent le même `localStorage`. À aligner sur `en` si on retouche ce fichier.
- Ajouter un réglage à `LIVE_TWEAKS` : vérifier qu'il ne demande pas de redémarrage, ne coupe pas la carte réseau, n'a pas de variantes et n'a pas `restore: true`.
