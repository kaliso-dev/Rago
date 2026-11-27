---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-27
---
# Questions ouvertes

Ce que le vault ne sait pas encore. **Retirer chaque question dès que Sofiene y répond**, et mettre à jour les notes concernées ([[Mettre à jour le vault]]). Voir [[Décisions]] et [[État actuel]].

**Où Sofiene répond** (décision du 27/11, réponse à q129 : « ok continuons comme ça ») : dans le **chat du Rago Hub**. La page artefact « Questions du vault Rago » de l'ancien compte est abandonnée ([[Décisions]]). Règle du 01/11, toujours valable : **dès qu'un Claude a une question, il la pose lui-même, sans attendre** (« désormais tu devras le faire automatiquement »).

Mode d'emploi :
- **Poser** : ajouter la question ici, avec le numéro suivant (`qNN`), une ligne : la question en mots simples et la note concernée ; écrire « À VÉRIFIER » dans la note en attendant ; puis la transmettre à Sofiene par le chef de projet du Rago Hub (commande `chef` de `.claude/hooks/hub.py`), en une ligne.
- **Traiter** : dès que Sofiene répond, mettre le vault à jour selon la réponse ([[Décisions]] si c'est une décision) et **retirer** la question de cette note.
- Les 61 questions ouvertes au 25/11 sont aussi exportées en entier dans `docs/questions/questions-ouvertes-2026-11-25.md` (archive de l'ancienne page).

## En attente de réponse

Posées le 23/11, pendant la refonte de l'app sur les maquettes v5 (fil « refonte stricte ») :
- q112 : garder la fenêtre Premium « This tweak is part of Premium » quand le serveur refuse d'appliquer le Packet Optimizer ([[NetOpt.tsx]]).
- q113 : « Affiliate reward » ou « Discord reward » pour une licence gagnée sur Discord (page compte).
- q114 : badge « Ended » dans la carte Formule d'un abonnement terminé (page compte).
- q115 : texte propre à l'achat de test au lieu de « This license was revoked. » (page compte).

Posée le 25/11, après le test Windows de Sofiene (PR #139) :
- q121 : la barre en jeu sort-elle encore du jeu (autre page, jeu réduit) une fois la 1.2.1 quittée ? ([[Barre en jeu]])

Posée le 13/11 (fil « Corriger les saccades du stream Discord ») :
- q109 : les joueurs dont le stream Discord saccade ont-ils la version publique ou l'exe de test ? Le correctif (jeu en « Supérieure à la normale ») attend aussi la décision de Sofiene ([[Bugs et incidents]]).

Posées le 24/11 sur l'accueil v6 (PR #136, [[New Brand Rago]]) :
- q118 : que devient la section « Three ways in » une fois les cartes Rago Route passées au-dessus du globe ?
- q119 : les flux d'Asie s'arrêtent à la Sibérie (Tokyo, Pékin et Séoul sont de l'autre côté du globe) : on garde ?
- q120 : la capture du dashboard sur l'accueil date du site v5 (« 212 tweaks ») : capture à jour à envoyer.

Posées le 25/11 par les fils des autres projets (serveur Minecraft, voir leur vault) : q122 à q127.

Au 10/11, après les réponses de Sofiene du jour (q36 à q68 traitées, q46 le 10/11 à 15 h, voir [[Décisions]]) :

Posées le 10/11 au soir (q70 à q93), après la relecture complète du code pour le vault détaillé (dossier `Code/`) :
- q73 : 4 réglages de carte graphique jamais grisés ([[meta.py]]).
- q74 : provenance et licence de NVIDIA Profile Inspector ([[Configuration Tauri]]).
- q75 : 73 ou 68 réglages gratuits affichés ; `FREE_TWEAKS` sur Railway ([[sync_tweaks.py]], [[config.js]]).
- q76 : réglée le 22/11 sans réponse nécessaire : la nouvelle image de partage v5 dit « 218 tweaks » (PR #109, [[Kit de marque (brand)]]).
- q77 : étoiles Google des avis perdues (RAG-33, [[page.html]]).
- q79 : retirer la protection d'avant lancement ([[launch-gate.js]]).
- q80 : GitHub Pages publie le vault ([[Fichiers de la racine du dépôt]]).
- q81 : supprimer les branches `claude/project-thread-tzbch5` et `trailer-4k-footage` ([[Branches du dépôt]]).
- q82 : supprimer les fichiers qui ne servent plus ([[recherche-conversion (site)]], [[fix_free_bat.py]]…). Pour [[LicenseGate.tsx]], le mode plein écran jamais monté est retiré le 24/11 avec la refonte des fenêtres sur les maquettes v5 (PR #131).
- q83 : textes en retard dans le code (README, `FREE_TWEAKS`, commentaires).
- q84 : l'e-mail d'achat renvoie vers un ticket Discord même avec le bot ([[mailer.js]]).
- q85 : un jeu retiré de la bibliothèque ne peut plus être réaffiché ([[Games.tsx]]).
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
- q98 : `CERVEAU_GITHUB_TOKEN` mis dans Railway, et dans quels environnements ? (25/11 : la variable existe dans Railway ; reste à confirmer production et staging, et l'accès du jeton à Rago-Client) ([[Cerveau du vault]], [[Variables d'environnement]]).
- q100 : le bouton « Get notified on Discord » de l'encart Rago Route de l'accueil devient « Try 3 days free », disparaît ou reste ? (dans le code de prod de la 1.3.0, il est caché par l'attribut `hidden` ; CONFIRMÉ, 27/11) ([[page.html]])

Posée le 27/11 (fil HUB-d1451f, Rago Route pour les Lifetime, [[Paiements Stripe]]) :
- q131 : la consigne disait que les 5 Lifetime vendus ont Rago Route gratuit en prod et le perdront à la mise en prod ; or le code de prod (1.3.0) demande déjà l'option à tout Lifetime. Un Lifetime a-t-il eu Rago Route sans payer ? Veux-tu les prévenir que l'option existe pour eux ? (À VÉRIFIER)

## À vérifier (sans Sofiene)
- Rago Route (sorti et annoncé le 22/11) : tous les joueurs sortent par la même adresse à Paris ; Hypixel coupe déjà les connexions venant de Frankfurt (09/11, sans effet tant que Frankfurt n'est qu'un relais). Test P0-9 et message à Hypixel à faire au plus vite (q99) ; surveiller les retours des joueurs ([[Proxy]], [[Page de vente Rago Route]]).
- Concurrents, lus le 11/11 sans navigateur : prix d'ExitLag sur son propre site (seuls ceux de l'App Store, États-Unis, ont été lus : 9,99 $ par mois, 75 $ par an) ; durée de l'essai (24 h ou 7 jours), prix et remboursement de NoPing (chiffres de tiers) ; durée de l'essai WTFast (3 jours dans l'aide, une semaine payante sur l'accueil). À revoir dans un navigateur avant d'en citer un ; la page ne nomme aucun concurrent ([[Page de vente Rago Route]], [[Étude - Outils réseau et ping]]).
- [[Couleurs et résolution]] (11/11, jamais testé sur Windows) : saturation NVIDIA (NVAPI) et AMD (ADL), rampe gamma, retour des couleurs au Alt+Tab, résolution étirée (`DMDFO_STRETCH`) et retour à la fin de la partie, écriture des fichiers de Valorant, Fortnite et CS2 ; comportement avec le HDR de Windows.
- Valorant en 4:3 étiré (1440×1080) : les sources lues le 11/11 ne confirment pas que le jeu remplit l'écran sans réglage de plus ; à vérifier en jeu ([[Couleurs et résolution]]).
- CS2 : valeurs de `setting.aspectratiomode` dans `cs2_video.txt` (0 = 4:3 ou 5:4, 1 = 16:9, 2 = 16:10, d'après la doc de la communauté) à confirmer dans un vrai fichier ([[Couleurs et résolution]]).
- `app/src/data/pros.json` : quelques saturations de pros CS2 viennent de pages lues en résumé (prosettings.net coupé) ; à relire page par page avant la sortie ([[Couleurs et résolution]]).
- Les PC en 1.2.x reçoivent-ils bien la 1.3.0 ? Le serveur la propose à 100 % (vérifié le 25/11 sur `/api/v1/update/status`) ; reste à le voir sur un PC en 1.2.1 ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison) : voir [[Conformité juridique]].
- Barre en jeu pendant une partie par Rago Route : pas de ping affiché, le jeu étant connecté à `127.0.0.1` (déduit du code, [[gameping.rs]]) ; à voir sur Windows.
