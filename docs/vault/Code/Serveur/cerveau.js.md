---
type: code
tags: [code, serveur, javascript, admin, vault, navigateur]
fichier: licensing/public/cerveau.js
lignes: 1534
maj: 2026-11-10
---
# cerveau.js

Tout le [[Cerveau du vault]] dans le navigateur : le graphe animé des notes (simulation de forces, dessin sur `canvas`, caméra, impulsions le long des liens), l'explorateur, le panneau d'affichage, le lecteur de notes et de fichiers avec coloration du code, la recherche et la navigation par l'adresse. Sans aucune bibliothèque. Fiche parente : [[Code du serveur]]. Données : [[brain.js]] ; page : [[brain-views.js]] ; styles : [[cerveau.css]].

(code de la PR du Cerveau, 10/11, pas encore dans `staging`)

## Rôle et place dans l'ensemble
Servi en fichier statique (`/assets/cerveau.js?v=<ASSETS>`), chargé par la page de [[brain-views.js]]. Il lit `/admin/cerveau/donnees.json` (tout le vault en une fois, compressé, revalidé par `ETag`) et `/admin/cerveau/fichier?chemin=` (un fichier à la demande). La CSP de l'admin interdit le code et les styles en ligne : les couleurs des pastilles passent par `data-c` puis `style.setProperty('--c', …)` (fonction `paint`), autorisé par la CSP.

## Fonctionnement détaillé

