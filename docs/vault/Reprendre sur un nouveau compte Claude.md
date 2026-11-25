---
type: règle
tags: [règle, vault, reprise]
maj: 2026-11-25
---
# Reprendre sur un nouveau compte Claude

Le 25/11/2026, Sofiene passe sur un **abonnement Claude Team**, sur un nouveau compte : « je ne peux pas transférer la totalité des projets sur le nouveau compte donc notre vault va nous permettre de passer sur le nouveau compte ». Cette note dit ce qui suit le projet tout seul, ce qu'il faut emporter à la main, et comment un nouveau Claude reprend. Retour à [[Projet]].

## Ce qui suit tout seul (dans GitHub)
- **Le dépôt `kaliso-dev/rago`** : code de l'app, du serveur, du site et de Rago Route, et **ce vault** dans `docs/vault/`. La version qui fait foi est sur la branche **`staging`** ; la branche de prod est `claude/rago-monorepo-initial-eyj6pq` ([[Branches et environnements]]).
- Les autres dépôts de Sofiene : `kaliso-dev/Rago-Client` (client et launcher Minecraft, privé) et `kaliso-dev/network-server-rago` (serveur Minecraft), chacun avec son propre vault dans `docs/vault/` (créés le 25/11 par d'autres fils, voir [[Client Minecraft Rago]]) ; `kaliso-dev/RAGO-OS-` (vault lu par le [[Cerveau du vault]]) ; `kaliso-dev/Synapse` (version publique du Cerveau).
- Ce qui tourne en ligne ne dépend pas de Claude : Railway, Netlify, Supabase, Stripe, Resend, Vultr, Discord ([[Personnes et services]]).

## Ce qui ne suit pas : à emporter avant de quitter l'ancien compte
1. **Le dossier partagé du projet « Rago optimizer (suite) »** (`/mnt/project-files/`, liste et rôle de chaque dossier dans [[Sources]]). À télécharger, surtout :
   - `stream-discord/` : `stream-discord-correctif-complet.patch`, le correctif **jamais poussé** des saccades du stream Discord ([[Bugs et incidents]]) ;
   - `sortie-1.3.0/` : exe et `.sig` de la 1.3.0 (aussi dans Supabase), annonces Discord, GIF Rago Route ;
   - `marketing/` (vidéos et leurs sources), `etude-marche-2026-11/`, `support-clients/`, `souris/`, `conseils-jeu/`, `couleurs-resolution/`, `presets-graphiques/`, `cerveau/`, `synapse/`, `admin-refonte/` : captures et documents cités par les notes ;
   - **Pas emporté** : `refonte-design/` (3,6 Go, captures de l'ancien design avant la refonte). Sofiene, 25/11 : « je ne récupère pas refonte design parce que new brand rago c'est le dernier nouveau design que j'ai fait ». Il reste seulement sur l'ancien compte.
   - `vault-patches/`, `vault-patchs/`, `vault/` : déjà appliqués au vault (vérifié pour les patchs du 13 au 14/11 : leurs commits sont dans `staging`), à garder seulement comme archive.
2. **Le dossier partagé du projet « New Brand Rago »**, `rago-redesign/` : les 135 maquettes v5, le kit de marque et surtout **les scripts qui génèrent le CSS de l'app** (`rendus-v5/outils/`). Sans eux, les fichiers générés de `app/src/s5/` ne peuvent plus être refaits ([[New Brand Rago]], [[Maquettes v5 dans l'app (s5)]]). Le mettre dans le dépôt ou le télécharger : question q128 ([[Questions ouvertes]]).
3. **Les artefacts claude.ai** de l'ancien compte, qu'un autre compte ne pourra peut-être plus ouvrir :
   - la page **« Questions du vault Rago »** (https://claude.ai/artifact/1mqjZuFNVqGT5JhBmG6HPk), où Sofiene répond aux questions : la liste des questions ouvertes est recopiée dans [[Questions ouvertes]], et le texte complet des 61 questions ouvertes au 25/11 est exporté dans `docs/questions/questions-ouvertes-2026-11-25.md` (et `.json`, pour recréer la page) ; la recréer ou la partager avec le nouveau compte : question q129 ;
   - l'artefact « Charte Rago », l'artefact « revue des maquettes » (version 16) et ceux de l'étude de marché ([[Sources]]).
4. **Les fils Claude** : leur contenu utile est résumé dans [[Fils du projet]], [[Journal]] et [[Décisions]] ; les fils eux-mêmes restent sur l'ancien compte.
5. **La mémoire de Claude** est désactivée chez Sofiene : rien à transférer, tout est dans ce vault.

## Remettre en place sur le nouveau compte
1. Créer le projet et y relier le dépôt `kaliso-dev/rago` (et les autres dépôts si besoin) ; reconnecter GitHub au compte `kaliso-dev` et installer l'app GitHub de Claude sur les dépôts.
2. Coller les **instructions du projet** (texte de Sofiene, recopié ci-dessous).
3. Reconnecter les connecteurs qui servent au projet : GitHub, Railway, Netlify, Stripe (lecture des ventes), Supabase, Linear, Resend, Firecrawl (lecture de sites), Kling (vidéos). Aucun secret n'est dans ce vault : les clés restent dans Railway, Netlify et GitHub ([[Clés et secrets]], [[Variables d'environnement]]).
4. Déposer dans le dossier du nouveau projet ce qui a été emporté (étape précédente), sous les mêmes noms de dossiers, pour que les chemins cités par les notes restent justes.
5. Premier fil : demander au nouveau Claude de lire le vault (ci-dessous) et de dire ce qui ne correspond plus.

