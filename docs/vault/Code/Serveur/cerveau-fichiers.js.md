---
type: code
tags: [code, serveur, javascript, admin, vault, navigateur]
fichier: licensing/public/cerveau-fichiers.js
lignes: 326
maj: 2026-11-27
---
# cerveau-fichiers.js

L'**explorateur de fichiers** du [[Cerveau du vault]] dans le navigateur (cerveau **Rago Design**, 27/11) : arborescence à gauche, galerie du dossier ouvert, visionneuse d'un fichier. Sans bibliothèque, CSP stricte (aucun style ni script en ligne, tout texte échappé). Fiche parente : [[Code du serveur]]. Serveur : [[brain-files.js]] ; page : [[brain-views.js]] (`explorerPage`) ; styles : [[cerveau.css]] (classes `dx-`).

(27/11 : PR #167 vers `staging`, pas fusionnée)

## Fonctionnement détaillé
- **Données** : `#dx` porte `data-tree` (`/admin/cerveau/arbre.json?c=<id>`), `data-raw` (`/admin/cerveau/brut?c=<id>`), `data-repo`, `data-branch`, `data-name`. L'arborescence est lue au chargement (avec `If-None-Match`) et par le bouton ↻ (`frais=1`). Pied : branche, commit, nombre de fichiers, taille totale, heure de lecture, avertissement si GitHub a tronqué la liste, raison en jaune si la dernière lecture a échoué. Si rien n'a pu être lu : le message du serveur (ex. « Ajoute rago-design au jeton CERVEAU_GITHUB_TOKEN … ») et « Réessayer ».
- **Adresse d'un fichier** : `brut?c=…&chemin=<chemin>&v=<empreinte du blob>` ; l'empreinte permet au navigateur de garder le fichier un an.
- **Arborescence** : dossiers repliables (chevron, nombre de fichiers), fichiers avec icône image/texte/autre ; clic sur un dossier = l'ouvrir et l'afficher, sur un fichier = le visionner (le tiroir se ferme sur téléphone). **Filtre** : liste à plat des chemins qui contiennent le texte (400 au plus), aussi dans la galerie.
- **Galerie** (mode « Vignettes », gardé dans `localStorage` `rago.cerveau.fichiers.mode`) : tuiles des sous-dossiers (nombre et taille) puis des fichiers ; vignette = l'image elle-même en `loading="lazy"` si elle fait 4 Mo au plus, sinon une tuile « aperçu au clic » ; une image qui ne charge pas affiche « Aperçu impossible ». Mode « Liste » : tableau nom, taille, type.
- **Visionneuse** : barre (retour au dossier, nom, taille, position « n / total », précédent / suivant, télécharger). Image sur damier, ajustée à l'écran, clic = taille réelle. Texte (scripts `.py`, `.md`…) de 2 Mo au plus : lu par `fetch` et affiché avec numéros de ligne (`.cv-code`). Plus de 25 Mo (`maxFile` du serveur) : « Fichier trop gros pour être ouvert ici » et « Ouvrir sur GitHub ». Autres fichiers : « Télécharger » et « GitHub ».
- **Adresse de la page** : `#d=<dossier>` ou `#f=<fichier>` (lien partageable, Précédent du navigateur) ; fil d'Ariane cliquable ; bouton « GitHub » vers le dossier ou le fichier ouvert. Clavier : `←` `→` fichier précédent / suivant, `Échap` retour au dossier.
- Le menu des cerveaux se ferme au clic à côté ou sur `Échap`, comme dans [[cerveau.js]].

## Liens avec le reste
Chargé par la page de [[brain-views.js]] quand le cerveau ouvert est un explorateur (`?c=rago-design`). Routes : [[admin.js (serveur)]].
