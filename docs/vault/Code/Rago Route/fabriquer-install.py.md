---
type: code
tags: [code, rago-route, serveur, python, outil]
fichier: proxy/fabriquer-install.py
lignes: 92
maj: 2026-11-11
---
# fabriquer-install.py

Générateur du script d'installation des serveurs Rago Route : il lit [[rago-route.py]] et [[mcping.py]] et écrit [[install.sh]], un seul fichier à coller sur un VPS Ubuntu. Fiche parente : [[Code de Rago Route]]. Fonctionnalité : [[Proxy]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Règle du dossier ([[CLAUDE.md (proxy)]]) : après tout changement de `rago-route.py` ou `mcping.py`, lancer `python3 proxy/fabriquer-install.py`. Sofiene relance ensuite lui-même `install.sh` sur chaque VPS (Paris et Frankfurt ; voir [[Infrastructure Rago Route]]).
- Il ne se connecte à rien et ne touche aucun serveur : il écrit seulement `proxy/install.sh` à côté de lui.

## Ce que le fichier expose

Aucune fonction : c'est un script. Lancement : `python3 proxy/fabriquer-install.py`. Sortie : `install.sh écrit, N octets` (74 651 le 10/11). Ce nombre vient de `len(script)` : ce sont des caractères, pas des octets ; le fichier fait 75 068 octets (lettres accentuées sur 2 octets).

## Fonctionnement détaillé

1. Lit `mcping.py` et `rago-route.py` dans le dossier du script (`pathlib.Path(__file__).parent`).
2. Vérifie qu'aucun des deux ne contient `RAGO_EOF` (`assert`), le marqueur de fin des blocs `cat > … <<'RAGO_EOF'`. Les guillemets autour du marqueur empêchent le shell d'interpréter `$` ou les accents graves du code Python.
3. Remplit un modèle (une f-string Python ; les accolades du shell sont doublées `{{ }}`) qui devient [[install.sh]] : vérification `root`, 5 étapes numérotées, contrôles finaux. Le détail de ce que fait le script est dans [[install.sh]].
4. Écrit `install.sh` (texte, sans changer ses droits).

## Données touchées

Lecture de `proxy/rago-route.py` et `proxy/mcping.py` ; écriture de `proxy/install.sh` (écrasé à chaque lancement).

## Erreurs et cas limites

- `AssertionError` si un des fichiers contient `RAGO_EOF`.
- Le script n'exécute rien de ce qu'il emballe : une erreur de syntaxe dans `rago-route.py` ne se verra qu'au démarrage du service sur le VPS (le contrôle final de [[install.sh]] affiche alors « Rago Route : ERREUR » et les 20 dernières lignes du journal).

## Liens avec le reste

- Produit [[install.sh]] à partir de [[rago-route.py]] et [[mcping.py]].
- Le client Windows [[route.rs]] n'est pas concerné (il est livré dans l'app).

## À savoir avant de modifier

- Modifier le modèle ici, **jamais** `install.sh` à la main (il porte « Généré par proxy/fabriquer-install.py : ne pas modifier à la main »).
- Vérifié le 10/11 : le `install.sh` du dépôt contient exactement les `rago-route.py` et `mcping.py` actuels (il est à jour).
- Aucun secret ne doit entrer dans le modèle : le service lit seulement les clés **publiques** du serveur de licences par HTTPS.