## Instructions du projet (à recopier)
Texte des instructions du projet « Rago optimizer (suite) » au 25/11 :

> Base de connaissance du projet : le vault Obsidian dans `docs/vault/` du repo kaliso-dev/rago. C'est la source de vérité.
>
> 1. Avant toute tâche, lis `docs/vault/Projet.md` et `docs/vault/État actuel.md`, puis les notes du sujet.
> 2. Pendant et à la fin de chaque tâche, détecte tout ce qui a changé : feature ajoutée, modifiée, abandonnée, décision, prix, version, fonctionnement. Mets à jour le vault en conséquence en suivant `docs/vault/Mettre à jour le vault.md`.
> 3. Le vault doit correspondre exactement à l'état actuel du projet, en tout point. Supprime ou corrige toute info obsolète, et indique clairement ce qui est abandonné. Ne laisse jamais une info fausse ou périmée.
> 4. Si une info est incertaine (fait, prévu ou arrêté ?), pose la question à Sofiene au lieu de deviner.
> 5. Aucun secret (clés, mots de passe, tokens) dans le vault.
>
> Économie de tokens. La qualité du code et du design passe toujours avant l'économie.
>
> 6. Contexte : cherche (grep, plan du fichier) avant de lire, puis lis seulement les passages utiles. Ne relis pas ce qui est déjà dans le contexte. Dans le vault, lis Projet.md, État actuel.md et les notes du sujet, rien d'autre.
> 7. Commandes : filtre et limite les sorties (tail, grep, mode silencieux). Ne charge jamais de logs, lockfiles, dossiers générés ou gros JSON en entier. Regroupe les appels indépendants.
> 8. Exécution : avance directement si la demande est claire. Si une ambiguïté change le résultat, pose une seule question groupée avant de coder. Pas de sous-agents ni de recherche approfondie sans demande de ma part. Après deux échecs de la même approche, cherche la cause au lieu de réessayer.
> 9. Modifications : édite de façon ciblée, ne réécris pas un fichier entier pour un petit changement. Réutilise les composants, conventions et styles existants. Pas de refactor, d'option ou de document non demandé.
> 10. Qualité, jamais réduite : comprends le code concerné avant de le modifier, traite les cas limites et les erreurs, lance les tests, le typage et le build utiles. Pour le design, respecte la charte, soigne les états, le responsive et l'accessibilité, puis vérifie le rendu par captures mobile et ordinateur. Corrige ce que tu vois, sans refaire de captures inutiles.
> 11. Réponses : résultat d'abord, en phrases courtes. Pas d'intro, de récit des étapes ni de code recopié dans le chat. Signale toujours ce qui est non testé, risqué ou à faire de mon côté.

Le fichier `CLAUDE.md` à la racine du dépôt répète la règle n°1 et les règles fixes (rien sur GitHub ni dans l'app sans demande, staging d'abord, aucun secret, ne jamais changer les clés de signature) : il suit avec le dépôt.

## Ordre de lecture pour un nouveau Claude
[[Projet]] → [[État actuel]] → [[Règles de travail]] → [[Mettre à jour le vault]] → [[Questions ouvertes]] → les notes du sujet. Pour coder : [[Reprendre le développement]]. Pour la refonte : [[New Brand Rago]].
