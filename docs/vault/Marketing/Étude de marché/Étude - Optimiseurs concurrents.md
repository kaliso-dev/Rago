---
type: marketing
tags: [marketing, étude, concurrence, optimiseurs]
source: /mnt/project-files/etude-marche-2026-11/1-optimiseurs.md
maj: 2026-11-10
---
# Étude - Optimiseurs concurrents

Étude n° 1 de l'[[Étude de marché de novembre 2026]] : l'expérience des optimiseurs PC, d'abord ceux pour joueurs. Fichier `etude-marche-2026-11/1-optimiseurs.md` du dossier partagé (51 Ko, 03/11/2026). **Statut : OBSERVÉ** (recherche web d'un sous-agent Claude, aucune app installée, rien revérifié). Voir aussi [[Offres et prix]], [[Presets]], [[Packet Optimizer]], [[Analyse du PC]].

## Méthode et limites (écrites dans l'étude)
- Tout vient de pages publiques (sites des éditeurs, presse, Trustpilot, FTC). Les écrans viennent de descriptions écrites, pas de captures.
- Deux quotas partagés entre agents ont été atteints : lecture de pages web (100 par heure) puis recherche web (200 par tour). Les dépôts GitHub n'étaient pas lisibles. Les fiches 8 à 24 sont donc courtes et souvent « non vérifié ».
- Les notes Trustpilot ne sont pas vérifiées par Trustpilot.
- Grille par app : disposition, premier lancement, un clic / expert / presets, compréhension, jauges et scores, sécurité, argent, ce qui marche, plaintes, idée pour Rago.

## A. Optimiseurs « joueurs » sur abonnement ou freemium
### Hone (hone.gg), le concurrent le plus proche
- **Disposition** : depuis la 1.4 (26/05/2026), catalogue rangé **par résultat attendu** (« Reduce Ads & Tracking », « Optimize FPS & Input Lag », réseau, NVIDIA, stockage et mémoire…) ; pages Boost-Ups, Presets, Game Mode.
- **Premier lancement** : compte obligatoire, puis optimisations gratuites. « One-click setup » annoncé. Optimisations par jeu (« plus de deux douzaines »). Presets 2.0 : import, **codes de partage**, confirmation avant suppression. Game Mode « balanced » gratuit, « custom » et « performance » payants.
- **Compréhension** : un interrupteur = un bénéfice ; entrées marquées « avancé » ou « expérimental » ; l'aide prévient (BIOS = écran bleu possible, verrouillage GPU = chauffe sur portable).
- **Jauges** : visuels « Aumento de FPS » sans chiffre, avec « les résultats varient ».
- **Sécurité** : retour arrière par réglage, mais l'aide demande de créer soi-même un point de restauration. En 1.4, des réglages fusionnés ont été **annulés sans action de l'utilisateur**.
- **Argent** : gratuit = **10 optimisations** (15 avec le parrainage, +1 par filleul), Game Mode équilibré, **publicités** ; Premium illimité, mensuel ou annuel, **prix affiché seulement au paiement** (montant non trouvé), pas d'essai ni de garantie. Incohérence : une bannière dit « up to 20 optimizations at no cost ».
- **Preuves** : Trustpilot **4,7/5 sur 1 835 avis**, 85 % de 5 étoiles, réponse à 100 % des avis négatifs sous 24 h. Plaintes : « too paid to win », redémarrages, écrans bleus allégués.
- **Acquisition** (fiche 24) : pages par jeu pour la recherche (« 1-click Valorant FPS boost »), pages « alternative à » (Razer Cortex, ExitLag, GearUP), distribution sur Overwolf (éditeur AuraSide Inc.), partenariat Salad, « trusted by over a million gamers », profils de pros importables en Premium. Hone **sponsorise CapFrameX**, l'outil de mesure de référence ([[Étude - Apps de constructeurs et overlays]]).
- **Idée pour Rago** : grouper les tweaks par bénéfice, compter le gratuit en groupes, code de partage visible ; ne pas annuler des réglages en silence ni cacher le prix.

