---
type: code
tags: [code, app, typescript, react]
fichier: app/src/pages/Dashboard.tsx
maj: 2026-11-23
---
# Dashboard.tsx

La page **Tableau de bord**, ouverte au lancement, reprise le 23/11 de la maquette v5 `app-dashboard-v2-pi.html` (styles `s5/pages/pg-dash.css`). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Tableau de bord]], [[Presets]]. Voir [[Maquettes v5 dans l'app (s5)]].

## De haut en bas
1. **Titre et score** : « dashboard // N tweaks », grand titre, bloc rouge au bord déchiré « 21 ON / of 212 » (interrupteurs appliqués sur ce PC, jumeaux comptés une fois) avec sa barre de 24 segments.
2. **Free tweaks** (pastille « free plan » sans Premium) : tweaks gratuits du module Windows encore à appliquer (« 18 left to apply »), barre de 30 segments (déjà allumés), bouton « Apply 18 free tweaks » (confirmation puis application), « 12 of 30 already on ». Plan gratuit : pas plus que les emplacements libres.
3. **Analyze my PC** : dernière [[Analyse du PC]] (« Last run 2 days ago »), points au-dessus de la normale sur le nombre mesuré, barre, répartition « free fix / premium / by you », boutons « See results » et « Run again » (l'analyse repart seule à l'ouverture de la page). Jamais lancée : « Not run yet » et un bouton pour la lancer.
4. Tweaks retirés du catalogue encore appliqués : bandeau avec « Put back as before » (absent de la maquette, gardé).
5. **Your PC** (« live ») : processeur, carte graphique, mémoire (bouton « Clean »), réseau ; nom court du modèle, valeur en direct et barre de 20 segments, en rouge au-dessus de 60 %. Le réseau affiche le ping vers Internet en ms (nouveau champ `ping` de `live_stats`, écho ICMP vers 1.1.1.1 toutes les 3 s, `stats.rs`). Ligne d'état : Windows, Admin, Profile Inspector (cartes NVIDIA), point de restauration (date, ou « Create »), « Undo all ».
6. **Games** : les 5 jeux du PC joués en dernier (celui qui tourne coché), puis « +N all games » vers la [[Bibliothèque de jeux]].
7. **Presets** : « ready-made » (les 5 presets généraux, du plus grand au plus petit, bouton « Select » ; sans Premium, l'offre) et « mine » (« Mes presets » : clic pour les sélectionner, réglages pour les modifier dans [[PresetEditor.tsx]], « Save my setup » pour enregistrer les réglages allumés).

Les presets par jeu ne sont plus sur le tableau de bord (maquette v2) : ils se choisiront sur la page Jeux, une cover verticale par jeu (demande de Sofiene du 23/11, maquette à faire).
