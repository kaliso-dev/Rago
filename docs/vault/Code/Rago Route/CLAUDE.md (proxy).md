---
type: code
tags: [code, rago-route, consignes]
fichier: proxy/CLAUDE.md
lignes: 8
maj: 2026-11-10
---
# CLAUDE.md (proxy)

Consignes courtes pour un Claude qui travaille dans le dossier `proxy/` (Rago Route côté serveurs). Fiche parente : [[Code de Rago Route]]. Voir aussi [[Reprendre le développement]] et [[Infrastructure Rago Route]].

Contenu CONFIRMÉ (fichier de `staging`, 10/11) :

- Lire d'abord le `CLAUDE.md` racine et [[Reprendre le développement]].
- Fonctionnement, serveurs et protocole : [[Infrastructure Rago Route]] ; historique et mesures : [[Proxy]].
- `install.sh` est **généré** : après un changement de `rago-route.py` ou `mcping.py`, lancer `python3 proxy/fabriquer-install.py` (voir [[fabriquer-install.py]] et [[install.sh]]). Sofiene le relance lui-même sur les VPS.
- Le client Windows est dans `app/src-tauri/src/route.rs` : une nouvelle sortie ou un relais se déclare **aux deux endroits** (`EXITS`/`RELAYS` dans [[route.rs]] et `SORTIES_RAGO` dans [[rago-route.py]]).
- « Rago Route ne marche que dans l'exe de test et pour le Premium. »
- Mettre à jour le vault à la fin de la tâche.

## Écart avec le code

- La phrase « ne marche que dans l'exe de test » est **en retard** : depuis la [[Version 1.3.0]], Rago Route est dans tous les exe (aucune condition `staging` dans [[route.rs]] ni dans les commandes de [[lib.rs]] ; le pont répond `available: true`). Il reste réservé au Premium (jeton signé). Seul le bouton « copier le jeton » pour le Mac est réservé à l'exe de test ([[RouteTab.tsx]]). Le fichier n'a pas été corrigé ici (consigne : pas de modification hors du vault) ; signalé dans le rapport.
