---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-11
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
Au 10/11, après les réponses de Sofiene du jour (q36 à q68 traitées, q46 le 10/11 à 15 h, voir [[Décisions]]) :
- q65 : réglages Railway de prod (Wait for CI, Watch Paths, Healthcheck, moniteur) ; Sofiene demande à Claude de vérifier et de le lui rappeler ([[Railway]]).

Posées le 10/11 au soir (q70 à q93), après la relecture complète du code pour le vault détaillé (dossier `Code/`) :
- q70 : l'exe de test et le vrai exe partagent la même licence sur un PC ([[license.rs]]).
- q71 : le Mode jeu total coupe 4 services lus par le vérificateur de Ranked Bedwars ([[boost.rs]], [[RBW Mod]]).
- q72 : services pas relancés si l'app se ferme pendant le Mode jeu total ([[boost.rs]]).
- q73 : 4 réglages de carte graphique jamais grisés ([[meta.py]]).
- q74 : provenance et licence de NVIDIA Profile Inspector ([[Configuration Tauri]]).
- q75 : 73 ou 68 réglages gratuits affichés ; `FREE_TWEAKS` sur Railway ([[sync_tweaks.py]], [[config.js]]).
- q76 : image de partage du site à « 199 tweaks » ([[export-logo.js]]).
- q77 : étoiles Google des avis perdues (RAG-33, [[page.html]]).
- q78 : textes d'attente de la page Rago Route du site ([[route.html]]).
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

Posées le 11/11 :
- q94 : [[Graphismes des jeux]] gratuits pour tous ou Premium ? (le code les laisse gratuits)
- q96 : [[Idées souris]] : lesquelles faire, et gratuites ou Premium ?

## À vérifier (sans Sofiene)
- [[Couleurs et résolution]] (11/11, jamais testé sur Windows) : saturation NVIDIA (NVAPI) et AMD (ADL), rampe gamma, retour des couleurs au Alt+Tab, résolution étirée (`DMDFO_STRETCH`) et retour à la fin de la partie, écriture des fichiers de Valorant, Fortnite et CS2 ; comportement avec le HDR de Windows.
- Valorant en 4:3 étiré (1440×1080) : les sources lues le 11/11 ne confirment pas que le jeu remplit l'écran sans réglage de plus ; à vérifier en jeu ([[Couleurs et résolution]]).
- CS2 : valeurs de `setting.aspectratiomode` dans `cs2_video.txt` (0 = 4:3 ou 5:4, 1 = 16:9, 2 = 16:10, d'après la doc de la communauté) à confirmer dans un vrai fichier ([[Couleurs et résolution]]).
- `app/src/data/pros.json` : quelques saturations de pros CS2 viennent de pages lues en résumé (prosettings.net coupé) ; à relire page par page avant la sortie ([[Couleurs et résolution]]).
- Les 1.2.0 installées reçoivent-elles bien la 1.2.1 ? (`/api/v1/update/status`) ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- La clé de mise à jour Tauri est-elle sauvegardée hors du PC ? ([[Clés et secrets]])
- [[Rago OS]] : la tâche « Rago Optimizer » se lance-t-elle sans droits administrateur depuis Rago OS ? Sofiene a essayé l'exe de test le 07/11, sans le dire.
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison) : voir [[Conformité juridique]].
- Barre en jeu pendant une partie par Rago Route : pas de ping affiché, le jeu étant connecté à `127.0.0.1` (déduit du code, [[gameping.rs]]) ; à voir sur Windows.
- Pont [[Rago OS]] : la limite de 30 s annoncée n'est pas imposée par l'app ([[bridge.rs]]) ; voir avec le code de Rago OS.
- Retours de Sofiene sur l'exe test5 de [[Rago OS]] (touche Windows après une relance, widgets cachés en jeu) : à revoir sur Windows.
