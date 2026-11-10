---
type: technique
tags: [technique, serveur, admin, vault]
maj: 2026-11-10
---
# Cerveau du vault (`/admin/cerveau`)

Le vault Obsidian du projet (`docs/vault/`) dessiné comme un cerveau : chaque note est un point, chaque lien entre deux notes un trait, et des impulsions parcourent les liens. On clique sur un point pour lire la note, et on peut ouvrir et lire **n'importe quel fichier du dépôt**. C'est une page de l'admin du [[Serveur de licences]], à côté du [[Tableau de bord admin]].

Demandé par Sofiene le 10/11 : « une vision graphique du cerveau comme obsidian avec un schéma ou on voir les connexcion neuronale on pourra aussi ouvrir n'importe quel fichier et le lire tout l'animation de schéma des connexion doit etre parfaite et fluide […] il faudrait meme que ça soit juste accessible depuis l'interface admin ».

**Statut (10/11)** : code fini et testé, **dans `staging` depuis le 10/11** (PR #85, fusionnée sur « fusionne » de Sofiene). Pas en prod : la prod suivra par une PR « (prod) ». Pour que la page lise le dépôt une fois privé, il faut `CERVEAU_GITHUB_TOKEN` dans Railway.

## Accès
- Menu de `/admin` → section **Projet** → **Cerveau**. Adresse : `https://account.rago-optimizer.com/admin/cerveau` (staging : `rago-staging.up.railway.app/admin/cerveau`).
- Même clé que le reste de l'admin, `ADMIN_KEY`. **Abel s'en sert avec cette même clé** : choix de Sofiene du 10/11 (« La clé admin complète »), plutôt qu'une clé à part ou un sous-domaine. Abel voit donc aussi les joueurs, les ventes et les actions de l'admin ([[Décisions]]).
- Sans cookie admin, les trois adresses du Cerveau renvoient vers `/admin` (le formulaire de la clé). Rien du vault n'est servi sans la clé.

## D'où vient le vault
Le serveur de Railway ne contient que `licensing/` ([[Railway]], Root Directory = `licensing`) : le vault n'est pas sur le serveur. Le Cerveau le lit donc **sur GitHub** :
- la branche lue est `staging` (variable `CERVEAU_BRANCH`), là où le vault est tenu à jour en premier ([[Branches et environnements]]) ;
- le serveur regarde le dernier commit de la branche par la liste des branches de git (`https://github.com/kaliso-dev/rago.git/info/refs?service=git-upload-pack`), qui ne compte pas dans le quota de l'API GitHub ;
- il ne télécharge l'archive du dépôt (`codeload.github.com/…/tar.gz/<commit>`) que quand le commit change, **au plus une fois par minute** et seulement quand quelqu'un regarde la page ;
- la page se recharge toute seule toutes les 2 minutes si le vault a changé (message « Vault mis à jour : N notes (+x) »), et le bouton ↻ en bas à gauche force la lecture (60 fois par heure au plus par adresse IP).
- Si GitHub ne répond pas, la dernière version lue reste affichée avec la raison en rouge sous l'heure de lecture.

**Dépôt privé** : `rago` passe parfois en privé en novembre et pour de bon le 1er décembre ([[CI GitHub Actions]]). Sans jeton, le Cerveau affiche alors « Le dépôt kaliso-dev/rago n'est pas lisible sans jeton ». Il faut mettre dans Railway la variable `CERVEAU_GITHUB_TOKEN` : un jeton GitHub « fine-grained », limité au dépôt `kaliso-dev/rago`, droit **Contents : Read-only** seulement (mode d'emploi dans `licensing/docs/MISE-EN-LIGNE.md`, partie « Le Cerveau »). Avec le jeton, l'archive passe par `api.github.com/repos/…/tarball/<commit>`. À faire par Sofiene ([[Prochaines étapes]]). Voir [[Variables d'environnement]].

En local (`npm run local`) et dans les tests, le Cerveau lit le dossier sur le disque (fichiers suivis et nouveaux, sans ceux ignorés par git), y compris les notes pas encore poussées ([[Développer et tester]]).

