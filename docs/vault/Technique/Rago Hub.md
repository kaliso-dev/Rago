---
type: technique
tags: [technique, outil, claude]
maj: 2026-11-27
---
# Rago Hub

Outil de Sofiene, utilisé depuis le 26/11, qui lance et coordonne des fils Claude sur le projet : un **chef** (conversation principale) répartit le travail entre plusieurs **fils** (sessions Claude dans le cloud, ou « Sur le PC » sur l'ordinateur de quelqu'un). À ne pas confondre avec les anciens scripts `.bat` « Rago Hub » ([[Chronologie du projet]]) : l'app s'appelle toujours Rago Optimizer ([[Voix et ton]]). Retour à [[Projet]].

## Dans ce dépôt
| Fichier | Rôle |
|---|---|
| `.claude/settings.json` | branche `rago-hub-report.py` sur les événements `PostToolUse` et `Stop` de Claude Code |
| `.claude/hooks/rago-hub-report.py` | renvoie au Hub l'activité d'un fil (outil utilisé, texte en cours, images écrites), sa réponse finale et les tokens. Ne fait rien si `RAGO_HUB_URL` / `RAGO_HUB_TOKEN` ne sont pas définis ou si la session n'a pas été lancée par le Hub ; ne bloque jamais Claude |
| `.claude/hooks/hub.py` | commandes des fils : `fils`, `lire`, `envoyer`, `chef`, `memoire`, `retenir`, `fichiers`, `telecharger`, `donner`, `resolu` |

Arrivés par les PR #150 (hook de retour, 26/11), #151 (v2 : activité en direct, images, tokens) et #152 (v3 : tâches en direct, texte en cours, `hub.py`), fusionnées dans la branche de prod le 26/11 sans passer par `staging`, puis **recopiées telles quelles dans `staging` le 27/11** (q130, Sofiene : « tu peux également mettre le petit réglage claude dans staging », [[Décisions]]). `.claude/` est identique sur les deux branches : un fil parti de l'une ou de l'autre a le hook ([[Pull requests]], [[Branches et environnements]]). Une modification du hook suit la règle habituelle : `staging` d'abord, prod ensuite. Aucun secret dans ces fichiers : l'adresse et le jeton du Hub sont des variables d'environnement de la session ([[Clés et secrets]]).

## Questions à Sofiene
Depuis le 27/11, les questions du vault se posent à Sofiene dans le chat du Rago Hub, par le chef, et sont écrites dans [[Questions ouvertes]] ([[Décisions]]).
