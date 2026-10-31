---
type: fonctionnalité
tags: [fonctionnalité, app, minecraft, rbw]
maj: 2026-10-31
---
# RBW Mod

Module pour jouer en **Ranked Bedwars** (RBW), partenaire officiel ([[Partenaires et créateurs]]). Le vérificateur anti-triche de RBW contrôle certains services et réglages Windows : un service arrêté peut valoir un ban.

- Décision du 13/10 : « Activé » = exactement le script `Rago-RBW-Fix.ps1` ; « Désactivé » = valeurs Windows ; ne touche pas aux autres réglages ; lancé en dernier.
- Bug RAG-69 (services laissés arrêtés) présent en [[Version 1.1.10]], corrigé en [[Version 1.1.14]]. Voir [[Bugs et incidents]].
- [[Version 1.2.0]] : affiche l'état de ce que lit le vérificateur (11 services, CDPUserSvc, 6 réglages, relus toutes les 5 s) et un bouton « Tout remettre en marche ». Code : `rbw.rs`.
- Règle : aucun preset, nettoyage ou outil ne doit toucher à ce que lit le vérificateur ([[Presets]], [[Page Outils]]).