### Razer Cortex (gratuit)
- Lanceur + Game Booster + System Booster + offres de jeux. Compte Razer ID (2022) ou invité (plus récent).
- **Auto-boost** au lancement du jeu, remise en état après la partie. **Booster Prime** (Fortnite, Valorant, PUBG) : résolution, puis **curseur à 3 positions** (Competitive priority, High quality, High performance) avec **FPS prédits** et liste des réglages qui changent, puis OPTIMIZE.
- Test EarlyGame (Ryzen 7 5700X, RTX 4060) : **+10 à 15 FPS**, 4,8 Go nettoyés en 2 min. Plaintes : peu de gain sur PC haut de gamme, « Scan results lack detail ».
- **Idée** : le curseur avec FPS prédits et la liste des changements avant d'appliquer ; le mode jeu automatique.

### Smart Game Booster (iTop selon la presse)
- Boost + overlay FPS et températures + overclocking GPU en un clic. PRO **19,99 $ à vie** sur Steam ; accélération réseau payante. Steam 74 % de 62 avis. Promesses « 120% FPS and 80% ping » ; test réel Valorant de 90 à près de 130 FPS sur une machine.
- **Idée** : températures à côté des FPS dans la [[Barre en jeu]] ; ne pas copier l'overclock en un clic ni les gains marketing.

## B. Suites « tune-up » grand public
| App | Ce que l'étude retient | Prix relevé |
|---|---|---|
| Advanced SystemCare (IObit) | gros bouton Scan, « AI Mode » / « Manual Mode », **1 713 entrées de registre** trouvées contre 250 à 300 ailleurs (compteur gonflé), pubs d'autres logiciels IObit, Driver Booster coché d'office à l'installation ; Trustpilot IObit 4,6/5 (2 373 avis) mais 18 % de 1 étoile | Pro 29,99 $/an (souvent 16,77 $), 3 PC 89,97 $ |
| Driver Booster (IObit) | « 30 outdated drivers and 12 outdated game components » ; point de restauration et sauvegarde des pilotes avant chaque mise à jour ; gratuit limité à **2 mises à jour par jour** | PRO 22,95 $/an (3 PC), essai 14 jours, garantie 60 jours |
| CCleaner (Gen Digital) | Health Check en un clic, note d'impact par programme, **onglet « Sleeping Programs » avec « Wake Up »**, deux écrans d'explication puis « See Demo » ; promesses chiffrées avec méthode (oct. 2021, 3 PC) | Pro 44,95 $/an, Pro Plus 64,95 $, **garantie 30 jours « si on n'améliore pas ton PC »**, essai 14 jours |
| Restoro et Reimage | **sanction FTC du 14/03/2024 : 26 M$**, fausses fenêtres Windows, analyse qui trouve toujours des problèmes graves, activation par téléphone ; logiciel 27 à 58 $ puis technicien ; interdiction de « misrepresenting security or performance issues » | — |
| Office Depot et Support.com | précédent de 2019 : **35 M$** (dont 25 M$ Office Depot) pour un « PC Health Check » truqué | — |
| Fortect, AVG TuneUp, Ashampoo WinOptimizer, iolo System Mechanic, Wise Game Booster | fiches courtes « non vérifié » : scan gratuit puis réparation payante (Fortect, environ 6 160 avis Trustpilot) ; Sleep Mode (AVG, dès 29,99 $/an) ; licence à vie (Ashampoo) ; état de santé global (iolo, environ 3 907 avis) ; compteur « N éléments optimisables » (Wise) | — |

**Leçon centrale** : le scan de Rago doit pouvoir dire « ton PC va bien » ; jamais de compteur de « problèmes », d'alerte rouge pour un réglage par défaut de Windows, d'urgence ni de correction payante d'un problème qu'il a lui-même affiché. Détail juridique : [[Étude - Convertir honnêtement]].

