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

Arrivés par les PR #150 (hook de retour, 26/11), #151 (v2 : activité en direct, images, tokens) et #152 (v3 : tâches en direct, texte en cours, `hub.py`), **fusionnées directement dans la branche de prod** le 26/11, sans passer par `staging` ([[Pull requests]], [[Branches et environnements]]). Ces fichiers **ne sont pas dans `staging`** : un fil parti de `staging` n'a pas le hook (le 27/11, un fil a dû recopier les fichiers de la prod, sans les committer, pour que le hook marche). Voulu ou oubli : À VÉRIFIER (q130, [[Questions ouvertes]]). Aucun secret dans ces fichiers : l'adresse et le jeton du Hub sont des variables d'environnement de la session ([[Clés et secrets]]).

## Questions à Sofiene
Depuis le 27/11, les questions du vault se posent à Sofiene dans le chat du Rago Hub, par le chef, et sont écrites dans [[Questions ouvertes]] ([[Décisions]]).
