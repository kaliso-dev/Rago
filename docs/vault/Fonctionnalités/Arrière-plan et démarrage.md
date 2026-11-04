---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-10-31
---
# Arrière-plan et démarrage

Mode arrière-plan (RAG-82, `background.rs`, réglages dans `background.json`). Nécessaire pour la [[Barre en jeu]] et [[Pendant la partie]].

- **Rester près de l'horloge à la fermeture** : fermer la fenêtre garde Rago ouvert avec son icône ; « Quitter » depuis l'icône le ferme vraiment.
- **Lancer avec Windows** : **activé d'office** depuis la 1.2.0 ; Rago démarre caché près de l'horloge à l'ouverture de session. Tâche « Rago Optimizer » dans le Planificateur de tâches (droits admin), retirée à la désinstallation. L'app ne le réactive pas si le joueur l'a coupé.
- **Une seule Rago à la fois** (`instance.rs`) : un second lancement ramène la fenêtre existante. Voir [[Réparations au lancement]].
- **Animation au lancement** : le logo apparaît, puis l'app s'ouvre (`Splash.tsx`).

Liens : [[Paramètres de l'app]], [[Mise à jour automatique]].
