---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-13
---
# Questions ouvertes

Ce que le vault ne sait pas encore. **Retirer chaque question dès que Sofiene y répond**, et mettre à jour les notes concernées ([[Mettre à jour le vault]]). Voir [[Décisions]] et [[État actuel]].

**Où Sofiene répond** : la page « Questions du vault Rago » (https://claude.ai/artifact/1mqjZuFNVqGT5JhBmG6HPk). Règle du 01/11 : **dès qu'un Claude a une question, il l'ajoute lui-même sur cette page, sans attendre ni demander dans le fil** (« désormais tu devras le faire automatiquement »).

Mode d'emploi (outil ArtifactData, collection `questions`) :
- **Poser** : créer un document `qNN` (numéro suivant) avec `num`, `titre`, `question`, `contexte` (ce qu'on sait, en une phrase), `choix` (2 à 4 réponses courtes ; « Je ne sais pas » est ajouté par la page), `precision` (facultatif, texte d'aide du champ libre), `statut: "ouverte"`, `reponse: {choix: null, texte: ""}`. Une question = un sujet, en mots simples.
- **Lire** : au début de chaque tâche, lister les questions `ouverte` qui ont une réponse (`reponse.choix` ou `reponse.texte`).
- **Traiter** : mettre le vault à jour selon la réponse, puis passer la question en `statut: "traitée"` avec `traitement` (ce qui a été fait, en une phrase). Si la réponse demande une précision, réécrire `question` et `contexte`, vider `reponse` et laisser `ouverte`.
- Dire à Sofiene dans le fil, en une ligne, quand de nouvelles questions l'attendent.

## En attente de réponse sur la page
Posées le 13/11 (option Rago Route à 3 $/mois, [[Offres et prix]]) :
- q108 : le Lifetime paie-t-il aussi l'option ?

Au 10/11, après les réponses de Sofiene du jour (q36 à q68 traitées, q46 le 10/11 à 15 h, voir [[Décisions]]) :
- q65 : réglages Railway de prod (Wait for CI, Watch Paths, Healthcheck, moniteur) ; Sofiene demande à Claude de vérifier et de le lui rappeler ([[Railway]]).

Posées le 10/11 au soir (q70 à q93), après la relecture complète du code pour le vault détaillé (dossier `Code/`) :
- q70 : l'exe de test et le vrai exe partagent la même licence sur un PC ([[license.rs]]).
- q73 : 4 réglages de carte graphique jamais grisés ([[meta.py]]).
- q74 : provenance et licence de NVIDIA Profile Inspector ([[Configuration Tauri]]).
- q75 : 73 ou 68 réglages gratuits affichés ; `FREE_TWEAKS` sur Railway ([[sync_tweaks.py]], [[config.js]]).
- q76 : image de partage du site à « 199 tweaks » ([[export-logo.js]]).
- q77 : étoiles Google des avis perdues (RAG-33, [[page.html]]).
- q79 : retirer la protection d'avant lancement ([[launch-gate.js]]).
- q80 : GitHub Pages publie le vault ([[Fichiers de la racine du dépôt]]).
- q81 : supprimer les branches `claude/project-thread-tzbch5` et `trailer-4k-footage` ([[Branches du dépôt]]).
- q82 : supprimer les fichiers qui ne servent plus ([[recherche-conversion (site)]], [[fix_free_bat.py]], [[LicenseGate.tsx]]…).
- q83 : textes en retard dans le code (README, `FREE_TWEAKS`, commentaires).
- q84 : l'e-mail d'achat renvoie vers un ticket Discord même avec le bot ([[mailer.js]]).
- q85 : un jeu retiré de la bibliothèque ne peut plus être réaffiché ([[Games.tsx]]).
- q86 : PR #71 (bot communauté en prod) ouverte depuis le 01/11 ([[Bot communauté Discord]]).
- q87 : code de la pop-up promo recréé en live ? ([[Promotions et affiliation]]).
- q88 : à quoi sert la vidéo [[Logo création d'Adam]].
- q89 : copie des exe 1.1.10 avant le 08/01/2027 ([[Synthèse de reprise du 15-10]]).
- q90 : phrase fausse dans les messages de démarchage ([[Partenaires et créateurs]]).
- q91 : Cloudflare Web Analytics installé ? ([[Fils du projet]]).
- q92 : une idée de l'[[Étude de marché de novembre 2026]] est-elle prévue ?
- q93 : passer en « Canceled » les 5 tâches d'Abel dans [[Linear]] ?

Posées le 11/11 (q78 traitée le même jour : Sofiene a demandé la page de vente, voir [[Page de vente Rago Route]]) :
- q94 : [[Graphismes des jeux]] gratuits pour tous ou Premium ? (le code les laisse gratuits)
- q96 : [[Page Souris]] gratuite pour tous ? (codée gratuite ; le réglage « Souris 1:1 » reste Premium)
- q97 : d'autres sorties que Paris, pour que la page Rago Route les annonce ? ([[Page de vente Rago Route]], [[Infrastructure Rago Route]]).
- q98 : `CERVEAU_GITHUB_TOKEN` mis dans Railway, et dans quels environnements ? ([[Cerveau du vault]], [[Variables d'environnement]]).
- q99 : avant d'annoncer Rago Route, test P0-9 (3 à 5 comptes de l'équipe par Paris en même temps, puis une semaine normale), message à Hypixel, ou les deux ? La réponse de la FAQ sur les blocages reste cachée en attendant ([[Page de vente Rago Route]], [[Proxy]]).
- q100 : à la sortie de la 1.3.0, le bouton « Get notified on Discord » de l'encart Rago Route de l'accueil devient « Try 3 days free », disparaît ou reste ? ([[page.html]])
- q101 : Lifetime inclut-il Rago Route ? Le serveur le donne aujourd'hui à toute licence active ; la page cache « Lifetime includes Rago Route too » en attendant ([[route.html]], [[Paiements Stripe]]).
- q102 : résilier l'essai depuis le site en 2 clics (lien direct vers la résiliation du portail Stripe, en fin de période), ou écrire « two clicks in the app, or anytime from your account » sur les deux pages ? ([[route.html]], [[page.html]], [[Abonnement dans l'app]])
- q103 : un abonné Premium non connecté au site peut payer un 2e abonnement, essai compris : le bloquer côté serveur (même e-mail ou même carte), ou la ligne « Already Premium? » de la page suffit ? (lu dans le code, pas vérifié sur staging ; [[Paiements Stripe]])
- q104 : « Card required » ou « Card or PayPal required » sous les boutons d'essai ? PayPal sur le paiement de l'essai pas encore vu ; avec PayPal, « un essai par personne » ne compare que l'e-mail ([[Paiements Stripe]], [[route.html]]).
- q105 : garder le titre « Lose packets, not fights. » de la page Rago Route (il frôle la règle « jamais de hitreg promis »), ou prendre « Lost packets shouldn't freeze your game. » ? ([[route.html]], [[Page de vente Rago Route]])
- q106 : clips de gameplay du haut de la page : 40 % de pertes sur toute la connexion dans les deux clips (conseillé), ou sur la route directe seulement avec une légende qui le dit ? Et avec quel compte enregistrer ? ([[Page de vente Rago Route]])

## À vérifier (sans Sofiene)
- Rago Route : tous les joueurs sortent par la même adresse à Paris ; Hypixel coupe déjà les connexions venant de Frankfurt (09/11, sans effet tant que Frankfurt n'est qu'un relais). À surveiller dès les premiers joueurs ([[Proxy]], [[Page de vente Rago Route]]).
- Concurrents, lus le 11/11 sans navigateur : prix d'ExitLag sur son propre site (seuls ceux de l'App Store, États-Unis, ont été lus : 9,99 $ par mois, 75 $ par an) ; durée de l'essai (24 h ou 7 jours), prix et remboursement de NoPing (chiffres de tiers) ; durée de l'essai WTFast (3 jours dans l'aide, une semaine payante sur l'accueil). À revoir dans un navigateur avant d'en citer un ; la page ne nomme aucun concurrent ([[Page de vente Rago Route]], [[Étude - Outils réseau et ping]]).
- [[Couleurs et résolution]] (11/11, jamais testé sur Windows) : saturation NVIDIA (NVAPI) et AMD (ADL), rampe gamma, retour des couleurs au Alt+Tab, résolution étirée (`DMDFO_STRETCH`) et retour à la fin de la partie, écriture des fichiers de Valorant, Fortnite et CS2 ; comportement avec le HDR de Windows.
- Valorant en 4:3 étiré (1440×1080) : les sources lues le 11/11 ne confirment pas que le jeu remplit l'écran sans réglage de plus ; à vérifier en jeu ([[Couleurs et résolution]]).
- CS2 : valeurs de `setting.aspectratiomode` dans `cs2_video.txt` (0 = 4:3 ou 5:4, 1 = 16:9, 2 = 16:10, d'après la doc de la communauté) à confirmer dans un vrai fichier ([[Couleurs et résolution]]).
- `app/src/data/pros.json` : quelques saturations de pros CS2 viennent de pages lues en résumé (prosettings.net coupé) ; à relire page par page avant la sortie ([[Couleurs et résolution]]).
- Les 1.2.0 installées reçoivent-elles bien la 1.2.1 ? Le serveur la propose à 100 % (vérifié le 11/11 sur `/api/v1/update/status`) ; reste à le voir sur un PC en 1.2.0 ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- La clé de mise à jour Tauri est-elle sauvegardée hors du PC ? ([[Clés et secrets]])
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison) : voir [[Conformité juridique]].
- Barre en jeu pendant une partie par Rago Route : pas de ping affiché, le jeu étant connecté à `127.0.0.1` (déduit du code, [[gameping.rs]]) ; à voir sur Windows.
