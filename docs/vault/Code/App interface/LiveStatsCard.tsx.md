---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/LiveStatsCard.tsx
lignes: 163
maj: 2026-11-10
---
# LiveStatsCard.tsx

La carte **« Utilisation en direct »** du tableau de bord : RAM, carte graphique et processeur mesurés par Windows chaque seconde, avec le bouton « Nettoyer » la RAM et un lien vers le Gestionnaire des tâches. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Tableau de bord]]. Côté Rust : [[stats.rs]], [[memory.rs]] (RAG-48).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé

### Mesure (`useLiveStats`, interne)
- **Une demande par seconde** (`PERIOD = 1000`), **jamais deux à la fois** (drapeau `busy`), et **aucune quand la fenêtre est cachée** (`document.hidden`) ; la mesure repart dès que la fenêtre redevient visible (`visibilitychange`).
- La seconde suivante est programmée seulement après la réponse (pas d'empilement si le moteur est lent).
- Erreur → toutes les valeurs « indisponibles ».

### Jauges (`Meter`, interne)
- Trois jauges (`role="meter"`, 0 à 100) : « Mémoire vive (RAM) » (détail « {utilisé} sur {total} Go »), « Carte graphique (GPU) » (« Moteur le plus chargé »), « Processeur (CPU) » (« Tous les cœurs »).
- Valeur arrondie en % (espace insécable avant `%` en français) ; « … » avant la première mesure (le moteur répond `ready: false` la première seconde) ; « Indisponible » + « Windows ne fournit pas cette mesure sur ce PC » quand la valeur est `null` (ex. pas de compteur GPU).

### Nettoyer la RAM
- Bouton « Nettoyer » sur la ligne RAM → `api.cleanRam(cleanTrim)` ; `cleanTrim` vient des paramètres (« Nettoyer » réduit aussi les applis en arrière-plan, [[Settings.tsx]]).
- Résultat affiché en vert à côté de la RAM pendant **60 s** : « {n} Go de cache vidés » (si au moins **50 Mo**) ou « Cache déjà vide », plus « {gb} Go rendus par {n} applis » si des applis ont été réduites ; en cas d'échec « Nettoyage impossible, réessaie » (en rouge).
- Note sous la carte : « Mesuré par Windows chaque seconde. « Nettoyer » vide la mémoire que Windows garde en cache, sans fermer tes applis… »

### En-tête
Titre avec un point vert animé une fois la première mesure reçue ; bouton « Gestionnaire des tâches » → `api.openTaskManager()`.

## Liens avec le reste
- Monté par [[Dashboard.tsx]] ; même bouton « Nettoyer » dans la barre en jeu ([[Overlay.tsx]]).
- [[api.ts]] (`liveStats`, `cleanRam`, `openTaskManager`) ; `Card`, `Button` ([[Petits composants de l'interface]]).
- Styles : « Nettoyer la RAM (RAG-48) » de `features.css` et « dashboard » de `app.css` ([[Styles de l'app (CSS)]]).
