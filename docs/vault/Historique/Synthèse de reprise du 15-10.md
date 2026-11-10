---
type: historique
tags: [historique, reprise, version]
source: /mnt/project-files/synthese/SYNTHESE_REPRISE.md
maj: 2026-11-10
---
# Synthèse de reprise du 15-10

Résumé du fichier `synthese/SYNTHESE_REPRISE.md` du dossier partagé ([[Sources]]). Claude l'a écrit le **15/10/2026** au début d'un nouveau projet Claude. Il avait lu le dossier de transfert `PROJECT_HANDOFF/`, sans rien modifier.

**Statut : document d'époque.** Il décrit le projet au 15/10. Presque tout a changé depuis : l'état actuel est dans [[État actuel]], les versions dans [[Historique des versions]]. Cette note sert seulement à savoir d'où on est reparti.

## Le projet au 15/10
- **L'app** : une app Windows (10 et 11, 64 bits) qui applique des réglages système pour les joueurs Minecraft PvP. Elle remplace l'ancien `.bat` « Rago Hub » vendu sur Discord.
- **L'offre** : 9 réglages gratuits, et le Premium par abonnement Stripe (5,99 $/mois ou 29,99 $/an), 1 PC par licence.
- **Trois briques en prod** :
  - l'app (Tauri, React, Rust ; exe déposé à la main dans Supabase) ;
  - le [[Site]] de vente (Netlify) ;
  - le [[Serveur de licences]] (Node sur Railway, Postgres Supabase, Stripe, Resend).
- **Lancement public** : le 10/10.

## Ce que la synthèse a trouvé
- **Version de référence : la [[Version 1.1.10]]**, choisie par Sofiene le 15/10 à 16:37. Les [[Versions 1.1.11 à 1.1.13]] ont été mises de côté.
- **Le code de la 1.1.10 était à part** : un seul commit (`a11f230`), dans une PR en conflit. La branche de prod contenait la 1.1.12, sans le code de la 1.1.10. Publier depuis cette branche aurait retiré la [[Remise à zéro]] automatique.
- **Les correctifs des bugs des joueurs** étaient écrits sur des branches non retenues, jamais testés sur un vrai Windows.
- **[[Linear]]** était en retard sur tout cela.
- **Bugs graves de la 1.1.10 distribuée** ([[Historique des problèmes]]) :
  1. écran bleu 0x7E sous Windows 11 24H2 (RAG-67) ;
  2. aucun réglage appliqué si le dossier utilisateur contient `&`, `(`, `)`, `^` ou `@` ;
  3. nettoyages au mauvais endroit avec des noms de compte à caractères spéciaux (RAG-71) ;
  4. [[RBW Mod]] laisse des services arrêtés, avec un risque de ban en Ranked Bedwars (RAG-69) ;
  5. préréglage réseau 3 en échec et annulations destructrices (RAG-68, RAG-60).

## Les règles déjà en place au 15/10
Elles sont toujours en vigueur ([[Décisions]], [[Règles de travail]]) :
- rien sur GitHub ni dans l'app sans demande de Sofiene (13/10) ;
- staging d'abord, prod après sa validation (11/10) ;
- ne jamais changer la clé de signature des licences ([[Clés et secrets]]).

À l'époque, la synthèse fixait aussi d'autres règles :
- un seul fil pour les problèmes des joueurs ;
- la déconnexion et la désinstallation remettent tout à zéro (14/10) ;
- la prochaine version prend un numéro au-dessus de 1.1.10, mais ni 1.1.11, ni 1.1.12, ni 1.1.13, car ces numéros ont déjà servi deux fois chacun.

## Ce qu'elle proposait, et ce qui s'est passé
| Proposition du 15/10 | Suite |
|---|---|
| Partir de la 1.1.10 et n'ajouter que les correctifs urgents | Fait : [[Version 1.1.14]], en prod le 16/10 (base 1.1.10 et correctifs) |
| Numéro 1.1.14 plutôt que 1.2.0 | Fait (1.1.14), puis la [[Version 1.2.0]] |
| Sauvegarder les exe de la 1.1.10 (seule copie : des artefacts GitHub qui expirent le 08/01/2027) | Suite non connue (À VÉRIFIER) |
| Corriger la phrase fausse « the app measures ping before and after » dans les messages aux partenaires | Suite non connue (À VÉRIFIER) |
| Échéances marketing de la semaine (post RBW du 16/10, anciens acheteurs du `.bat`, bilan RAG-16, places RAGO50) | Voir [[Partenaires et créateurs]] et [[Promotions et affiliation]] ; RAG-16 abandonné le 01/11 |

## Limites écrites dans la synthèse
- Le dossier partagé de l'époque ne contenait que `PROJECT_HANDOFF/`. Les exe et les dossiers qu'il cite n'y étaient pas, et `PROJECT_HANDOFF/` n'est plus dans le dossier partagé actuel.
- Le site n'a pas pu être vérifié en direct : les chiffres viennent d'un audit fait le même jour.
