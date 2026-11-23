---
type: code
tags: [code, app, typescript, react, reseau]
fichier: app/src/components/NetTools.tsx
lignes: 74
maj: 2026-11-23
---
# NetTools.tsx

Les **outils du moteur réseau** et l'affichage de leur résultat : test de stabilité, test de bufferbloat, mesure du MTU, état actuel. Depuis le 23/11 (PR #123), ils ne sont plus que dans la rangée « tools » du Packet Optimizer ([[NetOpt.tsx]]), qui lance l'outil ; ce fichier rend le résultat. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Packet Optimizer]], [[Test réseau]]. Côté Rust : [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #123, fusionnée le 23/11). Jamais testé sur Windows.

## Ce que le fichier expose
- `ToolId` = `"quality" | "loaded" | "mtu" | "status"` (ce sont aussi des `NetAction` de [[netopt.ts]]).
- `TOOLS` : les quatre outils dans l'ordre de la maquette, avec leur icône (activity, gauge, maximize, eye).
- `toolName(id)` : la clé du nom court (`s5.no.t.<id>` : « stability test », « bufferbloat test », « measure mtu », « current state »).
- `validTarget(t)` : cible acceptable (nom d'hôte ou IP, avec `:port` possible) : commence par une lettre ou un chiffre, puis lettres, chiffres, `.`, `:`, `-`, 253 caractères au plus. Aussi utilisé par le serveur au choix de [[NetTest.tsx]].
- `ToolResult({ id, result, onUnstable? })` : le résultat d'un outil, tel que le moteur le renvoie (`result` de `netopt_run`).

## Résultats affichés
| Outil | Résultat |
|---|---|
| `quality` | « Connexion stable » / « Connexion instable » (vert ou rouge) ; « Ping {min} à {max} ms · moyenne {avg} ms · 95 % sous {p95} ms » ; « Gigue … · pertes … % · … pics » ; si instable et que la page le permet, lien « Turn on packet loss tolerance » (`onUnstable`) ; serveur muet : `no.q.noAnswer` |
| `loaded` | « Note {A+…} » (vert pour A+ et A) ; « Au repos {x} ms · ligne chargée {y} ms · +{delta} ms » ; un conseil, bon ou mauvais (bufferbloat : activer SQM, Smart Queue ou QoS dans la box) |
| `mtu` | « MTU idéal : {mtu} · actuel sur {carte} : {actuel} » et la note « Sous 1500, c'est normal avec PPPoE… Rien n'a été changé. » ; échec : `no.m.fail` |
| `status` | tableau clé/valeur envoyé par le moteur (en anglais), traduit par `engineText` ([[netopt.ts]]) ; une ligne à valeur vide est un titre |

- La confirmation du bufferbloat (téléchargement depuis `speed.cloudflare.com`), l'avancement et les erreurs sont affichés par [[NetOpt.tsx]].

## Historique utile
- Jusqu'au 23/11, le fichier exportait un composant `Tool` (ligne complète avec bouton et pourcentage), utilisé par le « Diagnostic avancé » de [[NetTest.tsx]] et par « État actuel » de [[NetOpt.tsx]]. Le diagnostic a disparu avec la maquette v5.

## Liens avec le reste
- Utilisé par [[NetOpt.tsx]] (outils et cible) et [[NetTest.tsx]] (`validTarget`).
- Textes `s5.no.t.*`, `no.tool.*`, `no.q.*`, `no.l.*`, `no.m.*` ([[i18n.ts]]). Styles : `.tres` dans `s5/app.css` ([[Styles de l'app (CSS)]]).
