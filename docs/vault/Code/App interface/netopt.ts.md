---
type: code
tags: [code, app, typescript, reseau]
fichier: app/src/lib/netopt.ts
lignes: 289
maj: 2026-11-10
---
# netopt.ts

Les **types, profils et formules du Packet Optimizer** côté interface : options choisies par le joueur, 6 profils, conseil « Analyser mon PC », calcul des valeurs exactes de Windows affichées sous les curseurs, traduction des lignes du moteur. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Packet Optimizer]]. Côté Rust : [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Utilisé par la page [[NetOpt.tsx]] (et par [[api.ts]] pour les types de `netOptState`, `netOptRun`, `onNetOptLine`). [[NetTest.tsx]] écrit dans le brouillon (`saveDraft`) pour activer la tolérance aux pertes.
- **Règle d'or** écrite en tête : les formules sont celles de `compute` dans [[netopt.rs]] (testées là-bas), elles-mêmes reprises du `:compute` de `network_optimizer.bat`. **Le moteur reçoit les choix (`NetOptions`), jamais ces valeurs** : le calcul ici ne sert qu'à l'affichage.

## Ce que le fichier expose

### Types
- `NetExpert` : valeurs forcées à la main (« Réglages experts », sinon Auto) : `minRto`, `initialRto`, `icw`, `ackFrequency`, `ackTimeout`, `dscp`, `timestamps`, `ecn`, `interruptModeration`.
- `NetOptions` : `smart`, `latency` (0 = latence la plus basse, 100 = Windows), `responsiveness` (0 = Windows, 100 = réactif), `tuning` (0 auto, 1 normal, 2 restricted, 3 highly restricted, 4 disabled, 5 experimental, 6 laisser), `line` (1 fibre, 2 câble, 3 VDSL, 4 ADSL, 5 Wi-Fi, 6 4G/5G, 7 satellite), `stable`, `competitive`, `mtuMode` (0 laisser, 1 auto, 2 valeur), `mtu`, `delay`, `priority`, `congestion` (0 laisser, 1 CUBIC, 2 NewReno, 3 CTCP, 4 DCTCP, 5 BBR2), `priorityMode`, `powerSaving`, `wifi`, `bgGuard`, `target`, `preset`, `expert`.
- `NetSaved { options, at, ok, warn, fail }`, `NetState { applied, backup, busy }`.
- `NetAction` : `apply`, `restore`, `defaults`, `quality`, `loaded`, `mtu`, `detect`, `status`.
- `NetLine { action, tag: ok|warn|fail|info|title|progress, text, step, total }` (événement `netopt:line`), `NetOutcome { code, ok, warn, fail, result }`.
- `PresetId`, `Why { key, vars? }`, `NetValues`.

### Constantes
- `NET_DEFAULTS` : `smart` oui, `latency` 50, `responsiveness` 60, `tuning` 0, `line` 1 (fibre), `stable` oui, `competitive` non, `mtuMode` 1, `mtu` 1500, `delay` 30, `priority` 60, `congestion` 0, `priorityMode` non, `powerSaving` oui, `wifi` non, `bgGuard` non, `target` `1.1.1.1`, `preset` `balanced`, `expert` vide.
- `PRESETS` : `hitreg`, `knockback`, `balanced`, `wifi`, `unstable`, `classic`.
- `DSCP_NAMES` : 32 `CS4`, 34 `AF41`, 40 `CS5`, 46 `EF`, 48 `CS6`.
- `WINDOWS_VALUES` : `computeNet` avec les curseurs au bout « Windows » (latence 100, réactivité 0, délai 100, priorité 0, `tuning` 1, stable) : ce que Windows utilise sans optimiseur, affiché en comparaison.

### Fonctions
| Fonction | Rôle |
|---|---|
| `loadDraft()` / `saveDraft(o)` | brouillon des réglages pas encore appliqués, `localStorage` `rago.netoptDraft` (fusionné avec `NET_DEFAULTS` à la lecture ; `null` l'efface) |
| `applyPreset(o, id)` | applique un profil (table ci-dessous) ; garde la ligne, la stabilité et le serveur ; repasse les réglages experts en Auto, `mtuMode` 1, `congestion` 0, `tuning` 0, `wifi` = ligne Wi-Fi |
| `recommend(o, pc, m)` | profil conseillé par « Analyser mon PC » (voir plus bas) |
| `dscpOf(priority)` | 0 → 0 ; < 20 → 32 ; < 40 → 34 ; < 60 → 40 ; < 90 → 46 ; sinon 48 |
| `computeNet(o)` | valeurs exactes de Windows (voir plus bas) |
| `engineText(text, lang)` | traduit en français les titres d'étapes et les libellés du tableau « État actuel » envoyés en anglais par le moteur ; le journal détaillé reste en anglais |

## Fonctionnement détaillé

### Les 6 profils (`applyPreset`)
| Profil | smart | latency | responsiveness | competitive | delay | priority | priorityMode | powerSaving | bgGuard | autres |
|---|---|---|---|---|---|---|---|---|---|---|
| `hitreg` | oui | 15 | 100 | oui | 0 | 90 | oui | oui | oui | |
| `knockback` | oui | 0 | 85 | oui | 0 | 70 | oui | oui | oui | |
| `balanced` | oui | 50 | 60 | non | 30 | 60 | non | oui | non | |
| `wifi` | oui | 40 | 70 | oui | 0 | 95 | oui | oui | oui | `line` 5, `wifi` oui |
| `unstable` | oui | 60 | 50 | oui | 20 | 70 | oui | oui | oui | `stable` non, `congestion` 1 (CUBIC) |
| `classic` | oui | 0 | 100 | non | 0 | 0 | oui | oui | non | `tuning` 4 (disabled), `congestion` 2 (NewReno), `stable` oui |

### Conseil « Analyser mon PC » (`recommend`)
Entrées : options actuelles, `{ wifi, threads }` du PC, et une mesure de 40 pings vers Internet (`null` si pas de réponse).
1. Ligne **instable** si pertes ≥ 1 %, gigue ≥ 6 ms ou pics ≥ 3 (seuils des profils du `.bat`).
2. Ligne **excellente** si stable, ping ≤ 40 ms, gigue ≤ 2 ms et 0 perte.
3. Profil : Wi-Fi → `wifi` ; sinon instable → `unstable` ; excellente → `hitreg` ; sinon `balanced`.
4. Ligne : Wi-Fi → 5 ; câble → la ligne choisie, sauf si elle disait Wi-Fi (→ fibre).
5. Avec une mesure, `stable` = pas instable.
6. Raisons (`why`, clés `an.*` de [[i18n.ts]]) : `an.why.wifi`/`an.why.wired`, puis `an.why.noTest` ou `an.why.bad`/`great`/`ok` avec moyenne, gigue, pertes, nombre d'essais, pics ; puis `an.for.<profil>` (sauf Wi-Fi).
7. Processeur de 4 threads ou moins et `latency` < 20 : `latency` remonté à 20 (la carte garde un peu de modération des interruptions) et raison `an.why.cpu`.
Rien n'est appliqué : les réglages se posent dans la page, le joueur clique ensuite « Appliquer ».

### Valeurs exactes (`computeNet`)
Avec `agr = 100 − latency`, `r = responsiveness`, `d = delay` et des divisions entières :
- Désactivés selon `agr` : bridage réseau si `agr` ≥ 1, RSC ≥ 20, regroupement des paquets ≥ 40, contrôle de flux ≥ 50, LSO ≥ 60.
- Modération des interruptions : 2 si `agr` ≥ 85, 1 si ≥ 60, sinon 0 ; forcée à 0 ou 2 par l'expert.
- Planchers selon la ligne `[min RTO, RTO initial]` : câble [30, 300], VDSL [40, 600], ADSL [60, 1000], Wi-Fi [60, 600], 4G/5G [100, 1000], satellite [120, 1000], sinon [20, 300] ; ligne instable : min RTO ≥ 120 et RTO initial 1000.
- `minRto = max(((300 − r×28/10)/10)×10, plancher)` ; `initialRto = max(((1000 − r×7)/10)×10, plancher)`.
- `systemResponsiveness = 20 − r/10`.
- `timestamps` et `rttResiliency` = ligne instable (sauf forçage expert de `timestamps`) ; `ecn` = expert ou non.
- Fenêtre TCP auto : `restricted` (câble, satellite), `highlyrestricted` (VDSL, 4G/5G), `disabled` (ADSL), sinon `normal` ; `tuning` choisi la remplace sauf en Auto.
- ACK : fréquence 2 si `d` ≥ 50, sinon 1 ; délai `((10 + d×30/100)/10)×10` ms ; ticks de l'ACK retardé 2 si `d` ≥ 75, 1 si ≥ 50, sinon 0 ; Nagle coupé (`noDelay`) si `d` < 50.
- DSCP : expert ou `dscpOf(priority)`, avec son nom.

## Données touchées
- `localStorage` `rago.netoptDraft` (brouillon). L'état appliqué et la sauvegarde sont gardés par le moteur ([[netopt.rs]]).

## Liens avec le reste
- Page : [[NetOpt.tsx]] ; test réseau qui écrit le brouillon : [[NetTest.tsx]] ; outils réseau : [[NetTools.tsx]].
- Moteur : [[netopt.rs]] (formules de référence, application, sauvegarde, tests).

## À savoir avant de modifier
- **Changer une formule ici sans la changer dans [[netopt.rs]] fait mentir l'affichage** : le moteur ne lit pas ces valeurs. Changer d'abord le Rust (et ses tests), puis recopier ici.
- `engineText` ne traduit que les textes connus mot pour mot : un nouveau titre d'étape du moteur reste en anglais en français tant qu'il n'est pas ajouté à `FR_EXACT` ou `FR_PATTERNS`.
