---
type: code
tags: [code, app, typescript, react, abonnement]
fichier: app/src/components/Upsell.tsx
lignes: 240
maj: 2026-11-28
---
# Upsell.tsx

La **fenêtre « Passer Premium »** (offres avec les prix de Stripe, essai, achat dans le navigateur) et la **fenêtre de connexion** qui l'accompagne. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Abonnement dans l'app]], [[Offres et prix]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, PR #131 fusionnée le 24/11 : fenêtre refaite sur les maquettes v5 `app-upsell-*`).

## Rôle et place dans l'ensemble
- Rendue une fois par [[App.tsx]] ; s'ouvre selon `upsell` du store ([[store.tsx]]) :
  - `tweak` (réglage verrouillé, avec `upsellTweak`), `preset`, `plan`, `slots`, `analysis` → fenêtre d'offre ;
  - `signin` → fenêtre de connexion (`Modal v5="gate2"`) avec [[LicenseGate.tsx]], fermée par « Commencer » (`onDone`).
- Qui l'ouvre : [[TweakRow.tsx]] et [[SearchPalette.tsx]] (`tweak`), [[Dashboard.tsx]] (`preset`), [[Sidebar.tsx]], [[ModulePage.tsx]], [[RunOverlay.tsx]] et la barre en jeu (`plan`), [[ModulePage.tsx]] aussi pour le Mode jeu et RBW Mod (`tweak`), `toggle`/`selectMany` du store (`slots`), [[Analysis.tsx]] et [[RunOverlay.tsx]] (`analysis`), [[TitleBar.tsx]] et [[LicenseNotice.tsx]] (`signin`).

## Fonctionnement détaillé

### Titre et accroche
| Ouverture | Surtitre | Titre | Texte |
|---|---|---|---|
| `analysis` (avec une analyse gardée) | « Plan gratuit » | « Premium règle {p} des {n} points trouvés » | liste `.fnd` des points Premium avec leur valeur mesurée (« 141 fps », « 3 jours »), puis « Le plan gratuit en règle {free}, et {diy} sont à faire toi-même : l'analyse dit comment. » |
| `slots` | « Plan gratuit » | « Tes 30 places gratuites sont prises » | « Le plan gratuit garde 30 réglages actifs en même temps. Annule un réglage pour en activer un autre, ou passe Premium : aucune limite. » et les 30 cases pleines (`.slt`) |
| `tweak` avec un réglage | « Ce réglage fait partie de Premium » | « {nom} fait partie de Premium » | « Le plan gratuit ouvre {68} réglages… » (+ « En gratuit, tu peux toujours remettre ce réglage par défaut. » pour `rbw_mode`/`game_mode`) |
| `plan` | « Plan gratuit » | « Tout débloquer avec Premium » | idem |
| `preset` | « Les presets font partie de Premium » | « Débloque les {218} réglages » | idem |

Sauf pour `analysis` et `slots`, quatre avantages (liste `.bn`, coches) : tous les modules (ping, hitreg, carte graphique, CPU, Windows) ; mode jeu Rago, RBW Mod, réglages Minecraft ; presets en un clic dont Minecraft PvP ; mode expert et chaque nouveau réglage.

### Offres et prix (1.3.0)
- À chaque ouverture : `accountApi.plans()` ([[accountApi.ts]] → commande `plans_info`) : **les prix sont toujours ceux de Stripe**, rien n'est écrit en dur. Offre choisie par défaut : **Annuel**.
- Options affichées (seulement celles en vente), en boutons radio `button.pl3` (`role="radio"`, rond rouge `.rd` sur l'offre choisie), deux colonnes, trois avec l'offre à vie (`.pls.three`) : « Annuel » ({prix/12} par mois, facturé {prix} une fois par an), « Mensuel » (facturé {prix} chaque mois), « À vie » (payé une fois, sans renouvellement). Prix mis en forme par `formatPrice`.
- Promesses (`.prm`, coches) : « Annuler un tweak reste gratuit, toujours » ; « Résiliable à tout moment, depuis l'app ou ton compte » (sauf À vie).
- **Essai** : proposé si l'offre choisie n'est pas À vie, si le mensuel existe et si `trialDays > 0`. Règle de Sofiene (10/11) écrite dans le code : **l'essai est toujours sur le mensuel**, quel que soit le plan choisi. Bouton « Commencer l'essai gratuit de {n} jours » + note « Carte demandée. Gratuit {n} jours, puis l'abonnement mensuel à {prix} par mois, débité automatiquement au jour {n} sauf si tu résilies avant. Un essai par personne. » + lien « Payer maintenant, sans essai » (en bas, `.uln`).
- Sans essai : « Passer Premium » ou « Prendre l'offre à vie ».
- Serveur injoignable (pas d'offres) : un seul bouton « Passer Premium » qui ouvre `SITE_URL/#pricing`.

### Achat
`checkout(withTrial)` ouvre le navigateur sur le serveur de comptes :
- À vie : `ACCOUNT_URL/buy/lifetime` ;
- essai : `ACCOUNT_URL/buy?interval=month&trial=1` ;
- sinon : `ACCOUNT_URL/buy?interval=year` ou `…?interval=month`.
Puis la fenêtre passe à « Termine dans ton navigateur. Une fois payé, crée ton compte avec le même e-mail, puis connecte-toi ici : Premium s'active sur ce PC. » avec la ligne du navigateur (`.brw` : globe, adresse du site, point qui clignote et « En attente du paiement »), « Me connecter » (→ `signin`) et « Revenir aux offres ».

Lien permanent en bas : « J'ai déjà Premium, me connecter » (→ `signin`).

## Aspect (maquettes v5)
- `Modal v5="ups"` : deux colonnes (280 px et le reste, `.mdl.ups`).
- **À gauche** `.upl`, panneau rouge : icône de l'app (`rago-app-dark-64.svg`), puis un grand chiffre `.usig` selon d'où vient la fenêtre :
  - `analysis` : {p} / {n} « points Premium » (`upsell.sideFound`, `upsell.sideFoundSub`) ;
  - `slots` : 30 / 30 « places prises » (`upsell.sideSlots`, `upsell.sideSlotsSub`) ;
  - `preset` : 20 « presets » (`upsell.sidePresets`, `upsell.sidePresetsSub`) ;
  - sinon : 218 « tweaks », « {68} ouverts en gratuit » (`upsell.sideTweaks`, `upsell.sideFree`). Le nombre gratuit est `FREE_COUNT` de [[store.tsx]] (q75, 28/11).
- **À droite** `.upr` : surtitre `.ukk` avec un cadenas, titre rouge `.h2.tape`, le texte ou la liste, « Choisis ton plan » (`.grp`), les plans, les promesses, le grand bouton rouge `.cta` avec une flèche, la note de l'essai `.tn`, puis les liens du bas `.uln`.
- Styles : `s5/pages/win.css` (maquette) ; boutons radio, trois colonnes et grille dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]).

## Liens avec le reste
- [[accountApi.ts]] (`plans`, `formatPrice`), [[analysis.ts]] (`saved`, `findings`), [[LicenseGate.tsx]] (`ACCOUNT_URL`, `SITE_URL`, formulaire), `Modal` ([[Petits composants de l'interface]]), icônes `I` ([[Maquettes v5 dans l'app (s5)]]).
- Paiement côté serveur : [[Paiements Stripe]], pages `/buy` du [[Serveur de licences]].

## À savoir avant de modifier
- Ne jamais écrire un prix en dur : ils viennent de Stripe par le serveur.
- L'essai doit rester sur le mensuel (décision du 10/11/2026, voir [[Décisions]]) ; le serveur applique la même règle.
