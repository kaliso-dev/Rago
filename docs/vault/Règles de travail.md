---
type: règle
tags: [règle]
maj: 2026-10-31
---
# Règles de travail

Règles décidées par Sofiene, toujours en vigueur au 31/10. Détail daté dans [[Décisions]]. Retour à [[Projet]].

1. **Rien sur GitHub ni dans l'app sans demande explicite** (13/10) : « Non annule tout ne créer plus rien pour l'app sans que je te le dise ». Préparer est permis ; publier, non.
2. **Staging d'abord, prod ensuite après validation de Sofiene** (11/10), pour l'app comme pour le site. Voir [[Branches et environnements]].
3. **« fusionne » / « push »** de Sofiene = accord pour fusionner la PR concernée. Sans ce mot, la PR reste ouverte.
4. **Un seul fil** pour les problèmes signalés par les joueurs, et tout noter dans [[Linear]] (13/10). Voir [[Problèmes joueurs]].
5. **Ne pas toucher à l'app quand Sofiene demande seulement une explication** (ex. 16/10 : « ne touche pas à l'app donne moi seulement la solution »).
6. **Aucun secret** dans le chat, Linear, un document, un commit ou une capture. Voir [[Clés et secrets]].
7. **Ne jamais affirmer une action sans preuve** (lien, sortie de commande, réponse HTTP). Contre-exemple : le 14/10, « la 1.1.12 contient tout le travail » était faux.
8. **Claude ne peut pas tester sur un vrai Windows** : chaque nouveauté Windows est marquée « jamais testé sur Windows » jusqu'au test de Sofiene.
9. **Numéro de version toujours supérieur** à tout exe déjà distribué (sinon l'installateur ne met pas à jour). Voir [[Publier une version]].
10. **Catalogue** : ne jamais éditer les JSON générés à la main ; régénérer (voir [[Catalogue des tweaks]]).
11. **Communication** : répondre en français simple ; questions auxquelles on répond d'un mot, avec une recommandation ; dire ce qui est vérifié et ce qui est déduit. Le public (site, app, Discord) est en anglais US ([[Voix et ton]]).
12. **Règle n°1 (31/10) : le vault correspond en tout point à l'état actuel du projet.** Le lire avant, détecter tout changement ou abandon pendant, le mettre à jour (ou supprimer ce qui n'est plus vrai) à la fin de chaque tâche, demander en cas de doute : [[Mettre à jour le vault]].

## PR et commits
- Commits : phrases en français qui décrivent l'effet.
- Description de PR en français : « Avant : », « Après : », « Comment : ».
- PR vers `staging` d'abord ; la prod suit par une PR « (prod) ».
