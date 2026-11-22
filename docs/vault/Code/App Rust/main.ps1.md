---
type: code
tags: [code, app, powershell, réseau, packet-optimizer]
fichier: app/src-tauri/netopt/main.ps1
lignes: 17
maj: 2026-11-10
---
# main.ps1

**Point d'entrée** du moteur PowerShell du Packet Optimizer : il lance la fonction de l'action demandée par [[netopt.rs]] et rend son code de sortie. Fiche parente : [[netopt.rs]]. Fonctionnalité : [[Packet Optimizer]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- [[netopt.rs]] assemble un seul script : [[common.ps1]] + ([[apply.ps1]] pour `apply` seulement) + `main.ps1`, **dans cet ordre** : toutes les fonctions sont définies avant le point d'entrée (vérifié par le test `apply_needs_the_premium_part`).
- Livré dans la partie **gratuite** des scripts chiffrés (`"netopt.main"` dans `embed_scripts.rs`).

## Fonctionnement détaillé

1. Crée le dossier `$Dir` (`RN_DIR`, le dossier `netopt\` des données de l'app) s'il manque.
2. Efface `log.txt` s'il dépasse **1 Mo**.
3. Selon `RN_ACTION` : `apply` → `Do-Apply` ; `restore` → `Do-Restore` ; `defaults` → `Do-Defaults` ; `quality` → `Do-Quality` ; `loaded` → `Do-Loaded` ; `mtu` → `Do-Mtu` ; `detect` → `Do-Detect` ; `status` → `Do-Status` ; autre → ligne `@@NO|X|Unknown action` et code 1. Le code retenu est la **dernière valeur** sortie par la fonction (`Select-Object -Last 1`), car PowerShell renvoie aussi tout ce qui n'a pas été absorbé.
4. Si ce n'est pas un entier, code 0. `exit` avec ce code.

## Erreurs et cas limites

- Pour `apply` sans [[apply.ps1]] (partie Premium absente), `Do-Apply` n'existe pas : ce cas n'arrive pas, car [[netopt.rs]] refuse avant (`premium_scripts_unavailable`).

## Liens avec le reste

- Fonctions appelées : [[common.ps1]] (`Do-Restore`, `Do-Defaults`, `Do-Quality`, `Do-Loaded`, `Do-Mtu`, `Do-Detect`, `Do-Status`, `EnvStr`, `Log`) et [[apply.ps1]] (`Do-Apply`).
- Lancé par [[netopt.rs]].

## À savoir avant de modifier

- Garder le texte en ASCII et sans commande interactive (test `engine_text_is_safe_to_run_hidden` de [[netopt.rs]]).
- Une nouvelle action se déclare aux deux endroits : `Action` dans [[netopt.rs]] et le `switch` ici.
