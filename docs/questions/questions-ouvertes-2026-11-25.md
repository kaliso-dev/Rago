# Questions du vault Rago, ouvertes au 25/11/2026

Copie des 61 questions en attente sur la page « Questions du vault Rago » (https://claude.ai/artifact/1mqjZuFNVqGT5JhBmG6HPk), pour le passage sur le nouveau compte Claude. Même contenu en JSON : `questions-ouvertes-2026-11-25.json` (pour recréer la page). La note `docs/vault/Questions ouvertes.md` dit à quelle note se rapporte chaque question. q122 à q127 concernent le serveur Minecraft.

## q73. 4 réglages de carte graphique jamais grisés

4 réglages de carte graphique (nv_preemption, nv_advanced, nv_kboost pour NVIDIA, amd_advanced pour AMD) restent cliquables sur un PC qui n'a pas cette carte. On les grise comme les autres ?

*Contexte :* Les autres réglages de carte graphique ont une condition (requires) dans meta.py, pas ces 4 (lu le 10/11). Sur une autre carte, ils ne font rien ou échouent.

Choix : Oui, les griser · Non, c'est voulu · Je ne sais pas

## q74. NVIDIA Profile Inspector livré avec l'app

L'app livre une version modifiée de NVIDIA Profile Inspector (« Modified by DeadManWalking », version 3.5.0.0). Tu sais d'où elle vient et si on a le droit de la distribuer ?

*Contexte :* Dans le dépôt depuis la 1.1.5 (07/10). Sa licence n'est écrite nulle part dans le projet.

Choix : Je sais d'où elle vient (préciser) · Il faut vérifier sa licence · Je ne sais pas

## q75. Nombre de réglages gratuits affiché

Quel nombre de réglages gratuits afficher partout : 73 (la liste free.json) ou 68 (les réglages en double comptés une fois, comme les 218 du total) ?

*Contexte :* Au 10/11 : l'accueil du site et l'app disent 73, la page Tweaks du site dit 68, la page compte du serveur dit 11 (FREE_TWEAKS par défaut ; sa valeur sur Railway n'est pas connue).

Choix : 73 · 68 · Je ne sais pas

## q76. Image de partage du site : « 199 tweaks »

L'image qui s'affiche quand on colle le lien du site (Discord, réseaux) dit encore « 199 tweaks ». On la refait avec quel chiffre ?

*Contexte :* Image du 09/10 (og-image.png). Le site dit « Nearly 220 tweaks », le catalogue en a 218.

Choix : 218 tweaks · Nearly 220 tweaks · Je ne sais pas

## q77. Étoiles Google des avis

Les étoiles Google (la note des avis dans les résultats de recherche) ajoutées le 17/10 ont disparu du site, sans doute dans une fusion. On les remet ?

*Contexte :* Code ajouté le 17/10 (RAG-33, à partir de 10 avis), absent de staging et de la prod le 10/11.

Choix : Oui, les remettre · Non · Je ne sais pas

## q79. Protection d'avant le lancement du site

La protection d'avant le lancement du site (launch-gate, qui ne bloque plus rien depuis le 10/10) tourne encore à chaque visite. On la retire ?

*Contexte :* Elle coûte un appel Netlify par visite. La retirer touche aussi le serveur (rago_preview) et la politique de confidentialité.

Choix : Oui, la retirer · Non, la garder · Je ne sais pas

## q80. GitHub Pages publie le vault

GitHub Pages est toujours actif et publie le vault de la branche de prod sur une adresse github.io. Tu peux le couper (GitHub, Settings, Pages) ?

*Contexte :* Vu le 10/11 : une note du vault et CLAUDE.md y répondent. Le README demande déjà de couper Pages. Claude ne peut pas changer ce réglage.

Choix : Oui, je le coupe · Non, on laisse · Je ne sais pas

## q81. Deux branches à supprimer

Les branches claude/project-thread-tzbch5 (2 commits du vault sur Supabase, jamais proposés) et trailer-4k-footage (17 rushes vidéo) peuvent-elles être supprimées ?

*Contexte :* tzbch5 semble dépassée par les notes suivantes ; trailer-4k-footage était un transfert temporaire. Supprimer une branche est définitif.

Choix : Oui, les deux · Seulement tzbch5 · Non, garde-les · Je ne sais pas

## q82. Fichiers qui ne servent plus

On supprime ce qui ne sert plus : site/recherche-conversion.md, app/tools/fix_free_bat.py, l'ancien workflow app/ci/build-windows.yml, le Dockerfile de la racine, la dépendance npm geist et le mode plein écran de LicenseGate ?

*Contexte :* Rien de tout ça n'est utilisé dans staging (lu le 10/11). Rien n'est supprimé sans ton accord.

Choix : Oui, tout · Une partie (préciser) · Non, on garde · Je ne sais pas

## q83. Textes en retard dans le code

Je corrige les textes en retard : README de l'app et du serveur (« 11 réglages gratuits »), FREE_TWEAKS par défaut à 11, et des commentaires qui disent « exe de test » ou « Premium » pour ce qui a changé ?

*Contexte :* Relevés le 10/11 dans staging. Ça ne change rien pour les joueurs, sauf FREE_TWEAKS qui s'affiche sur la page compte.

Choix : Oui, corrige-les · Non · Je ne sais pas

## q84. E-mail d'achat et rôle Discord

L'e-mail d'achat dit toujours d'ouvrir un ticket Discord pour avoir le rôle Pro, alors que le bot le donne tout seul avec « Link Discord » sur la page compte. On change le texte ?

*Contexte :* Lu dans mailer.js le 10/11.

Choix : Oui, renvoyer vers Link Discord · Non, garder le ticket · Je ne sais pas

## q85. Réafficher un jeu retiré de la bibliothèque

Dans la bibliothèque de jeux, un jeu retiré ne peut plus être réaffiché : la commande existe mais aucun bouton ne l'appelle. On ajoute un bouton ?

*Contexte :* Lu dans Games.tsx et api.ts le 10/11 (games_unhide jamais appelé).

Choix : Oui, ajouter le bouton · Non, c'est voulu · Je ne sais pas

## q86. PR #71 : bot communauté Discord en prod

La PR #71 (bot communauté Discord vers la prod) est ouverte depuis le 01/11. Abel a-t-il fait le test prévu, et que fait-on de la PR ?

*Contexte :* Ta réponse du 01/11 : le tester et le passer en prod. Tant que DISCORD_COMMUNITY=1 n'est pas sur Railway prod, la fusionner ne change rien.

Choix : Test fait, on la fusionne · Pas encore testé · La fermer · Je ne sais pas

## q87. Code de la pop-up promo en live

As-tu recréé le code de la pop-up promo dans le Stripe live ? Le 17/10, il n'existait qu'en mode test, donc la pop-up ne marchait pas en prod.

*Contexte :* Commande donnée le 17/10 : npm run admin -- popup <CODE> 50. La suite n'est écrite nulle part.

Choix : Oui, c'est fait · Non · La pop-up ne sert plus · Je ne sais pas

## q88. Vidéo du logo « Création d'Adam »

La vidéo du logo du 02/11 (le R entre les mains de « La Création d'Adam ») devait servir à quoi, et a-t-elle été utilisée ?

*Contexte :* Les fichiers sont dans le dossier partagé (marketing/logo-creation-adam). Rien dans le vault ne dit à quoi elle sert.

Choix : Utilisée (préciser où) · Pas encore utilisée · Abandonnée · Je ne sais pas

## q89. Copie des exe 1.1.10

As-tu gardé une copie des exe de la 1.1.10 ? La seule copie connue est dans des artefacts GitHub qui seront effacés le 08/01/2027.

*Contexte :* Proposé le 15/10 dans la synthèse de reprise ; la suite n'est pas connue.

Choix : Oui, j'ai une copie · Non, il faut la faire · Pas besoin · Je ne sais pas

## q90. Messages de démarchage des partenaires

Les messages de démarchage des partenaires disaient « the app measures ping before and after », ce qui est faux. Ils ont été corrigés, ou ne servent plus ?

*Contexte :* Relevé le 15/10. Les messages ne sont pas dans le dépôt ; le vault ne sait pas s'ils ont été corrigés.

Choix : Corrigés · Ne servent plus · Pas encore corrigés · Je ne sais pas

## q91. Statistiques de visite du site

Cloudflare Web Analytics (statistiques de visite du site) avait été proposé. L'as-tu installé, ou utilises-tu autre chose ?

*Contexte :* Proposé dans un fil d'octobre, resté sans suite dans le vault.

Choix : Installé · Autre outil (préciser) · Rien pour l'instant · Je ne sais pas

## q92. Idées de l'étude de marché

Parmi les idées de l'étude de marché de novembre (codes cadeaux, pass 1 an, page pour les parents, presets par jeu, page « Mes changements »…), une est-elle prévue ?

*Contexte :* Aucune n'est notée comme prévue ou abandonnée dans le vault (Étude de marché de novembre 2026).

Choix : Aucune pour l'instant · Oui (préciser lesquelles) · Je ne sais pas

## q93. Les 5 tâches d'Abel dans Linear

Ton « il faut supprimer tout ça » (q64) vise aussi les 5 tâches d'Abel dans Linear ? Je les passe en « Canceled » ?

*Contexte :* Lu dans Linear le 10/11 : RAG-35 (créateurs Minecraft) et RAG-39 (vidéos avant/après) sont « In Progress », RAG-51 (GIVEAWAY), RAG-54 (partner discord) et RAG-56 (YOUTUBE) sont « Todo », aucune touchée depuis le 11/10.

Choix : Oui, annule-les · Non, Abel les garde · Je ne sais pas

## q94. Graphismes des jeux : gratuit ou Premium

La nouvelle carte « Graphismes du jeu » (Performance, Équilibré ou Qualité en un clic pour Valorant, Fortnite, CS2, Apex, Marvel Rivals et The Finals) est-elle gratuite pour tous, ou réservée au Premium ?

*Contexte :* Codée le 11/11 sur une branche à part, pas encore dans l'app ; pour l'instant le code la laisse gratuite, sans cadenas. Dans la page Jeux, « Optimiser et jouer » est déjà Premium.

Choix : Gratuite pour tous · Premium · Performance gratuit, le reste Premium · Je ne sais pas

## q96. Page Souris : gratuite ou Premium

La nouvelle page Souris (fréquence réelle, test de double clic, logiciels entre la souris et le jeu, calcul de sensibilité) est-elle gratuite pour tous ?

*Contexte :* Tu as demandé de l'ajouter à la version finale (« + mouse »). Elle est codée gratuite, sans cadenas, dans la PR #96 vers staging ; le réglage « Souris 1:1 » de la page Latence reste Premium.

Choix : Gratuite pour tous · Premium · Tests gratuits, sensibilité Premium · Je ne sais pas

## q97. Rago Route : d'autres sorties que Paris ?

La page de vente de Rago Route dit que la sortie est à Paris et que Rago Route n'est pas fait pour jouer depuis hors d'Europe. Des sorties dans d'autres régions sont-elles prévues, pour que la page les annonce ?

*Contexte :* Le vault parle de nouvelles sorties à acheter, sans lieu ni date. En attendant, la nouvelle page dit « Made for Europe, tested from France » et que, depuis l'Amérique du Nord, le détour n'aiderait pas.

Choix : Non, Paris seulement pour l'instant · Oui, bientôt (dis où) · Plus tard, sans date · Je ne sais pas

## q98. Jeton du Cerveau dans Railway

As-tu mis CERVEAU_GITHUB_TOKEN dans Railway, et dans quels environnements ?

*Contexte :* Le 11/11 tu as demandé quelle valeur mettre, puis dit « tout est bon ». Sans ce jeton, le Cerveau de l'admin s'arrêtera quand le dépôt passera en privé.

Choix : Oui, en prod et en staging · Seulement en prod · Pas encore · Je ne sais pas

## q99. Rago Route : Hypixel et l'adresse partagée

Avant d'annoncer Rago Route, on fait le test P0-9 (3 à 5 comptes de l'équipe qui jouent par Paris en même temps, puis une semaine normale), tu écris à Hypixel, ou les deux ?

*Contexte :* Hypixel bloque un compte quand son activité paraît inhabituelle. Avec Rago Route, tous les joueurs arrivent par la même adresse à Paris, et des joueurs racontent des blocages avec ExitLag. La réponse de la FAQ est prête et reste cachée tant que le test manque.

Choix : Les deux · Le test seulement · J'écris à Hypixel seulement · Ni l'un ni l'autre · Je ne sais pas

## q100. Accueil : le bouton « Get notified on Discord »

L'encart Rago Route de l'accueil garde le bouton « Get notified on Discord », qui date de l'attente. À la sortie de la 1.3.0, on le remplace par « Try 3 days free », on le retire, ou on le garde ?

*Contexte :* Le texte et le schéma de l'encart disent maintenant la même chose que la nouvelle page (branche du fil, pas encore sur staging). L'autre bouton, « Discover Rago Route », mène à la page.

Choix : Le remplacer par l'essai · Le retirer · Le garder · Je ne sais pas

## q101. Lifetime et Rago Route

Lifetime inclut-il Rago Route ? Aujourd'hui le serveur le donne aux comptes Lifetime, mais rien n'est décidé. La page de vente peut-elle l'écrire, même si un plan « Ultimate » arrive un jour ?

*Contexte :* En attendant, la nouvelle page cache « Lifetime includes Rago Route too » et « and Lifetime » (visibles seulement sur staging). Les CGV disent que Lifetime vaut Premium « for as long as Rago Optimizer Premium is offered ». Si c'est « Non », le serveur doit changer : il donne le jeton Rago Route à toute licence active.

Choix : Oui, tant que Rago Route est dans Premium · Oui, sans condition · Non, Rago Route reste aux abonnés · Je ne sais pas

## q102. Résilier l'essai depuis le site en 2 clics

Pour que « Cancel in two clicks from your account » soit vrai sur le site, on ajoute un lien qui ouvre directement la résiliation dans le portail Stripe, avec une résiliation en fin de période ? Sinon, les pages disent « two clicks in the app, or anytime from your account ».

*Contexte :* Dans l'app : 2 clics depuis Settings (Cancel trial, puis confirmer), et Premium reste jusqu'à la fin de l'essai. Sur le site : connexion, page compte, portail Stripe, annuler, confirmer, soit 3 clics ou plus ; le réglage du portail (fin de période ou tout de suite) n'est pas vérifié par le code. La nouvelle page Rago Route dit déjà « in the app, or anytime from your account » ; l'accueil dit encore « two clicks from your account ».

Choix : Oui, lien direct et fin de période · Non, on garde « in the app » · Je ne sais pas

## q103. Abonné non connecté : un 2e abonnement possible

Un abonné Premium qui n'est pas connecté au site peut payer un 2e abonnement, essai compris. On le bloque côté serveur après le paiement (même e-mail ou même carte), ou la ligne « Already Premium? » de la page suffit ?

*Contexte :* D'après l'analyse de l'offre du 11/11 (lecture du code, pas encore vérifié sur staging), le serveur ne l'empêche que si le joueur est connecté. Risque : un double prélèvement, donc un remboursement et un joueur mécontent. La nouvelle page ajoute sous le bouton d'essai : « Already Premium? Rago Route is already yours: update Rago Optimizer, then open Network, then Rago Route. »

Choix : Le bloquer côté serveur · La ligne sur la page suffit · Je ne sais pas

## q104. « Card required » alors que PayPal passe aussi

L'accueil et la page Rago Route disent « Card required » sous le bouton d'essai. Si le paiement de l'essai propose aussi PayPal, on écrit « Card or PayPal required » sur les deux pages ?

*Contexte :* Le code demande un moyen de paiement à l'essai (payment_method_collection: always) sans dire lequel : Stripe montre ceux qui sont activés dans le tableau de bord. Au 04/11, 8 paiements réussis sur 39 étaient en PayPal et 12 en Link (Link paie avec une carte). Je n'ai pas vérifié si PayPal apparaît sur le paiement de l'essai : à regarder sur un vrai paiement d'essai. À noter : « un essai par personne » compare l'e-mail et l'empreinte de la carte ; avec PayPal, seul l'e-mail compte.

Choix : Oui, « Card or PayPal required » · Non, on garde « Card required » · Je ne sais pas

## q105. Titre de la page Rago Route

La page reprend le titre du matin, « Lose packets, not fights. ». Il laisse entendre qu'on ne perd plus de combats, alors que la règle du site est de ne jamais promettre le hitreg. On le garde, ou on prend celui de la refonte, « Lost packets shouldn't freeze your game. » ?

*Contexte :* Tu as préféré la version du matin le 11/11 à 14 h 20, donc j'ai remis son titre. L'image de partage (media/og-route.png) a été refaite avec ce titre ; si tu changes, je la refais aussi.

Choix : On garde « Lose packets, not fights. » · On prend « Lost packets shouldn't freeze your game. » · Je ne sais pas

## q108. Option Rago Route pour les Lifetime

Un joueur Lifetime paie-t-il aussi l'option Rago Route à 3 $ par mois, ou Rago Route est-il compris dans le Lifetime ?

*Contexte :* Codé le 13/11 : tout Premium actif, Lifetime compris, doit prendre l'option à 3 $ par mois pour allumer Rago Route. La phrase du site sur le Lifetime reste cachée en prod (porte q101).

Choix : Le Lifetime paie aussi les 3 $ par mois · Rago Route compris dans le Lifetime · Je ne sais pas

## q109. Version des clients au stream Discord qui saccade

Les clients dont le stream Discord saccade ont-ils la 1.2.1 publique ou l'exe de test de staging ?

*Contexte :* La 1.2.1 force le jeu en priorité Haute seulement par les presets et le Packet Optimizer ; l'exe de test de staging le fait en plus pour chaque jeu, par défaut (« Jeu en priorité haute »).

Choix : La 1.2.1 publique · L'exe de test de staging · Les deux selon les clients · Je ne sais pas

## q110. Carte refusée à la fin de l'essai

Dans Stripe, quand la carte est refusée et que tous les nouveaux essais de paiement échouent, l'abonnement est-il annulé, marqué impayé, ou laissé « en retard » ?

*Contexte :* Tant que Stripe réessaie la carte (statut « en retard »), l'app garde le Premium et Rago Route. Si Stripe laisse l'abonnement « en retard » sans fin, le joueur garde tout sans payer. Le réglage est dans Stripe > Paramètres > Billing > Abonnements et e-mails > Gérer les paiements échoués.

Choix : Annuler l'abonnement · Marquer comme impayé · Laisser en retard · Je ne sais pas

## q111. Quantité dans le portail client

Je coupe le changement de quantité dans le portail client Stripe live ?

*Contexte :* « Changer de formule » dans le portail client live permet aussi de changer la quantité du Premium : un joueur pourrait payer 2 Premium pour une seule licence. Rago Route n'y est pas proposé, c'est voulu.

Choix : Oui, coupe-le · Non, laisse comme ça · Je ne sais pas

## q112. Fenêtre Premium du Packet Optimizer

Depuis la 1.3.0, la fenêtre Premium « Unlock all 218 tweaks » (petit titre « This tweak is part of Premium ») du Packet Optimizer ne s'ouvre presque plus. On la garde pour la refonte du design ?

*Contexte :* En gratuit, la page Packet Optimizer est verrouillée depuis la 1.3.0, et « Get Premium » ouvre la fenêtre Premium générale. Cette fenêtre-ci ne s'ouvre plus que si le serveur refuse d'appliquer pour un compte Premium (licence perdue entre-temps ; NetOpt.tsx:172 depuis la refonte du 23/11, PR #123, qui la garde en attendant ta réponse). Sa capture pour la refonte est faite sur ce cas, simulé dans la démo.

Choix : Oui, on la garde pour ce cas · Non, on montre la fenêtre Premium générale à la place · Je ne sais pas

## q113. Récompense Discord affichée comme récompense d'affiliation

Sur la page compte, une licence gagnée sur Discord affiche « Affiliate reward » dans la carte Clé de licence, mais « Discord reward » dans la carte Formule. Quel nom garde-t-on partout ?

*Contexte :* La carte Clé de licence écrit « Rago Optimizer Premium · Affiliate reward » pour toute récompense, sauf un cadeau de l'équipe (views.js:314-316). La carte Formule écrit « Discord reward » et « Earned by inviting players to the Rago Discord » (views.js:553-559), mais garde le lien « Open affiliate program ». Repéré pendant les captures pour la refonte.

Choix : « Discord reward » partout pour une récompense Discord · Laisser « Affiliate reward » dans la carte Clé de licence · Je ne sais pas

## q114. Abonnement terminé : pastille « Monthly » dans la carte Formule

Quand un abonnement est terminé, la carte Formule garde la pastille « Monthly » (ou « Yearly ») à côté de « Your subscription ended on… ». On met un badge « Ended » comme dans la carte Clé de licence ?

*Contexte :* La carte Clé de licence montre le badge gris « Ended ». La carte Formule garde la pastille du rythme de paiement : quand l'abonnement est terminé, seuls la phrase et les boutons changent (views.js:571-575). Repéré pendant les captures pour la refonte.

Choix : Oui, badge « Ended » aussi dans la carte Formule · Non, garder « Monthly » ou « Yearly » · Je ne sais pas

## q115. Achat de test : badge « Test purchase » et texte « revoked »

Une licence d'achat de test affiche le badge « Test purchase », mais le texte dit « This license was revoked. » On écrit un texte propre à l'achat de test ?

*Contexte :* Le badge vient de views.js:501. Les phrases (views.js:548, 559, 567 et 579) n'ont pas de cas pour l'achat de test et retombent sur « This license was revoked. ». Repéré pendant les captures pour la refonte.

Choix : Oui, un texte propre à l'achat de test · Non, « revoked » suffit · Je ne sais pas

## q116. Barre en jeu : échec du nettoyage de la RAM écrit en vert

Dans la barre en jeu, « Nettoyage impossible, réessaie » s'affiche en vert, comme un succès. On le passe en orange, comme les autres erreurs de la barre ?

*Contexte :* Overlay.tsx:147 met le message d'échec dans la même ligne verte que le succès (classe ov-cleaned, overlay.css:188). La page Outils l'affiche bien comme une erreur (Tools.tsx:143). Repéré pendant les captures pour la refonte.

Choix : Oui, en orange comme les erreurs · Non, laisser en vert · Je ne sais pas

## q117. Packet Optimizer en gratuit : écran verrouillé

Dans l'app refaite, le Packet Optimizer en gratuit montre le vrai écran, verrouillé : un clic sur un preset ou un curseur ouvre l'offre Premium, mais les 4 outils réseau et « restore » marchent. Avant, c'était un écran à part « The Packet Optimizer is part of Premium ». On garde cette version ?

*Contexte :* La maquette v5 n'a pas d'écran gratuit pour le Packet Optimizer, ni de « Diagnostic avancé » dans le test réseau : ses outils (stabilité, bufferbloat, MTU) sont maintenant dans la rangée « tools » du Packet Optimizer, gratuits comme avant, et « current state » devient gratuit aussi. Appliquer reste Premium (PR #123, dans staging depuis le 23/11).

Choix : Oui, on garde l'écran verrouillé avec les outils · Non, remettre l'écran « part of Premium » · Écran verrouillé, mais outils réservés au Premium · Je ne sais pas

## q118. Que devient la section « Three ways in » ?

Les cartes Rago Route sont maintenant au-dessus du globe, dans la section Rago Route. La section « Three ways in » (chercher un tweak, partir d'un preset, point de restauration) existe toujours, juste avant, avec son titre et ses trois cartes qui arrivent sur une courbe, mais sans globe. On la garde comme ça ?

*Contexte :* Tu as demandé de mettre les cartes Rago Route au-dessus du globe « à la place » des cartes actuelles, sans dire ce que devenaient ces trois démos. Je les ai laissées dans leur propre section, rien n'est perdu.

Choix : Oui, on la garde telle quelle · La supprimer, ces trois démos sont déjà ailleurs · La remettre dans la section Features, comme avant le 24/11 · Je ne sais pas

## q119. Les flux d'Asie s'arrêtent à la Sibérie

Le globe est cadré sur le haut de la Terre, l'Europe au centre. J'ai pu ajouter des flux depuis Novossibirsk, Iakoutsk (130° est, aussi loin que le Japon) et Astana, mais Tokyo, Pékin et Séoul sont trop au sud : ils sont de l'autre côté du globe dans ce cadrage. On garde comme ça ?

*Contexte :* Pour faire entrer l'Extrême-Orient, il faudrait soit faire pivoter le globe vers l'est (l'Europe partirait sur la gauche), soit le rapetisser pour montrer une bande plus profonde (il ne remplirait plus le bas de l'écran).

Choix : On garde : Sibérie et Asie centrale suffisent · Pivoter le globe vers l'est pour avoir la Chine et le Japon · Rapetisser le globe pour montrer plus de la Terre · Je ne sais pas

## q120. La capture du dashboard sur l'accueil date d'une ancienne version

L'aperçu du dashboard que je viens de mettre sur la première page du site est la capture faite pour le site v5. Elle affiche « 212 tweaks » alors que l'app en compte 218 aujourd'hui, et sa barre latérale n'a pas la ligne du plan gratuit. Tu m'envoies une capture à jour du dashboard ?

*Contexte :* C'est la seule capture du dashboard qu'on a dans le dépôt (2 880 × 1 800, faite le 22/11 pour le héros du site v5). En attendant, elle est en place sur l'accueil, réduite en 1 600 × 1 000.

Choix : Je t'envoie une capture à jour · Garde celle-là, le chiffre n'a pas d'importance · Refais-la toi-même depuis l'app · Je ne sais pas

## q121. La barre en jeu sort encore du jeu sans la 1.2.1 ?

Tu as vu la barre en jeu t'envoyer sur une autre page et ton jeu se fermer ou se réduire. Sur ton PC, la vraie 1.2.1 tournait en même temps que l'exe de test, et ses deux barres s'ouvrent sur Alt+X. Quand tu refais le test avec la 1.2.1 quittée (icône près de l'horloge, clic droit, Quitter), est-ce que ça arrive encore ?

*Contexte :* Je n'ai rien changé à la façon dont la barre prend le premier plan : la barre de la 1.2.1 ouverte en même temps est la cause la plus probable. Si ça arrive encore, il me faut le nom du jeu et son mode d'affichage (plein écran, fenêtré sans bordure).

Choix : Non, ça ne le fait plus · Oui, ça le fait encore · Pas encore retesté · Je ne sais pas

## q122. Qui est le compte qRago (Owner) ?

Dans le serveur Minecraft Rago Practice, le compte Minecraft qRago est l'Owner (le PNJ « [OWNER] qRago », les outils Owner, le skin de RagoBot) et kaliso_dev est le Dev. À qui est le compte qRago ?

*Contexte :* Le code et le suivi disent « le propriétaire » sans donner de nom. Le vault doit savoir qui joue sous quel compte.

Choix : C'est mon compte · C'est le compte d'Abel · C'est un compte partagé · Je ne sais pas

## q123. Sur quel PC tourne le serveur de test Minecraft ?

Le serveur de test de Rago Practice (dossier C:\Users\rgabe\Rago, versions installées par Claude après ton accord) tourne sur quel PC ?

*Contexte :* Le suivi parle de « ton PC » ; le vault doit le dire pour qu'un nouveau Claude sache où installer.

Choix : Mon PC Windows · Le PC d'Abel · Un autre PC · Je ne sais pas

## q124. Fermer la PR #48 (events) du serveur Minecraft ?

La PR #48 de network-server-rago (poudre rouge et annonce des events toutes les 20 s) est dépassée : la même chose est codée dans la PR #47. Je la ferme ?

*Contexte :* #48 partait de l'ancienne version des events ; #47 contient la version testée en CI le 22/11.

Choix : Oui, ferme-la · Non, laisse-la ouverte · Je ne sais pas

## q125. Et la PR #10 (CI sous Java 25) ?

La PR #10 de network-server-rago (vérifier aussi le serveur sous Java 25 en CI) est ouverte depuis le 11/11 et a 83 commits de retard. On la garde, on la refait sur la branche actuelle, ou on la ferme ?

*Contexte :* Le serveur de test démarre aujourd'hui sous Java 17 ; la CI teste Java 8 et 21.

Choix : La fermer · La refaire sur la branche actuelle · La laisser comme elle est · Je ne sais pas

## q126. Rago Practice et Rago Client : un seul projet ?

Le serveur Minecraft Rago Practice est-il un projet à part, ou une partie du projet Rago Client (le client Minecraft) ?

*Contexte :* Le vault de Rago Optimizer le note « À VÉRIFIER » depuis le 10/11. Le serveur n'exige pas Rago Client et a un PNJ « Rago Client » au lobby.

Choix : Un projet à part · Une partie de Rago Client · Les deux vont ensemble mais restent séparés · Je ne sais pas

## q127. L'adresse rago.gg du serveur Minecraft est-elle prise ?

Le jeu affiche l'adresse « rago.gg » (sidebar, Tab) et le suivi dit que le domaine est à acheter par toi. Quel domaine sera celui du serveur, et est-il acheté ?

*Contexte :* Le site attend aussi son domaine (RAGO_SITE_URL). Aucun site Netlify n'existe encore pour Rago Practice.

Choix : rago.gg, pas encore acheté · rago.gg, déjà acheté · Un autre domaine · Je ne sais pas

## q128. Dossier rago-redesign du projet New Brand Rago

Le dossier rago-redesign/ du projet New Brand Rago (maquettes v5, kit de marque, scripts qui génèrent le CSS de l'app) ne passera pas tout seul sur le nouveau compte Claude. Que fait-on ?

*Contexte :* Sans les scripts de rendus-v5/outils/, les fichiers générés de app/src/s5/ ne peuvent plus être refaits. Sa taille n'est pas connue de ce fil.

Choix : Le mettre dans le dépôt (sans les grosses images) · Je le télécharge et je le remets dans le nouveau projet · Les deux · Je ne sais pas

## q129. Page des questions sur le nouveau compte

Cette page « Questions du vault Rago » appartient à l'ancien compte Claude. Sur le nouveau compte, on la garde comment ?

*Contexte :* Les questions ouvertes sont recopiées dans la note Questions ouvertes du vault, donc rien n'est perdu. Mais un Claude du nouveau compte ne pourra peut-être pas écrire sur cette page.

Choix : La partager avec le nouveau compte et la garder · Un Claude du nouveau compte en recrée une avec les questions ouvertes · Plus de page : questions dans le fil et le vault seulement · Je ne sais pas

## q130. Document de pilotage du client

Le code et les PR de Rago Client citent un « document de pilotage » (identifiants D-14, D-42, D-55, B-06, N-20, M01...). Où est-il ?

*Contexte :* Il n'est pas dans le dépôt Rago-Client. Sans lui, le nouveau Claude ne connaîtra que les décisions recopiées dans le code.

Choix : Dans un fichier du projet Claude du client · Dans un Google Doc ou un autre outil · Il n'existe plus · Je ne sais pas

## q131. Comment le client sera distribué

Le launcher télécharge Rago depuis les releases GitHub, mais le dépôt Rago-Client est privé et aucune release n'est publiée (un brouillon v1.11.2). Comment veux-tu distribuer le client ?

*Contexte :* La PR #49 (ouverte) fait télécharger depuis ton propre hôte signé (dl.rago.gg), avec un domaine et un stockage R2 à prendre.

Choix : Hôte signé de la PR #49 · Releases GitHub, dépôt repassé en public · Pas encore décidé · Je ne sais pas

## q132. Base de données de Rago Network

Sur Render, as-tu mis la base Neon (DATABASE_URL) au service rago-network ?

*Contexte :* Le 25/11, le serveur répond mais compte 0 joueur. Sans base Neon, les points, coffres et cosmétiques gagnés sont perdus à chaque réveil du serveur.

Choix : Oui, elle est mise · Non, pas encore · Je ne sais pas, vérifie avec moi · Je ne sais pas

## q133. Clé Google de la traduction du chat

La clé Google Cloud Translation (GOOGLE_TRANSLATE_KEY) est-elle posée sur Render pour la traduction du chat ?

*Contexte :* Sans elle, la traduction (Ctrl + clic sur un message) répond « translate_off ».

Choix : Oui · Non, pas encore · Je ne veux plus de traduction · Je ne sais pas

## q134. Prix et boutique de Rago+

Rago+ (tous les cosmétiques et le R rose) existe dans le client et le serveur, mais il n'y a ni prix ni boutique : le bouton dit « bientôt ». Quel prix, et où l'acheter ?

*Contexte :* Aujourd'hui seul /rago plus (ton compte) peut le donner.

Choix : Pas encore décidé · Abonnement mensuel, prix à préciser · Avec le Premium de Rago Optimizer · Je ne sais pas

## q135. Date de lancement du client

Quand veux-tu lancer Rago Client au public ?

*Contexte :* Rien n'est publié ; 7 PR sont ouvertes ; le site vitrine (PR #24) n'est pas en ligne.

Choix : Pas de date encore · Ce mois-ci · Après la nouvelle marque · Je ne sais pas

## q136. Nouvelle marque pour le client

Le client (menus, launcher, site vitrine) doit-il passer au design de la nouvelle marque Rago (projet New Brand Rago) ?

*Contexte :* Il utilise aujourd'hui son propre look : verre dépoli, rouge #E43136, police Inter.

Choix : Oui, comme l'app et le site · Non, il garde son look · Plus tard · Je ne sais pas

## q137. Permission d'OptiFine

As-tu une permission écrite de l'auteur d'OptiFine (sp614x) pour livrer OptiFine dans Rago ?

*Contexte :* La licence d'OptiFine l'interdit sans son accord. Le 29/10 tu as dit qu'il était d'accord ; le vault doit savoir où est la preuve.

Choix : Oui, par e-mail · Oui, sur Discord · Non, pas par écrit · Je ne sais pas