### Données et modèle
- `fetchData(fresh)` : `fetch` de `donnees.json` (`?frais=1` pour le bouton ↻). Une redirection ou une réponse qui n'est pas du JSON = session admin expirée (« Ta session admin a expiré : reconnecte-toi », bouton « Se reconnecter »). L'en-tête `X-Cerveau-Erreur` (GitHub injoignable, version gardée) s'affiche en rouge dans le pied.
- `index()` : `notesById`, `filesByPath`, `backlinks` (qui cite chaque note), `citedBy` (quelles notes citent chaque fichier).
- `buildGraph()` : un nœud par note (`n:<id>`), par fichier cité (`f:<chemin>`, sauf les `.md` du vault), par tag (`t:<tag>`), par lien cassé (`g:<nom>`) ; un lien par paire (sans doublon). À chaque rechargement, les nœuds gardent leur position (le graphe ne « saute » pas). Rayon d'une note : `min(19, 3,4 + √liens × 1,35)` ; fichier 2,8 ; tag 3,2 ; lien cassé 2,6. Les nouveaux nœuds partent à côté d'un voisin déjà placé, ou la première fois sur une spirale par groupe (la mise en place est plus rapide).
- `computeVisible()` : groupes masqués, options (fichiers, tags, liens cassés, notes isolées), graphe local (voisins de la note ouverte jusqu'à 1, 2 ou 3 liens) ; un fichier, un tag ou un lien cassé ne s'affiche qu'à côté d'une note affichée.

### Simulation (le modèle de d3-force, réécrit)
- Liens : longueur `52 × « Longueur des liens »` (× 0,55 pour un fichier, un tag ou un lien cassé), force `1 / min(degrés)` répartie selon les degrés (comme d3).
- Répulsion : arbre de Barnes-Hut (quadtree, θ = 0,9), force `−34 × « Répulsion »`, plus forte pour les notes très liées (`1 + min(liens, 40) × 0,035`).
- Centrage : `0,03 × « Attraction au centre »`. Collisions : grille de 44 px, distance `r1 + r2 + 4`.
- Refroidissement : `alpha` part de 1 et descend sur 320 étapes jusqu'à 0,004 ; amortissement des vitesses 0,4. Tirer un point le fixe (`fx`, `fy`) et réchauffe la simulation.

### Boucle d'animation
- Une seule boucle `requestAnimationFrame` (`frame`) : simulation, caméra, fondus, impulsions, dessin. Elle s'endort après 30 images sans rien à faire, et ne tourne pas quand l'onglet est caché (`visibilitychange`). Avec l'option « Influx » (par défaut, sauf « réduire les animations »), elle tourne tant que la page est visible.
- Caméra : chaque mouvement glisse vers sa cible (constante de 105 ms ; zoom en échelle logarithmique), inertie après un glissé (×0,9 par image), zoom de 0,06 à 7, molette `exp(−deltaY × 0,0018)` (≈ ×1,2 par cran), pincement à deux doigts, double-clic pour zoomer sur un point. « Tout voir » (`fit`) cadre les nœuds visibles (zoom 1,6 au plus) ; au premier chargement, le cadrage suit le graphe pendant 2,6 s. Quand le lecteur couvre la droite, le centre du graphe se décale dans la partie visible (`viewOffset`).
- Fondus : apparition et disparition des nœuds et liens (170 ms), mise en avant au survol (120 ms), grossissement du point survolé (×1,35).
- **Influx** : depuis la note survolée ou ouverte, une impulsion part toutes les 70 ms (une chance sur deux et un peu plus) vers un voisin ; ailleurs, une impulsion toutes les 110 ms sur un lien au hasard tant qu'il y en a moins de 70 ; 140 au plus. Durée 0,5 à 1 s, quatre points qui s'estompent, couleur de la note de départ.

### Dessin (`draw`)
- Traits regroupés par opacité (21 niveaux) pour les tracer en peu d'appels ; ceux de la note en focus dans sa couleur. Seul ce qui est à l'écran est dessiné.
- Points : rond (note), carré (fichier), losange (tag), cercle vide (lien cassé). Halo pré-dessiné une fois par couleur (`glow`) sous la note en focus et ses voisins ; anneau blanc et battement autour de la note ouverte.
- **Noms** : dessinés en pixels écran (nets à tout zoom), police Geist 11,5 px avec un contour sombre. Chaque nom « veut » s'afficher selon le zoom et la taille du point (`labelWant`) ; ils sont placés du plus important au moins important (survol, voisins du survol, filtre, déjà affichés, notes, taille) et **un nom qui chevaucherait un autre attend et s'efface** au lieu de s'empiler. Les fichiers et tags n'ont leur nom qu'à partir du zoom 1,4.

### Interactions
- Pointeur : survol (info-bulle avec dossier, liens, citations, mots ; la note et ses voisins restent allumés, le reste s'efface), clic = ouvrir, glisser un point = le déplacer, glisser le fond = déplacer la vue. Sur écran tactile, le survol n'existe pas : un toucher ouvre.
- Explorateur : arbre du vault (dossiers repliables, pastille de couleur, nombre de notes) et arbre du dépôt entier (rempli à l'ouverture d'un dossier) ; la note ou le fichier ouvert y est mis en évidence et déplié (`reveal`).
- Panneau « Affichage » : un interrupteur par groupe, les options, quatre curseurs de forces (bouton « Par défaut »), les chiffres du vault et la liste des liens cassés (cliquer ouvre la note qui contient le lien).
- Filtre : les nœuds dont le nom (ou le chemin, les tags) contient le texte restent allumés, les autres s'effacent ; `Échap` vide le filtre.

### Lecteur
- `openNote(id, ancre)` : titre (le `# titre` de la note s'il y en a un), pastilles (groupe, `type`, `maj`, `version_app`, `fichier` cliquable, `lignes`, tags), sommaire si 4 parties ou plus, le HTML préparé par le serveur, puis « Mentionnée dans » (avec la phrase de chaque citation), « Liens sortants », « Fichiers cités », « Liens cassés ». Les blocs de code des notes sont colorés.
- `openFile(chemin)` : en-tête (nom, chemin, taille, lignes), code coloré avec numéros de ligne (compteur CSS, non copié), ou pour un `.md` hors vault les modes « Lecture » et « Source » ; binaires et fichiers trop gros : bouton « Ouvrir sur GitHub ». « Cité dans » liste les notes qui citent le fichier. Les fichiers lus sont gardés en mémoire pour la version en cours.
- Actions : copier le lien, ouvrir sur GitHub (branche et commit lus), lecture en grand, fermer. Largeur réglable en tirant le bord gauche (360 px au moins, gardée dans le navigateur). Pointer un lien du lecteur allume sa note ou son fichier dans le graphe.
- Coloration (`highlight`) : un petit découpeur par langage (mots-clés JS/TS, Rust, Python, PowerShell, shell, batch, SQL, TOML, YAML, CSS, HTML, JSON) pour les commentaires, chaînes, nombres, mots-clés, appels et types. Rien n'est exécuté.

### Recherche (`Ctrl K`, `/`, bouton loupe)
Sans texte : les 12 notes les plus récentes (`maj`). Avec du texte (sans accents ni majuscules) : « Notes » dont le nom correspond (nom exact > début > contient > tous les mots), puis « Dans le texte » (toutes les notes qui contiennent tous les mots, avec un extrait surligné), puis « Fichiers du dépôt ». Flèches, `Entrée`, `Échap`.

### Navigation et préférences
- L'adresse porte ce qui est ouvert : `#n=<note>` (et `&h=<ancre>` pour un titre) ou `#f=<chemin>`. `go()` change l'adresse, `route()` ouvre ; Précédent et Suivant du navigateur marchent ; un lien copié rouvre la même note.
- Raccourcis : `F` tout voir, `L` graphe local, `+` `−`, `Échap` (palette, filtre, tiroir, lecteur), `Alt ←`.
- Préférences dans `localStorage`, clé `rago.cerveau.v1` : options, forces, groupes masqués, dossiers ouverts, largeur du lecteur, onglet, profondeur et graphe local. En navigation privée, rien n'est gardé, sans erreur.
- Rechargement : toutes les 2 minutes (onglet visible), revalidation par `ETag` ; si le vault a changé, le graphe se met à jour sans perdre sa forme, la note ouverte est rechargée à la même hauteur, et un message donne le nouveau nombre de notes.
- `?debug=1` dans l'adresse ajoute `window.__cv` (position d'une note à l'écran), utilisé seulement par les tests dans le navigateur.

## Données touchées
Réseau : `/admin/cerveau/donnees.json`, `/admin/cerveau/fichier`. `localStorage` (`rago.cerveau.v1`). Presse-papiers (copier le lien).

## Liens avec le reste
Routes servies par [[admin.js (serveur)]] avec [[brain.js]]. Couleurs et polices de la [[Charte graphique]] (jetons de `tokens.css`).

## Tests
Testé à la main dans Chromium le 10/11 (Playwright) : bureau 1440 × 900 et téléphone 390 × 844, graphe, survol, lecteur, recherche, fichiers, graphe local, options ; aucune erreur dans la console ; 56 à 60 images par seconde pendant la mise en place. Pas de test automatique du navigateur dans la CI. Les routes et les données sont testées dans `brain.test.js` ([[Tests du serveur]]).

## À savoir avant de modifier
- Changer `ASSETS` dans [[brain-views.js]] après chaque modification de ce fichier.
- Aucun `innerHTML` avec du texte non échappé : tout passe par `esc()`, et le HTML des notes vient déjà échappé du serveur.
- Pas de style en ligne (CSP) : passer par des classes, des variables CSS posées avec `style.setProperty`, ou `data-c` + `paint()`.
