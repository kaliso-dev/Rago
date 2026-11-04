---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks RBW Mod

Module **RBW Mod** (`rbw`) de l'app 1.2.1 : Prêt pour un screenshare Ranked BedWars.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Services

### RBW Mod `rbw_mode` ↩️
Activé démarre les services et remet les réglages que lit le vérificateur de screenshare RBW, même coupés par d'autres réglages ; Désactivé les remet comme Windows par défaut, sans rien arrêter.
- Variantes : Activé (`on`, retour), Désactivé (`off`) ; par défaut `on`.
- Gain : Le vérificateur officiel de RBW voit tout en vert après le redémarrage, et un joueur clean ne paraît pas suspect.
- Inconvénient : Activé comme Désactivé relancent la télémétrie et défont une partie des réglages vie privée de l'app : ils affichent ensuite « Changé par Windows ». Ne les réapplique qu'après tes parties RBW.
