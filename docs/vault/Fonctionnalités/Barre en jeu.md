---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
maj: 2026-10-31
---
# Barre en jeu

Linear RAG-82. Arrivée en [[Version 1.2.0]]. Code : `overlay.rs`, `fps.rs`, `gameping.rs`, `mcping.rs`, `session.rs`.

- **Alt+X** en pleine partie ouvre une barre en verre par-dessus le jeu (le raccourci était Ctrl+Maj+R avant le 22/10). Échap ou un clic dans le jeu la ferme et rend la main.
- Affiche FPS (mesurés par **PresentMon 2.3.0** d'Intel, ajouté seulement par la compilation GitHub), ping, CPU, GPU, RAM. Option « FPS et ping à l'écran » : pastille qui ne prend pas les clics.
- Ping : sur Minecraft, mesuré avec le protocole du jeu (comme sa liste des serveurs) ; jeux TCP : aller-retour de la connexion ; « ≈ » = ping estimé. Le site disait « seulement TCP », corrigé le 29/10.
- Souris : en fenêtré la barre prend le premier plan ; en plein écran elle envoie Échap au jeu pour libérer la souris.
- **Premium** : 21 tweaks activables en pleine partie. **Gratuit** : les stats.
- Signale OBS ou qBittorrent ouverts.
- Jetons `--rg-glass-*` de la [[Refonte glass]].

Liens : [[Test réseau]], [[Bibliothèque de jeux]], [[Offres et prix]], [[Trailer 1.2]].
