---
type: marketing
tags: [marketing, étude, conversion, juridique]
source: /mnt/project-files/etude-marche-2026-11/5-conversion.md
maj: 2026-11-10
---
# Étude - Convertir honnêtement

Étude n° 5 de l'[[Étude de marché de novembre 2026]] : comment faire passer des gratuits au Premium sans tromper (émotion, chiffres de conversion, limites légales). Fichier `etude-marche-2026-11/5-conversion.md` (64 Ko, 03/11/2026), écrit par un sous-agent de recherche Claude pour Sofiene. **Statut : OBSERVÉ** ; plusieurs faits juridiques sont de mémoire ([NON VÉRIFIÉ] dans l'étude) et doivent être validés par un juriste avant tout usage. Voir [[Offres et prix]], [[Conformité juridique]], [[Voix et ton]], [[Abonnement dans l'app]].

## Méthode
- Légende : **[LU]** page lue ; **[TITRE]** titre seul ; **[NON VÉRIFIÉ]** de mémoire.
- Seules 6 pages ont pu être lues en entier (budgets de lecture et de recherche épuisés) : RevenueCat 2026, Lenny's Newsletter, FTC (Restoro et Reimage), critères de Microsoft, blog Microsoft de 2018, annexe I de la directive 2005/29/CE.
- L'étude signalait déjà l'écart « 15 optimisations gratuites » (brief) contre « 11 » (vault du 29/10) ; réglé depuis : 73 réglages gratuits dont 30 actifs dans la [[Version 1.3.0]].

## L'essentiel en 12 points (repris de l'étude)
1. Freemium mobile : **2,1 %** des téléchargements paient à 35 jours (médiane), contre **10,7 %** avec un paywall total ; rétention à un an des annuels identique (28 % contre 27 %) (RevenueCat 2026, [LU]).
2. SaaS : freemium « bon » 3-5 % en 6 mois, « excellent » 6-8 % ; essai gratuit 8-12 % (bon), 15-25 % (excellent) (Lenny's Newsletter, 2023, plus de 1 000 produits). **Objectif réaliste pour Rago : 2 à 5 % des installations actives** ; plus de 6 % serait excellent (estimation).
3. Essais longs : 17-32 jours → **42,5 %** passent au payant ; moins de 4 jours → **25,5 %**. **55,4 % des annulations d'essais de 3 jours ont lieu le jour même**, 84 % entre le jour 0 et le jour 1.
4. 85 % des essais d'apps « Business » commencent le jour de l'installation : l'offre doit venir dans la première session, **après** un vrai résultat.
5. Meilleur levier émotionnel honnête : **l'avant/après mesuré sur le PC du joueur**, présenté comme l'écran d'amélioration de Forza.
6. **Essai inversé** (Premium complet quelques jours sans carte, puis retour au gratuit) : fait vivre les meilleurs tweaks sans les donner.
7. Un score oui (Oura, Whoop), un « score de santé » non : mesurer la préparation de la session ou les réglages appliqués.
8. **FTC contre Restoro et Reimage, 14/03/2024 : 26 M$** ; interdiction de mal représenter des problèmes de sécurité **ou de performance**.
9. **Microsoft classe comme « logiciel indésirable »** un logiciel aux affirmations exagérées sur la santé de l'appareil ; depuis le **01/03/2018**, Defender les détecte et les supprime, et vise nommément les « cleaner or optimizer applications ».
10. Les autorités visent les jeux et les jeunes : Epic Games 520 M$ (2022), HoYoverse 20 M$ (2025).
11. Résilier doit être aussi simple que s'abonner : règle américaine « click to cancel » annulée en juillet 2025, mais Amazon a payé 2,5 Md$ (09/2025) ; France : résiliation « en 3 clics » depuis le 01/06/2023 ; UE : **bouton de rétractation** obligatoire depuis juin 2026.
12. Coût de la triche : amendes, rétrofacturations (perte possible du compte Stripe), et surtout **détection par Defender**, qui tue la distribution d'une app Windows (CCleaner classé PUA en 2020).

## Partie A : références (émotion et place de l'offre)
| Référence | Ce qui crée l'émotion | À transposer | À ne pas copier |
|---|---|---|---|
| CleanMyMac | un gros bouton « Smart Care », design soigné, chiffre vrai « X Go à libérer » | premier lancement : « Analyser mon PC », résultats par familles, chiffres vrais | « analyse gratuite qui trouve des problèmes, réparation payante » ; MacKeeper a accepté 2 M$ (2015) ; ne jamais dire « problèmes », « erreurs », « menaces » |
| Duolingo | série (« streak ») et « streak freeze », mascotte Duo | une série qui a du sens (« semaines avec un ping stable »), offre après une réussite | culpabilisation, monnaie virtuelle |
| Spotify | le gratuit marche vraiment ; Wrapped ; gratuit assoupli en septembre 2025 ; 3e trimestre 2026 : 788 M d'utilisateurs, 306 M payants (environ 39 %) | gratuit = mesurer + quelques réglages qui se sentent ; Premium = Optimize and play, presets, tweaks en partie, Packet Optimizer | gênes qui ressemblent à du sabotage |
| Headspace, Calm | questionnaire d'accueil, rituel quotidien (Calm : rétention × 3 en 2016) | accueil en 3 questions (« À quoi tu joues ? », « Qu'est-ce qui te gêne ? », « Portable ou fixe ? ») | paywall total, croix minuscules |
| Oura, Whoop | un score sur 100 avec couleur, phrase et action | score « Prêt à jouer » avant la partie (ping, gigue, applis lourdes, mode jeu) | score bas par défaut ; rouge pour un Windows d'origine |
| Strava | carte partageable, bilan annuel ; **critiqué quand le bilan est passé payant** | récap partageable **gratuit**, fiche du PC partageable | classements entre PC différents |
| Forza, Gran Turismo | voir les barres bouger avant d'acheter, compromis en rouge, classe D à X | chaque tweak = une « pièce » avec sa fiche ; classe du setup comptée sur les réglages appliqués (« Windows d'origine » → « Réglé pour le jeu » → « Compétition ») | stats calculées d'avance |

L'étude proposait aussi un compagnon dans l'app sur le modèle de Duo, en reprenant la mascotte des vidéos courtes : sans objet, cette série est arrêtée depuis le 01/11 ([[Décisions]]).

## Partie B : chiffres et bonnes pratiques
- **Taux de conversion** (tableau B1) : freemium mobile 2,1 % ; paywall total 10,7 % (12,1 % en 2025) ; revenu par installation à 60 jours 3,09 $ contre 0,38 $ ; SaaS freemium libre-service 3-5 / 6-8 %, avec vente assistée 5-7 / 10-15 %, essai 8-12 / 15-25 % ; Duolingo environ 8-9 % (non vérifié) ; **aucun chiffre public fiable pour les optimiseurs PC**.
- **Durée d'essai** : 7 jours couvrent un week-end ; 14 défendable. L'étude recommandait **sans carte bancaire** (public jeune, plaintes de parents, rétrofacturations) et un rappel avant la fin.
- **Essai inversé** : risques propres à Rago : la [[Remise à zéro]] doit être solide et annoncée ; message de fin factuel (« Le 12/11, les 34 tweaks Premium reviendront… ») ; un essai par PC.
- **Où placer l'offre** : après le moment « aha » (avant/après mesuré) ; en contexte sur un tweak verrouillé ; pas à chaque lancement. Tension relevée avec la règle « pas les meilleurs tweaks en gratuit ».
- **Ancrage des prix**, calculs de l'étude : 12 mois au mensuel = **71,88 $** ; l'annuel à 29,99 $ = 2,50 $/mois, **58 % d'économie** ; le Lifetime à 59,99 $ = exactement 2 ans d'annuel, amorti en 10 mois de mensuel. Écrire « 29,99 $ facturés une fois par an » aussi lisiblement que « 2,50 $/mois » ; jamais de faux prix barré ; la rareté de l'ancien code RAGO50 (15 places) était permise car vraie. Risque du Lifetime : il prend des clients qui auraient payé plusieurs années.
- **Garanties de remboursement** : l'étude recommandait « Remboursé sous 14 jours, sans question » (minimum légal UE, baisse des rétrofacturations). **Contraire à la décision de Sofiene du 10/11** (plus de remboursement, l'essai le remplace, [[Offres et prix]]).
- **Progrès déjà accompli** (Nunes et Drèze 2006) : barre du setup qui compte ce qui est vraiment fait (« 19 réglages sur 40 recommandés »).
- **Preuve sociale** honnête : membres réels du [[Discord]], avis réels, [[Partenaires et créateurs]] ; jamais de faux avis.
- **Tests A/B proposés** : offre au lancement contre après le premier gain ; essai inversé contre essai proposé ; annuel ou mensuel présélectionné ; Lifetime affiché ou caché ; carte récap activée ou non. **Indicateurs** : activation, « aha », essais, paiement à 35 et 180 jours, remboursements, rétrofacturations, désinstallations à 7 jours, signalements Defender.