## Ce que montre la page
- **Graphe** : un point par note, coloré par dossier du vault (Pilotage = notes de la racine, Technique, Fonctionnalités, Code, Tweaks, Versions, Marketing, Design, Suivi, Projets, Historique), d'autant plus gros qu'il a de liens. Les traits sont les liens entre notes. En option : les fichiers du dépôt cités dans les notes (petits carrés), les tags (losanges), les liens cassés (cercles vides), les notes isolées.
- **Animation** : simulation de forces (comme la vue graphe d'Obsidian) qui se pose en 5 secondes environ puis s'arrête ; caméra qui glisse, zoom à la molette, au pincement ou avec + et −, inertie quand on lâche le graphe, points qu'on peut tirer. Au survol, la note et ses voisins s'allument, le reste s'efface, et des impulsions (« l'influx ») partent de la note vers ses voisins ; d'autres impulsions parcourent le graphe au hasard. Les noms des notes apparaissent selon le zoom, sans jamais se chevaucher. 60 images par seconde mesurées dans Chromium avec 250 notes et 2 600 liens.
- **Graphe local** : bouton « Local » (touche L) : seulement la note ouverte et ses voisins, à 1, 2 ou 3 liens de distance.
- **Lecteur** (panneau de droite, largeur réglable en tirant son bord, mode « grand ») : la note mise en forme (tableaux, listes, cases à cocher, encadrés, blocs de code colorés), l'en-tête (dossier, type, date `maj`, tags), un sommaire (à partir de 4 parties), puis « Mentionnée dans » avec la phrase de chaque citation, « Liens sortants », « Fichiers cités » et « Liens cassés ». Les liens de notes ouvrent la note, le code entre backticks qui nomme un fichier du dépôt ouvre le fichier. Pointer un lien du lecteur allume sa note dans le graphe.
- **Fichiers** : n'importe quel fichier du dépôt s'ouvre dans le lecteur avec numéros de ligne et couleurs (JS/TS, Rust, Python, PowerShell, batch, shell, CSS, HTML, JSON, TOML, YAML, SQL) ; un `.md` hors du vault s'affiche mis en forme avec un bouton « Source ». Les images et binaires ne sont pas affichés (lien GitHub). Les fichiers de plus de 600 Ko sont listés mais pas lus.
- **Explorateur** (colonne de gauche) : l'arbre du vault et l'arbre complet du dépôt ; onglet **Affichage** : groupes à afficher, options, forces (attraction, répulsion, force et longueur des liens), chiffres du vault et liste des liens cassés.
- **Recherche** (`Ctrl K` ou `/`) : notes par nom, puis texte des notes (avec l'extrait), puis fichiers du dépôt. Le champ « Filtrer le graphe » allume les notes qui correspondent.
- **Adresse** : la note ou le fichier ouvert est dans l'adresse (`#n=<note>` ou `#f=<chemin>`), donc un lien copié (bouton 🔗) rouvre la même note, et le bouton Précédent du navigateur marche.
- **Téléphone** : explorateur en tiroir (bouton ☰), lecteur plein écran, pincement pour zoomer.
- Les réglages (groupes masqués, options, forces, largeur du lecteur) sont gardés dans le navigateur (`localStorage`, clé `rago.cerveau.v1`).

## Raccourcis
`Ctrl K` ou `/` rechercher · `F` tout voir · `L` graphe local · `+` `−` zoom · `Échap` fermer · `Alt ←` note précédente · double-clic sur un point pour zoomer dessus.

## Code
- [[brain.js]] : lecture du dépôt (GitHub ou disque), lecteur d'archive tar, rendu du markdown façon Obsidian, construction du graphe, cache.
- [[brain-views.js]] : la page HTML (sans script ni style en ligne, comme tout `/admin`).
- [[cerveau.js]] : le graphe, l'animation, le lecteur, la recherche, dans le navigateur.
- [[cerveau.css]] : la mise en page et les styles.
- Routes dans [[admin.js (serveur)]] : `GET /admin/cerveau` (la page), `GET /admin/cerveau/donnees.json` (tout le vault, compressé, avec `ETag`), `GET /admin/cerveau/fichier?chemin=` (un fichier du dépôt) ([[API du serveur]]).
- Tests : `licensing/test/brain.test.js`, 7 tests ([[Tests du serveur]]).

## À savoir
- Les notes du vault sont lues telles quelles : un lien vers une note qui n'existe pas apparaît comme lien cassé (pastille jaune en haut du graphe et liste dans Affichage). C'est un bon moyen de vérifier la règle « aucun lien cassé » de [[Mettre à jour le vault]].
- Le dépôt étant public tant qu'il n'est pas privé, le Cerveau ne montre rien de plus que GitHub ; il ne montre jamais de `.env`.
- Le Cerveau affiche la branche `staging` même sur le serveur de prod : le vault de la branche de prod est en retard sur celui de `staging`.
