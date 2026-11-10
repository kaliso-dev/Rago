# proxy/ : Rago Route (tunnel anti-lag, en test)

Lire d'abord `CLAUDE.md` à la racine et `docs/vault/Technique/Reprendre le développement.md`.

- Fonctionnement, serveurs et protocole : `docs/vault/Technique/Infrastructure Rago Route.md` ; historique et mesures : `docs/vault/Fonctionnalités/Proxy.md`.
- `install.sh` est **généré** : après un changement de `rago-route.py` ou `mcping.py`, lancer `python3 proxy/fabriquer-install.py`. Sofiene le relance lui-même sur les VPS.
- Le client Windows est dans `app/src-tauri/src/route.rs` : une nouvelle sortie ou un relais se déclare aux deux endroits (`EXITS`/`RELAYS` et `SORTIES_RAGO`).
- Rago Route ne marche que dans l'exe de test et pour le Premium. Mettre à jour le vault à la fin de la tâche.