## Partie C : les limites à ne pas franchir
- **FTC, Restoro et Reimage** (Chypre ; vote 3-0 ; 26 M$ ; logiciel 27-58 $ puis technicien à plusieurs centaines de dollars) : l'analyse trouvait des problèmes « regardless of the actual health of the consumers' computers ». Leçon : l'analyse de Rago doit être **déterministe et explicable** et savoir dire « Rien à régler ici ».
- **Microsoft, critères des logiciels indésirables** (mis à jour le 10/09/2026, [LU]) : affirmations exagérées sur la santé de l'appareil, affirmations trompeuses sur fichiers ou registre, alertes inquiétantes avec paiement exigé ; transmission de données sans avis et consentement ; messages trompeurs à la désinstallation ; publicités sans fermeture évidente ; « Poor industry reputation ». Blog du 30/01/2018 (Barak Shein) : détection à partir du 01/03/2018, vise l'urgence (« agir dans un délai limité »).
- **Précédents** : CCleaner « PUA:Win32/CCleaner » (30/07/2020) ; Microsoft ne soutient pas les nettoyeurs de registre (KB 2563254) ; Malwarebytes contre PC Pitstop (2016) et Systweak ; listes « Deceptors » d'AppEsteem.
- **Points de vigilance propres à Rago relevés par l'étude** :
  - **[[Test réseau]]** : envoie ses résultats au serveur depuis la 1.2.1 ; une ligne dans la politique de confidentialité ne suffit sans doute pas, prévoir un avis clair et un choix dans l'app. Sofiene a tranché le 10/11 : envoyé sans demander, mais « garder ce point avant de soumettre l'app à la signature » ([[Décisions]]).
  - Désinstallation : pas de message du type « Ton PC va redevenir lent ».
  - Processus en fond toujours visibles et faciles à arrêter.
  - La phrase des vidéos « Skill issue? Nope. PC issue. » : dans l'app, seulement si une mesure le montre.
  - Pas d'urgence (« Réglez ça dans les 10 minutes »).