## C. Outils gratuits de passionnés (référence de transparence)
- **WinUtil (Chris Titus Tech)** : sélections « Standard / Minimal / Clear », « Essential Tweaks » et « Advanced Tweaks – CAUTION », une page de doc par réglage ; le point de restauration est lui-même un réglage « essentiel ».
- **Optimizer (hellzerg)** : portable, open source, plus de 20 langues, modèles de configuration.
- **O&O ShutUp10++** : **feu tricolore par réglage** (vert recommandé, jaune sous conditions, rouge déconseillé), « appliquer seulement les recommandés », point de restauration au premier changement, « tout annuler ».
- **Process Lasso** : graphique temps réel avec un repère à chaque intervention.
- **AME Wizard + Atlas OS** : assistant par étapes, FAQ d'erreurs ; idée reprise pour [[Rago OS]].
- **Win11Debloat** : « par défaut » ou « personnalisé », deux choix seulement.

## D. Optimiseurs joueurs récents (2024-2026)
- Paysage vu par esports.gg (comparatif « 2025 ») : Hone, Wise Game Booster, Razer Cortex, WTFast, EXMTweaks, VTRL, Talon ; **« Most paid plans cost about $5–15 a month »** : Rago (5,99 $) est en bas de la fourchette.
- **EXM Tweaks** : gratuit, profils par usage, Discord comme support (au moins 180 avis Trustpilot environ).
- **Risxn Tweaks** : environ 302 avis Trustpilot, promesse « 300 FPS to 500 FPS in Fortnite? », **créateurs payés** pour la promotion.
- **HD OPTI (environ 134 avis), VTRL (réseau payant), Lumin, Roo Industries (15 avis), RipTweaks, fpstweak, VRUZKA (5 avis)**, packs Payhip, Gumroad, Fourthwall : c'est le marché d'origine de Rago (le `.bat` vendu sur [[Discord]]). Argument repéré : « ✓ Vanguard Safe · 100% Free · No Bloatware » (compatibilité anti-triche).
- **Talon** : open source, « stability-first ».
- **Réseau (WTFast, ExitLag, GearUP, NoPing)** : voir [[Étude - Outils réseau et ping]]. Leçon : dire ce que le [[Packet Optimizer]] change (réglages locaux) et ce qu'il ne change pas (le trajet).
- **Hors segment** : Microsoft PC Manager (bouton « Boost » gratuit) ; « Rago ne doit pas vendre ce que Windows donne gratuitement ». NVIDIA App : même schéma que Booster Prime.

## Tableau comparatif (extrait de l'étude)
| App | Gratuit | Un clic | Gain chiffré | Annuler |
|---|---|---|---|---|
| Hone | 10 optimisations (15) + pubs | « One-click setup » | non | par réglage ; point de restauration conseillé |
| Razer Cortex | tout | auto-boost | **FPS prédit avant d'appliquer** | restauré après la partie |
| Smart Game Booster | base | boost + overclock | promesses | ? |
| Advanced SystemCare | limité | Scan, AI Mode | promesses « 200 % / 300 % » | ? |
| Driver Booster | 2 pilotes par jour | tout mettre à jour | non | restauration + sauvegarde des pilotes |
| CCleaner | confidentialité et espace | Health Check | chiffres avec méthode | Sleeping Programs + Wake Up ; garantie 30 j |
| Restoro / Reimage | scan | scan | faux | sanction FTC 26 M$ |

## Synthèse de l'étude
**Ce qui marche** : deux niveaux (bouton automatique + mode manuel) ; ranger par bénéfice ; montrer le résultat attendu avant d'appliquer (aucun concurrent lu ne mesure lui-même un avant/après : espace libre) ; annulation visible ; explication avant la première activation ; confiance par l'honnêteté ; boucles virales (parrainage, codes de preset, Discord, créateurs payés, pages par jeu) ; prix : Rago bien placé.

