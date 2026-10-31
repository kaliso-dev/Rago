---
type: version
tags: [version, historique]
version: 1.1.10
maj: 2026-10-31
---
# Version 1.1.10

Sortie le 10/10/2026, jour du lancement. Voir [[Historique des versions]].

- **Contenu** : [[Remise à zéro]] automatique et invisible des tweaks Premium à la fin de licence, de tout à la désinstallation (`reset.rs`, `installer/hooks.nsh`, `ResetToast.tsx`).
- **Code** : un seul commit `a11f230`, branche `claude/auto-reset-tweaks-3ti5yy`, PR #16 jamais fusionnée (conflit sur les numéros de version). Son `site/` et son `licensing/` sont périmés.
- **Rôle** : le 15/10, Sofiene en fait la version de référence (« oublie la dernière version 1.1.13 on reste sur la 1.1.10 »). La [[Version 1.1.14]] repart de cette base.
- **Bugs connus de la 1.1.10** (corrigés en 1.1.14) : écran bleu 0x7E sous Windows 11 24H2 (RAG-67) ; aucun réglage appliqué si le dossier utilisateur contient `& ( ) ^ @` ; RBW Mod qui laisse des services arrêtés (RAG-69) ; préréglage réseau 3 en échec (RAG-68) ; annulations destructrices (RAG-60) ; remise déclenchée sur un simple doute de licence (RAG-72). Voir [[Bugs et incidents]].
- Les exe 1.1.10 n'existent que comme artefacts CI (runs 38036268696 et 38036301822), qui **expirent le 08/01/2027**.