- **États-Unis** : rapport FTC « Bringing Dark Patterns to Light » (09/2022) ; « click to cancel » annulée par la cour du 8e circuit en juillet 2025 ; ROSCA et lois des États toujours là ; Amazon 2,5 Md$ ; Epic 520 M$ ; HoYoverse 20 M$ et loot boxes interdites aux moins de 16 ans sans accord parental.
- **UE et France** : DSA art. 25 (plateformes ; Rago sans doute pas concerné, à valider) ; **directive 2005/29/CE, annexe I** : point 7 (fausse urgence), 12 (risque pour la sécurité), 20 (« gratuit » trompeur), **28 (exhortation directe aux enfants : « Demande à tes parents » à bannir)** ; faux avis ajoutés par la directive Omnibus 2019/2161 ; **bouton de rétractation** (directive 2023/2673, juin 2026) ; Digital Fairness Act repoussé à mi-2026 ; France : résiliation en 3 clics (01/06/2023).
- **Liste rouge** : analyse qui trouve toujours quelque chose ; mots « problèmes », « erreurs », « menaces », « danger » pour des réglages normaux ; gain non mesuré ; fausse urgence ou rareté ; message culpabilisant à la désinstallation ; essai qui devient payant sans rappel ; faux avis ou prix barrés ; « Demande à tes parents », monnaie virtuelle ; données transmises sans avis ; nettoyeur de registre ou logiciels groupés.
- **Liste verte** : analyse déterministe ligne par ligne ; « Rien à régler ici » ; chiffres seulement mesurés, avec « les résultats varient selon les PC » ; « Restaurer » toujours visible ; prix total, rythme, date de renouvellement et annulation visibles **avant** le paiement, rappel avant fin d'essai et renouvellement annuel ; résiliation depuis le compte ; récap partageable gratuit.

## Partie D : le parcours proposé
1. Premier lancement : un seul bouton « Analyser mon PC ». 2. Accueil en 3 questions facultatif. 3. Premier gain mesuré (60 s), barres avant/après ou « pas de changement mesurable ». 4. Offre juste après, avec essai de 7 jours sans carte ou essai inversé, total facturé visible, « Annule quand tu veux », « Remboursé sous 14 jours ». 5. Pendant l'essai : « Prêt à jouer », rappel 2 jours avant la fin. 6. Fin d'essai factuelle. 7. Récap partageable. 8. Rappel avant renouvellement.

## Ce que Rago en a fait (au 10/11)
- Étape 1 et avant/après : [[Analyse du PC]] dans la [[Version 1.3.0]] (sans note globale). CONFIRMÉ par le vault.
- Étape 4 : **choix différent de Sofiene** : essai de 3 jours **avec carte**, débité automatiquement sur le mensuel (04/11 et 10/11), un essai par e-mail et par carte ; le site affiche la date de débit sous le bouton ; **pas de remboursement** (10/11). Fenêtre Premium avec les prix et résiliation dans l'app ([[Abonnement dans l'app]]).
- L'étude rappelle que 55,4 % des annulations d'essais de 3 jours ont lieu le jour 0 : à suivre dans [[Ventes Stripe]] après la sortie de la 1.3.0 (proposition, pas une décision).
- Points juridiques de l'étude à vérifier pour [[Conformité juridique]] : bouton de rétractation UE, résiliation en 3 clics, consentement du test réseau, point 28 de l'annexe I pour un public jeune.

## Sources les plus utiles (selon l'étude)
RevenueCat 2026 ; FTC Restoro et Reimage ; critères Microsoft (10/09/2026) ; blog Microsoft du 30/01/2018 ; Lenny's Newsletter ; Kyle Poyar sur l'essai inversé ; bouton de rétractation UE (Greenberg Traurig, 05/2026) ; Epic 520 M$ (PBS). Liste complète et adresses dans le fichier source (section E). Reste à vérifier (section F) : consentement du test réseau en premier, puis versions consolidées des textes UE, bouton de rétractation, statut de « click to cancel » et du Digital Fairness Act, chiffres Duolingo et Spotify, essais inversés, seuils Visa et Mastercard.
