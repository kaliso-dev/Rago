---
type: code
tags: [code, site, json, partenaires]
fichier: site/src/partners.json
lignes: 11
maj: 2026-11-10
---
# partners.json

La liste des serveurs Minecraft partenaires affichés sur le site, dans l'ordre d'affichage : nom exact, lien d'invitation Discord, logo, présence sur l'accueil. Fiche parente : [[Code du site]]. Fonctionnalité : [[Partenaires et créateurs]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11). Fichier écrit à la main, **pas généré** ; lu uniquement par [[sync_partners.py]]. Créé le 16/10 (`f76cba4`, PR #54 ; prod #55).

## Format
Un objet JSON avec deux clés :
- `_about` : le mode d'emploi, en anglais : ordre = ordre d'affichage ; l'accueil montre les entrées `"home": true` (**en garder 4** pour que ses rangées restent pleines) ; `partners.html` les montre toutes ; nom et lien « exactly as the team gives them, never made up » ; logo carré WebP de **256 px** dans `site/img/partners/` ; pour un logo animé, `still` est sa première image, montrée quand les animations sont coupées ; puis lancer `python3 site/tools/build.py`.
- `partners` : tableau d'objets :

| Champ | Obligatoire | Règle vérifiée par [[sync_partners.py]] |
|---|---|---|
| `name` | oui | chaîne non vide, sans espace autour : le nom exact du serveur |
| `url` | oui | lien complet `https://…` (invitation Discord) |
| `logo` | oui | `img/partners/<minuscules-chiffres-tirets>.webp`, fichier existant |
| `still` | non | même règle ; image fixe d'un logo animé |
| `home` | non | `true` = aussi sur l'accueil |

## Contenu (10/11)
Six serveurs (noms publics de serveurs Discord) :

| Ordre | Nom | Accueil | Logo |
|---|---|---|---|
| 1 | Pika Ranked Bedwars | oui | `pika-ranked-bedwars.webp` |
| 2 | Ranked Bedwars | oui | `ranked-bedwars.webp` |
| 3 | Ranked Bedwars [SEASON 8] | oui | `ranked-bedwars-season-8.webp` |
| 4 | Axora Ranked Bedwars | oui | `axora-ranked-bedwars.webp` |
| 5 | Ranked Bedwars 2v2s [SEASON 1] | non | `ranked-bedwars-2v2s.webp` (animé, 57 Ko) + `ranked-bedwars-2v2s-still.webp` |
| 6 | Ayor Ranked Bedwars | non | `ayor-ranked-bedwars.webp` |

Les 7 images de `site/img/partners/` sont toutes utilisées. Les liens d'invitation ne sont pas recopiés ici (ils sont publics sur le site, mais changent quand un serveur renouvelle son invitation).

## Liens avec le reste
- Lu par [[sync_partners.py]] (lancé par [[build.py]]) ; rendu dans [[page.html]] (section Partners, 4 cartes) et [[partners.html]] (6 cartes).
- Côté marketing (qui sont les partenaires, ce qu'ils reçoivent) : [[Partenaires et créateurs]].

## À savoir avant de modifier
- Ajouter un partenaire : déposer son logo dans `site/img/partners/`, ajouter l'entrée, lancer `python3 site/tools/build.py`, commiter `src/partners.json`, `src/page.html`, `src/partners.html`, `index.html`, `partners.html` et l'image.
- Ne jamais inventer un nom ou un lien : seulement ce que l'équipe du serveur donne.
