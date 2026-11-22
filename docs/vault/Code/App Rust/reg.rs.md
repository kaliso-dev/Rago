---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/reg.rs
lignes: 110
maj: 2026-11-10
---
# reg.rs

Petite couche de **lecture du registre** Windows (vue 64 bits) utilisée par la bibliothèque de jeux, la session de jeu et le RBW Mod, avec une seule écriture. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Bibliothèque de jeux]], [[Pendant la partie]], [[RBW Mod]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 21/10. Tout le fichier est `#![cfg(windows)]` : il n'existe pas dans un build Linux ou Mac (les appelants ont leur propre `cfg`).

## Rôle et place dans l'ensemble
À ne pas confondre avec l'accès au registre de [[backup.rs]] (qui relève et remet les valeurs des réglages, toutes racines) et de [[repair.rs]]. Ici, ce sont des lectures simples pour savoir ce qui est installé.

| Appelant | Fonctions utilisées |
|---|---|
| [[games.rs]] | `string` (11 appels), `subkeys` (6) : jeux et launchers installés (Steam, Epic…) |
| [[session.rs]] | `string`, `set_string`, `delete_value` : carte graphique choisie pour chaque jeu |
| [[rbw.rs]] | `subkeys`, `exists`, `dword` : état des services lus par le vérificateur RBW |

## Ce que le fichier expose
| Fonction | Ce qu'elle fait |
|---|---|
| `open(path) -> Option<Key>` | ouvre en lecture (`KEY_READ \| KEY_WOW64_64KEY`) ; `Key` ferme la clé à sa destruction (`RegCloseKey`) |
| `set_string(path, name, value) -> bool` | crée la clé au besoin (`RegCreateKeyExW`, droit `KEY_SET_VALUE` seul) et écrit une chaîne `REG_SZ` |
| `delete_value(path, name) -> bool` | supprime une valeur ; vrai si elle n'existe plus (clé absente ou `ERROR_FILE_NOT_FOUND` comptent comme réussite) |
| `subkeys(path) -> Vec<String>` | noms des sous-clés (`RegEnumKeyExW`, 256 caractères au plus par nom) |
| `string(path, name) -> Option<String>` | valeur `REG_SZ` ou `REG_EXPAND_SZ` (pas développée), sans le zéro final ni les espaces ; `None` si vide ou d'un autre type |
| `dword(path, name) -> Option<u32>` | valeur `REG_DWORD` de 4 octets, sinon `None` |
| `exists(path) -> bool` | la clé s'ouvre |

Racines acceptées : `HKLM`, `HKCU`, `HKU` (pas `HKCR` ni `HKCC`, contrairement à [[backup.rs]]). Une autre racine donne `None` ou `false`.

## Données touchées
Seule écriture : `HKCU\Software\Microsoft\DirectX\UserGpuPreferences`, une valeur par exe de jeu, posée et retirée par [[session.rs]] (option « carte graphique » de [[Pendant la partie]]).

## À savoir avant de modifier
- Garder la vue 64 bits (`KEY_WOW64_64KEY`) : l'app est 64 bits, mais sans ce drapeau une lecture sous `HKLM\SOFTWARE` pourrait tomber sur la vue 32 bits pour certaines clés.
- Toute nouvelle écriture dans le registre qui doit pouvoir être annulée passe par un réglage du catalogue et [[backup.rs]], pas par ce fichier.
