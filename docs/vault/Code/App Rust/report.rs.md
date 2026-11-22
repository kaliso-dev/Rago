---
type: code
tags: [code, app, rust, support, confidentialité]
fichier: app/src-tauri/src/report.rs
lignes: 435
maj: 2026-11-10
---
# report.rs

**Rapport pour le support** (RAG-70) : un fichier texte que le joueur joint à son ticket Discord. Rien n'est envoyé par l'app : le fichier est écrit dans `reports\` et le joueur le voit avant de le partager. Tout ce qui identifie le joueur est masqué. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Partage et support]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Commande `support_report(parts)` de [[lib.rs]] : rassemble l'état de l'app (version, serveur `production`/`staging`, offre, dernière recherche de mise à jour, infos du PC de [[system.rs]], réglages appliqués de [[backup.rs]], historique de [[history.rs]], dossier `logs\`), appelle `build`, puis `mask`, puis `write`.
- Licence : **l'offre seulement** (« Premium », « Premium, to renew », « Free ») ; ni l'e-mail ni la clé ne sont lus.
- Commande `show_report(name)` : ouvre l'Explorateur sur le rapport, seulement pour un nom `rago-report-*.txt` du dossier `reports\`, sans `/`, `\`, `:` ni `..` (sinon « Unknown report »).

## Ce que le fichier expose

- `Parts { pc, tweaks, history, logs, network }` : parties cochées (le PC, les réglages, l'historique et les journaux le sont d'office, la carte réseau non : choix de l'interface).
- `Report { path, name, size, text }`, `Input { version, server, license, update, sys, applied, history, logs_dir }`.
- Constantes : **50** lignes d'historique, **3** journaux, **300** dernières lignes par journal.
- `utc(ms)` (date UTC `AAAA-MM-JJ HH:MM`, sans bibliothèque de calendrier), `mask(texte, users, hosts)`, `build(input, parts, now)`, `write(dir, texte, now)`.

## Fonctionnement détaillé

1. `build` : en-tête (date UTC, version et serveur, offre, mise à jour, phrase « Hidden in this file: … »), puis selon les parties :
   - `== PC ==` : Windows et build (Windows 11 ou non), processeur (cœurs, fils), cartes graphiques, mémoire, administrateur, WMIC, fichiers optionnels, dossier Minecraft trouvé ;
   - `== Network adapter ==` : nom, modèle, vitesse de lien ;
   - `== Tweaks applied ==` : date, identifiant, variante, et `failed`, `no backup`, `changed by Windows since` ;
   - `== Last 50 changes ==` : date, OK/ERROR, apply/undo, identifiant, durée, code ;
   - `== Last 3 optimization logs ==` : les 3 `.log` les plus récents de `logs\`, 300 dernières lignes de chacun.
2. `mask` (dans [[lib.rs]], `users` = `USERNAME` et le nom du dossier `USERPROFILE` ; `hosts` = `COMPUTERNAME` et le nom d'hôte lu) :
   - noms du compte → `<user>`, nom du PC → `<pc>`, **mots entiers** sans tenir compte de la casse, le plus long d'abord (le nom du PC qui contient le nom du compte est masqué en entier), 2 caractères au moins ;
   - e-mails → `<email>` ; clés de licence (`RAGO-…`, 3 tirets ou plus, 20 caractères ou plus) → `<license key>` ;
   - adresses IPv4 → `<ip>` (pas un numéro de version plus long comme `10.0.26100.1`) ; adresses MAC (6 paires séparées par `-` ou `:`) → `<mac>`.
3. `write` : `reports\rago-report-AAAA-MM-JJ-HHMM.txt`, **BOM UTF-8** et fins de ligne Windows (le Bloc-notes de Windows 10 lit les accents), puis seuls les **10 derniers** rapports sont gardés.

## Données touchées

- Lit : `logs\*.log`, l'état de l'app en mémoire.
- Écrit : `reports\rago-report-*.txt` (10 au plus).
- Réseau : rien.

## Erreurs et cas limites

- Infos du PC pas encore lues → « Not read yet ». Aucun journal → « No optimization yet ».
- Le masquage des noms tient compte des lettres dont la minuscule change de longueur (« İ », « Ω ») sans décaler le texte.

## Liens avec le reste

- Appelé par [[lib.rs]] ; utilise [[system.rs]] (`SystemInfo`), [[backup.rs]] (`AppliedView`), [[history.rs]] (`Entry`).
- Fonctionnalités : [[Partage et support]], [[Conformité juridique]] (rien n'est envoyé).

## Tests

- `dates_are_utc` : 1970, une date de 2025, le 29/02/2000.
- `masks_what_identifies_the_player` : chemin de profil, nom du PC, e-mail, clé de licence, deux IPv4, une MAC masqués ; numéros de version gardés ; mot entier seulement (« Custom » non touché) ; lettres qui changent de longueur.
- `report_has_the_parts_asked` : parties demandées présentes, carte réseau absente si non cochée, nom du fichier, BOM.

## À savoir avant de modifier

- Toute nouvelle partie doit passer par `mask` avant `write`.
- Ne jamais y mettre l'e-mail du compte, la clé de licence ou un jeton, même masqués : ils ne sont pas lus.