**Problèmes vus par un débutant** : compteurs gonflés et peur ; bouton opaque ; promesses non tenues (« 120 % » annoncé contre environ +44 % mesuré) ; gratuit frustrant ; pubs croisées ; peur de casser le PC ; changements faits sans le dire ; prix flou ; confusion FPS et ping.

**Les 10 idées classées** (C = conversion, U = compréhension, de 1 à 3) :
| # | Idée | C | U |
|---|---|---|---|
| 1 | Mesure réelle avant/après (60 s, FPS via PresentMon, ping et gigue), offre Premium juste après ; le scan sait dire « ton PC va bien » | 3 | 3 |
| 2 | Presets par jeu avec curseur Compétitif / Équilibré / Qualité, FPS estimés, liste des changements | 3 | 3 |
| 3 | Regrouper les tweaks en bénéfices, Premium visible avec cadenas ; compenser « too paid to win » par un essai court (À DÉCIDER à l'époque) | 3 | 3 |
| 4 | Feu tricolore par tweak + impact + « Appliquer seulement le vert » | 2 | 3 |
| 5 | Page « Mes changements » avec « Annuler » par ligne et point de restauration | 2 | 3 |
| 6 | Garantie 30 jours « remboursé si aucun gain mesuré » | 3 | 1 |
| 7 | Mode jeu automatique au lancement d'un jeu de la bibliothèque | 2 | 2 |
| 8 | Parrainage (+1 tweak gratuit par ami) ; codes `RAGO2_…` au nom d'un créateur | 2 | 1 |
| 9 | Badge anti-triche par preset ; phrase « ce que le Packet Optimizer change, ce qu'il ne change pas » | 1 | 3 |
| 10 | Prix clair dans l'app, rappel avant renouvellement ; jamais de pub ni de case pré-cochée | 1 | 2 |

Remarque de l'étude sur Rago : le brief disait 15 tweaks gratuits, le vault 11 (29/10) ; l'écart est réglé depuis, le plan gratuit de la [[Version 1.3.0]] est de 73 réglages dont 30 actifs ([[Offres et prix]]).

## Ce que Rago en a fait (au 10/11)
- Idée 1 : l'[[Analyse du PC]] avec avant/après est dans la [[Version 1.3.0]] (décision du 04/11, sans note globale, normes par joueur depuis le 10/11). CONFIRMÉ par le vault.
- Idée 3 : essai de 3 jours **avec carte** sur le mensuel (Sofiene, 04/11 puis 10/11), pas l'essai sans carte de l'étude ([[Offres et prix]]).
- Idée 6 : **contraire à la décision du 10/11** : plus aucun remboursement, l'essai le remplace ([[Décisions]]).
- Idée 10 : fenêtre Premium avec les prix et résiliation dans l'app ([[Abonnement dans l'app]]).
- Idées 2, 4, 5, 7, 8 et 9 : pas reprises à ce jour, à notre connaissance (À VÉRIFIER si l'une est prévue).

## Sources citées comme les plus utiles
FTC Restoro et Reimage (14/03/2024) ; page Premium de Hone ; billet Hone 1.4 (26/05/2026) ; Razer Booster Prime ; CCleaner Performance Optimizer ; TechRepublic sur Performance Optimizer ; Tech Advisor sur Advanced SystemCare 14 ; Trustpilot Hone. Aussi : esports.gg, TechRadar (Driver Booster 8), EarlyGame (Cortex), aide Hone, gHacks, Hardware Secrets. Les adresses exactes sont dans le fichier source.

À relire selon l'étude : O&O ShutUp10++, WinUtil, Fortect, AVG, Ashampoo, iolo, Process Lasso, Atlas OS, Win11Debloat, PC Manager, NVIDIA App, Trustpilot de Risxn, EXM, HD OPTI, VTRL, et le prix en dollars de Hone Premium.
