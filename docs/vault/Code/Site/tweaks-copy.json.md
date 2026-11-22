---
type: code
tags: [code, site, json, catalogue]
fichier: site/src/tweaks-copy.json
lignes: 1582
maj: 2026-11-10
---
# tweaks-copy.json

Les textes propres au site pour chaque tweak de la page Tweaks : un résumé, une explication, les objectifs qu'il sert, et parfois ce que l'arrêt ne remet pas ou le redémarrage réel. Fiche parente : [[Code du site]]. Fonctionnalité : [[Catalogue des tweaks]], [[Site]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11). Fichier écrit à la main (avec Claude), **pas généré**. Lu uniquement par [[sync_tweaks.py]].

## Format
Un objet JSON dont chaque clé est la **clé distincte** d'un tweak (le `twin` du catalogue s'il existe, sinon l'`id`) et chaque valeur un objet :

| Champ | Obligatoire | Contenu |
|---|---|---|
| `summary` | oui | une phrase courte (environ 80 caractères en moyenne) affichée sous le nom dans la liste |
| `about` | oui | l'explication en langage simple (environ 375 caractères en moyenne) affichée en haut de la fiche ouverte |
| `helps` | oui | 1 à 3 objectifs parmi FPS, Smoothness, Input lag, Connection, Hitreg, Background, Privacy, Cleanup, Recovery (plus « Screenshare », voir plus bas) : badges de la fiche et filtres « Helps with » |
| `undo` | non | remplace la phrase « Turn it off and your previous settings come back. » quand l'arrêt ne remet pas tout (fichiers supprimés, application désinstallée, profil NVIDIA non restauré…) |
| `restart` | non | texte du redémarrage quand le catalogue dit « pas de redémarrage » mais que la modification n'agit qu'après un redémarrage ou une déconnexion |

Exemple de forme (sans contenu réel) : `"cle_du_tweak": {"summary": "…", "about": "…", "helps": ["Hitreg", "Connection"]}`.

## Chiffres (10/11)
- **218** entrées, exactement une par tweak distinct du catalogue de l'app 1.3.0 : aucune manquante, aucune en trop (vérifié par [[sync_tweaks.py]], qui n'affiche aucun avertissement).
- `undo` : **13** entrées (ex. `in_windows`, `exp_smb`, `sys_ram`, `pow_ultimate`, `pow_devices`, `pow_storage_apm`, `pow_delete_plans`, `sto_general`, `dbl_cortana`, `win_services`, `gpu_nvidia`, `nv_general`, `nv_profile`).
- `restart` : **5** entrées : `net_profile` (« Needed for some profiles », donc valeur `v`), `net_ipv6` et `dbl_onedrive_off` (« Needed »), `in_mouse` et `in_keyboard` (« Sign out or restart to apply »).
- Objectifs utilisés : Smoothness 66, Background 49, Input lag 38, Privacy 33, Connection 32, Cleanup 14, FPS 11, Recovery 8, Hitreg 3, Screenshare 1 (`rbw_mode`). « Screenshare » n'est pas dans la liste `GOALS` de [[sync_tweaks.py]] : il s'affiche comme badge sur la fiche RBW Mod mais n'a pas de bouton de filtre.

## Historique
Créé le 12/10 avec la page Tweaks (`1e28ec9`, PR #39, alors 199 tweaks), mis à jour le 16/10 pour l'app 1.1.14 (`995b238`) et le 29/10 pour l'app 1.2.1 (`57ea47f`). Les tweaks de la 1.3.0 sont couverts (218 entrées).

## Liens avec le reste
- Lu par [[sync_tweaks.py]] ; rendu dans [[tweaks.html]].
- Doit suivre [[catalog.json]] : chaque nouveau tweak de l'app demande une entrée ici.
- Ton et vocabulaire : [[Voix et ton]] (anglais US, phrases simples, pas de promesse chiffrée).

## À savoir avant de modifier
- La clé est la clé **distincte** : pour deux jumeaux, une seule entrée, sous le nom du `twin`.
- `undo` et `restart` doivent être vérifiés contre le script réel du tweak (règle écrite dans [[sync_tweaks.py]]) : ce sont des engagements affichés aux joueurs.
- Les textes sont en anglais US (le site n'existe qu'en anglais).
