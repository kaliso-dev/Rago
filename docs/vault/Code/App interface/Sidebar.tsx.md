---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/Sidebar.tsx
maj: 2026-11-23
---
# Sidebar.tsx

La **barre latérale**, reprise de la maquette v5 (`shell5.js`, `printicons.js`) le 23/11 : logo R + « AGO », trois groupes, icônes imprimées, compteurs, carte de mise à jour, carte « This PC », Paramètres et la devise. Fiche parente : [[Code de l'app (interface)]] ; voir [[Maquettes v5 dans l'app (s5)]].

## Entrées
| Groupe | Entrées (id de page, icône) |
|---|---|
| Optimize | dashboard, analysis (« Analyze my PC »), network, latency, gpu (« Graphics card »), windows, tools |
| Play | games (bibliothèque), display, hitreg, mouse, gamemode (« Game mode »), minecraft, rbw (« RBW Mod ») |
| Pro | expert (« Expert mode »), restore |

## Compteurs (à droite de l'entrée, comme la maquette)
- Latence, Carte graphique, Windows, Hitreg, Mode expert : interrupteurs **allumés sur le PC** (appliqués et pas en cours d'annulation ; un réglage seulement coché ne compte pas) sur le total du module (« 6/82 »), la même règle que le bloc en tête de la page du module ([[ModulePage.tsx]], 23/11).
- Jeux : nombre de jeux trouvés sur le PC.
- Display : jeux qui ont des couleurs ou une résolution réglées sur le nombre de jeux (« 2/9 », `api.displayProfiles()`, relu en ouvrant Jeux ou Display) ; rien sans jeu.
- Mode jeu (`game_mode`) et RBW Mod (`rbw_mode`) : « on » si leur dernier passage a réussi en variante « Activé », sinon « off » (comme leur page, 23/11).
- Réseau, Minecraft, Souris, Outils, Analyse, Restaurer : rien.
Plus de cadenas, de badge « Nouveau » ni de bouton Discord dans la barre (absents de la maquette).

## Pied
Carte de mise à jour ([[UpdateCard.tsx]]) ; carte « This PC » : « N tweaks on » et « last check 2 days ago » (dernière [[Analyse du PC]]), « nothing applied yet » à 0, « no check yet » sans analyse ; Paramètres ; « Every millisecond counts. ». La liste défile quand la fenêtre est trop basse.
