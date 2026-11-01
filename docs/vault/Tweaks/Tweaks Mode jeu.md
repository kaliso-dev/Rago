---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Mode jeu

Module **Mode jeu** (`gamemode`) de l'app 1.2.1 : Active avant de jouer, désactive après.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Mode jeu Rago

### Mode jeu Rago `game_mode` ↩️
Activé vide les fichiers temporaires, met en pause l'indexation de la recherche et la télémétrie jusqu'au redémarrage, coupe l'impression, les animations de Windows et l'enregistrement en fond de la Xbox Game Bar, et active le Mode jeu de Windows. Désactivé remet tout en route.
- Variantes : Activé (`on`), Désactivé (`off`, retour) ; par défaut `on`.
- Gain : Moins de travail en fond pendant tes parties, et Windows plus vif tout de suite. Gain de FPS surtout si l'enregistrement en fond était activé.
- Inconvénient : La recherche de fichiers de Windows est plus lente et l'impression ne marche plus tant que le mode est activé ; la barre des tâches se relance au passage.
