---
type: pilotage
tags: [pilotage]
maj: 2026-11-27
---
# Prochaines étapes

Liste priorisée au 01/11, mise à jour le 27/11. Rien ne se lance sans la demande de Sofiene ([[Règles de travail]]). Voir [[État actuel]] et [[Questions ouvertes]]. Chaque tâche a son ticket [[Linear]].

## Maintenant
1. **Passer sur le nouveau compte Claude** (Claude Team, 25/11) sans rien perdre : [[Reprendre sur un nouveau compte Claude]] (dossiers partagés à télécharger, page des questions, instructions du projet).
2. **Urgent, avant le 05/12** : clés sauvegardées par Sofiene (10-11/11) ; dépassement de quota Supabase : **Sofiene passe l'organisation en Pro (25 $/mois) le 01/12 ou le 02/12**, dès sa paye (décision du 27/11) ; vérifier ensuite que l'offre a bien changé ([[Supabase]], [[Clés et secrets]]).
3. **[[New Brand Rago]]** : Sofiene teste l'app [[Version 1.4.1]] (exe de test du 25/11), relit la PR #136 (accueil v6) ; puis les autres pages du site et les illustrations ; enfin la sortie de `staging` en prod en une fois, après sa validation.
4. **Suites de la sortie 1.3.0** (22/11) : prix live de Rago Route sur Railway `production` (À VÉRIFIER), mise à jour automatique vue sur un PC en 1.2.1, retours des joueurs ([[Version 1.3.0]], [[Problèmes joueurs]]).
5. **Stream Discord qui saccade** (13/11) : correctif prêt mais pas poussé, attend la décision de Sofiene (q109, [[Bugs et incidents]]).
6. **E-mail aux titulaires de compte sur la collecte des tests réseau** (Sofiene, 01/11 : « oui il faudrait les envoyer »), comme le promet la politique de confidentialité : texte à rédiger, puis à faire valider par Sofiene avant l'envoi (RAG-89, [[Test réseau]], [[Serveur de licences]]).
7. **Identité du vendeur** sur le site (mentions légales, CGV) : bloquant pour être en règle, voir [[Conformité juridique]].
8. **[[Proxy]]** (RAG-50) : serveurs Vultr Paris (sortie) et Frankfurt (relais). Prototype Rago Route testé en partie depuis le Mac de Sofiene (tunnel ~5 ms mieux que le direct au même moment, 07/11). Version du 07/11 installée et testée (médiane 116 ms par le tunnel contre 119 en direct sur la séance de 5 h ; sur les 79 pings pris au même moment pendant les 6 séances du 07/11 : 113 contre 119, tunnel plus lent 17 fois sur 79). Tests sur le Mac du 07/11 faits (câble seul, puis Wi-Fi + 4G de l'iPhone avec `--telephone`) : tunnel quelques ms mieux que le direct, aucune perte, 4G ≈ 70 Mo/h et jamais utile tant que le Wi-Fi tient. Test de coupure du Wi-Fi fait (07/11) : la connexion tient, mais la 4G monte à 1,2–1,5 s pendant la coupure ; à cause d'une mauvaise réception 4G ce jour-là (Sofiene). Version Windows dans l'app sur `staging` (moteur `route.rs` + onglet « Rago Route » de l'exe de test, 07/11) : essayée avec succès sur un PC Windows le 07/11 au soir (0 perte, retard du moteur 12 ms) ; reste une vraie partie avec ressenti. Accès Premium sur `staging` depuis le 08/11. Protocole 2 codé le 08/11 (chiffrement, paquets de secours, 4G sur Windows, choix de la sortie) : sur `staging` depuis le 08/11 au soir, Paris et Frankfurt réinstallés le 09/11 ; tests de Sofiene sur Windows en cours (double route, 4G du téléphone) ; variable `ROUTE_TESTERS` ajoutée sur Railway staging (10/11) ; puis serveur de licences en prod après sa validation (sinon les comptes de la prod n'auront pas de jeton). Ensuite : essayer la 4G du téléphone sur un vrai PC Windows, nouvelles sorties (à acheter par Sofiene), onglet visible hors de l'exe de test. Page de vente du site revenue le 11/11 à la version du matin, avec des emplacements pour de vrais clips de gameplay (sur `staging` depuis le 11/11, carte de choix de 15 h 29 : « Oui, pousse sur staging ») ([[Page de vente Rago Route]]) ; la regarder sur l'aperçu de staging, enregistrer les clips (sans et avec Rago Route, 40 % de pertes, protocole dans le dossier) et les brancher, puis annoncer la sortie après les tests P0-1 à P0-9 (P0-9, blocage de compte, en premier ; P0-5 = téléphone sur Windows) et les réponses à q99 à q106.

## Ensuite
- Choisir gratuit ou Premium pour les [[Graphismes des jeux]] (q94, gratuits dans la 1.3.0) et la [[Page Souris]] (q96, gratuite).
- [[Bot communauté Discord]] : le code est en prod depuis la 1.3.0 ; l'allumer (`DISCORD_COMMUNITY=1` sur Railway prod) quand Abel l'a testé (À VÉRIFIER).
- [[Client Minecraft Rago]] : deux projets à part (`Rago-Client`, `network-server-rago`), chacun avec son vault ; rien à faire ici sans demande.
- **Synapse** (version publique du Cerveau, 10/11) : dépôt `kaliso-dev/Synapse` créé et kit poussé ; Sofiene active Pages (Settings → Pages → Source : GitHub Actions) pour mettre la démo en ligne ([[Cerveau du vault]]).

## Plus tard
- Minutes GitHub Actions épuisées (10/11) : la cause est la CI du dépôt privé `network-server-rago` (≈ 27 min par push), pas `rago` (public, donc gratuit). Décision de Sofiene (10/11) : rendre `network-server-rago` public, à faire par lui dans Settings ; GitLab écarté (400 min gratuites) ([[CI GitHub Actions]]).
- Avant la signature de code (RAG-83) : décider de l'accord du joueur pour l'envoi du test réseau (q37).
- Signature de code de l'exe (RAG-83) : enlèverait l'avertissement SmartScreen et le blocage par Smart App Control ; prévue, quand il y aura le budget (01/11, voir [[App Windows]]).
- Note moyenne des avis dans Google (RAG-33) : le code du 17/10 a été perdu dans une fusion, il n'est plus sur le site (q77, [[page.html]]).
- Invitation Discord temporaire d'un serveur partenaire qui expirerait le 15/11 : à remplacer dans `site/src/partners.json` (À VÉRIFIER, [[Fils du projet]]).
