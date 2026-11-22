---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.3.0
maj: 2026-11-10
---
# Arrière-plan et démarrage

Mode arrière-plan (RAG-82, `background.rs`, réglages dans `background.json`). Nécessaire pour la [[Barre en jeu]] et [[Pendant la partie]].

- **Rester près de l'horloge à la fermeture** : fermer la fenêtre garde Rago ouvert avec son icône ; un clic gauche sur l'icône rouvre la fenêtre ; « Quitter » depuis le menu de l'icône le ferme vraiment (après une remise à zéro en cours, et en installant une mise à jour prête, voir [[Mise à jour automatique]]). Menu en français ou en anglais selon la langue de l'app.
- **Lancer avec Windows** : **activé d'office** depuis la 1.2.0 ; Rago démarre caché près de l'horloge à l'ouverture de session (argument `--background`). Tâche planifiée « Rago Optimizer » (exe de test : « Rago Optimizer Staging ») plutôt que la clé `Run` du registre, qui ne lance pas une app demandant les droits administrateur. La tâche part **10 s** après l'ouverture de session, avec les droits les plus élevés disponibles (`HighestAvailable`), aussi sur batterie, sans limite de durée. Elle est retirée à la désinstallation, pas pendant une mise à jour ([[Installateur NSIS]]).
- **Réglages d'office** tant que le joueur n'a rien choisi : près de l'horloge à la fermeture et lancement avec Windows activés (l'app ne les réactive plus dès que le joueur a coupé l'option), barre en jeu activée, raccourci **Alt+X** (l'ancien Ctrl+Maj+R est remplacé : Échap tapé trop tôt ouvrait le Gestionnaire des tâches), FPS et ping épinglés coupés, options de [[Pendant la partie]] (carte graphique performante, Performances élevées, vérifications) activées.
- **Une seule Rago à la fois** (`instance.rs`) : un second lancement ramène la fenêtre existante. Voir [[Réparations au lancement]].
- **Animation au lancement** : le logo apparaît, puis l'app s'ouvre (`Splash.tsx`).

Liens : [[Paramètres de l'app]], [[Mise à jour automatique]].

## Code
- Préférences, icône, tâche planifiée : [[background.rs]] ; démarrage (`--background`, création de la tâche si elle manque, fermeture de la fenêtre) et commandes `background_get`, `background_set` : [[lib.rs]].
- Instance unique et réveil de la fenêtre : [[instance.rs]] ; raccourci et barre en jeu : [[overlay.rs]] ; suppression de la tâche : [[Installateur NSIS]].
