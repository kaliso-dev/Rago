# proxy/ : Rago Route (tunnel anti-lag, en test)

Lire d'abord `CLAUDE.md` à la racine et `docs/vault/Technique/Reprendre le développement.md`.

- Fonctionnement, serveurs et protocole : `docs/vault/Technique/Infrastructure Rago Route.md` ; historique et mesures : `docs/vault/Fonctionnalités/Proxy.md`.
- `install.sh` est **généré** : après un changement de `rago-route.py` ou `mcping.py`, lancer `python3 proxy/fabriquer-install.py`. Sofiene le relance lui-même sur les VPS.
- Le client Windows est dans `app/src-tauri/src/route.rs` : une nouvelle sortie ou un relais se déclare aux deux endroits (`EXITS`/`RELAYS` et `SORTIES_RAGO`).
- Rago Route est réservé au Premium ; depuis la 1.3.0 (PR #76) l'onglet est dans tous les exe (badge « Beta »), seul « Copier un jeton pour le Mac » reste dans l'exe de test. Une fiche par fichier : `docs/vault/Code/Rago Route/Code de Rago Route.md`. Mettre à jour le vault à la fin de la tâche.
