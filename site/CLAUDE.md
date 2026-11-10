# site/ : le site rago-optimizer.com (Netlify)

Lire d'abord `CLAUDE.md` à la racine et `docs/vault/Technique/Reprendre le développement.md`.

- Fabrication et déploiement : `docs/vault/Technique/Netlify.md` ; contenu des pages : `docs/vault/Technique/Site.md`.
- Une fiche par fichier : `docs/vault/Code/Site/Code du site.md`.
- On modifie `src/*.html` (et les `.json` de `src/`), jamais les pages à la racine de `site/` : elles sont générées par `python3 site/tools/build.py`, à lancer puis commiter (la CI `site-check` le vérifie).
- Si le catalogue de l'app change : `python3 site/tools/sync_app.py` avant `build.py`.
- Le prix Lifetime du site doit rester égal à `LIFETIME_PRICE` du serveur (`build.py` le vérifie). Mettre à jour le vault à la fin de la tâche.
