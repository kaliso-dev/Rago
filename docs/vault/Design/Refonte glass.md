---
type: design
tags: [design, app, 1.2]
version_app: 1.3.0
maj: 2026-11-24
---
# Refonte glass

> **Remplacée par la charte v5 « Match day »** ([[Charte graphique]], 22/11) : dans `staging` pour l'app depuis la PR #108. Le verre reste ce que voient les joueurs (1.2.1, 1.3.0) jusqu'à la sortie de la v5 ; à ce moment, supprimer cette note et garder une ligne dans [[Décisions]] > « Abandonné ».

Demandée le 16/10 : rester dans la [[Charte graphique]], s'inspirer d'Apple, beaucoup d'effet verre, interface plus épurée, **gagner de la place pour les nouvelles fonctionnalités**, et **ne rien changer aux optimisations ni au fonctionnement**. Livrée dans la [[Version 1.2.0]] (PR #58).

- Barre latérale plus étroite, carte « Free plan » compacte, tableau de bord resserré (place pour Clean RAM et le bandeau de mise à jour).
- Jetons réutilisables `--rg-glass-*` (repris par la [[Barre en jeu]]) : trois voiles blancs (2,5 %, 4,5 %, 8 %), un fond de panneau flottant, un flou `blur(36px) saturate(1.8)`, un reflet du bord haut, un fond de carte et un liseré dégradé. **Le flou ne va que sur ce qui flotte** (barre latérale, barre « Appliquer », fenêtres, messages), jamais sur les cartes, pour garder un défilement fluide. Le liseré des cartes est tracé par un `::after` masqué. La barre en jeu garde un verre sombre sans flou.
- Un « check complet » le 17/10 a relevé 125 remarques, 86 retenues et appliquées, avec captures avant/après.
- Maquettes et captures : `refonte-glass/` du dossier partagé (`1-tableau-de-bord.png` … `8-reseau-verre-v2.png`, `captures-1.2.0/`), voir [[Sources]].

Liens : [[App Windows]], [[Barre en jeu]].

## Code
- Jetons et règles du verre, plan des feuilles de style : [[Styles de l'app (CSS)]] (`tokens.css`, `app.css` section « verre : bord lumineux », `features.css` ; `overlay.css`, le verre de l'ancienne barre en jeu, est supprimée le 24/11). Jetons de la marque : [[tokens.css (marque)]].
- Briques visuelles (boutons, cartes, interrupteurs, fenêtres, logo) : [[Petits composants de l'interface]]. Carte d'ensemble : [[Code de l'app (interface)]].
