---
type: code
tags: [code, app, typescript, react, reseau]
fichier: app/src/components/NetTools.tsx
lignes: 114
maj: 2026-11-10
---
# NetTools.tsx

Un **outil du moteur réseau** prêt à afficher : test de stabilité, test de bufferbloat, mesure du MTU, état actuel. Utilisé dans le test réseau et dans le Packet Optimizer. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Test réseau]], [[Packet Optimizer]]. Côté Rust : [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `ToolId` = `"quality" | "loaded" | "mtu" | "status"` (ce sont aussi des `NetAction` de [[netopt.ts]]).
- `validTarget(t)` : cible de test acceptable (nom d'hôte ou IP) : commence par une lettre ou un chiffre, puis lettres, chiffres, `.`, `:`, `-`, 253 caractères au plus.
- `Tool({ id, running, disabled, result, progress, onRun, onUnstable? })` : une ligne d'outil. L'appel au moteur (`api.netOptRun(id, …)`) est fait par la page qui l'affiche ; le composant ne fait qu'afficher.

## Les quatre outils
| Outil | Titre et description | Résultat affiché |
|---|---|---|
| `quality` | « Test de stabilité » : 100 pings vers le serveur : gigue, pertes et pics | « Connexion stable » / « Connexion instable » ; « Ping {min} à {max} ms · moyenne {avg} ms · 95 % sous {p95} ms » ; « Gigue … · pertes … % · … pics » ; si instable et que la page le permet, lien « Activer la tolérance aux pertes » (`onUnstable`) ; serveur muet : « Ce serveur ne répond pas au ping. Essaie son IP, ou 1.1.1.1… » |
| `loaded` | « Test de bufferbloat » : ton ping quand la ligne est chargée, télécharge jusqu'à 200 Mo | **demande une confirmation** : « Ce test télécharge depuis speed.cloudflare.com pendant 12 secondes, jusqu'à 200 Mo… » ; puis « Note {A+…} », « Au repos {x} ms · ligne chargée {y} ms · +{delta} ms » et un conseil (bon : « les téléchargements ne sont pas ton problème » ; mauvais : bufferbloat, activer SQM, Smart Queue ou QoS dans la box) |
| `mtu` | « Mesurer le MTU » : ne change rien | « MTU idéal : {mtu} · actuel sur {carte} : {actuel} » + « Sous 1500, c'est normal avec PPPoE (1492), un VPN ou une box 4G. Rien n'a été changé. » ; échec : « le ping est bloqué sur le chemin » |
| `status` | « État actuel » : ce que Windows utilise vraiment | tableau clé/valeur envoyé par le moteur (en anglais), traduit par `engineText` ([[netopt.ts]]) ; une ligne à valeur vide est un titre |

- Pendant l'exécution, le bouton affiche le pourcentage (`progress.step / progress.total`, tiré des lignes `progress` de l'événement `netopt:line`).

## Liens avec le reste
- Utilisé par [[NetTest.tsx]] (stabilité, bufferbloat, MTU) et [[NetOpt.tsx]] (état actuel, et cibles).
- Textes `no.tool.*`, `no.q.*`, `no.l.*`, `no.m.*` ([[i18n.ts]]).
