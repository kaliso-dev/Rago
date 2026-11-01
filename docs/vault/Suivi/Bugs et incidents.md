---
type: registre
tags: [bug, suivi]
maj: 2026-11-01
---
# Bugs et incidents

Registre des bugs de l'app et des incidents. Les retours de joueurs au cas par cas sont dans [[Problèmes joueurs]]. Référence détaillée au 15/10 : `PROJECT_HANDOFF/05_BUGS_AND_REGRESSIONS.md` ([[Sources]]).

## Ouverts ou à surveiller (01/11)
| Bug | Version | État |
|---|---|---|
| Curseur perdu en plein écran / borderless après « Optimize and play » (suspect : `win_fullscreen` dans le preset Minecraft PvP) | 1.2.1 | contournement donné le 29/10 ; **correctif en cours pour la 1.2.2** (RAG-87), cause encore à confirmer ([[Presets]]) |
| Preset `ping_packets: hitreg` qui chevauche le [[Packet Optimizer]] (ping qui saute) | 1.2.1 | à corriger avec le preset dans la 1.2.2 (RAG-87) |
| Fonctions Windows de la 1.2 jamais testées sur un vrai PC au 28/10 ([[Barre en jeu]], launchers, outils, démarrage auto) | 1.2.0 | Sofiene : « tout fonctionne » le 29/10 (portée exacte À VÉRIFIER) |
| Remise du profil NVIDIA | 1.1.14+ | jamais vérifiée sur un PC NVIDIA |
| **Smart App Control** (Windows 11) bloque l'app au lancement : « could not verify its publisher » (exe non signé). Pas de contournement par app : le joueur doit désactiver Smart App Control | toutes | un joueur le 19/10 (RAG-84, réponse prête à envoyer par Sofiene ; suite À VÉRIFIER) ; vraie solution : signer l'exe (RAG-83, quand il y aura le budget) |
| Priorité par jeu (`pri_game`) : mauvais noms d'exe et 105 valeurs sans effet (1.1.14) | 1.1.14 | **corrigé dans la 1.2** (vérifié le 01/11, RAG-85) ; reste à tester sur un vrai PC |
| Erreur WebView2 chez une cliente (16/10) | 1.1.14 | solution donnée sans modifier l'app |

## Corrigés en 1.1.14 (présents en 1.1.10)
- Écran bleu 0x7E sous Windows 11 24H2 (RAG-67).
- Aucun réglage appliqué si le dossier utilisateur contient `& ( ) ^ @` ; noms de compte avec caractères spéciaux (RAG-71).
- [[RBW Mod]] qui laisse des services arrêtés, risque de ban (RAG-69).
- Préréglage 3 du réseau en échec (RAG-68) ; annulations destructrices (RAG-60).
- [[Remise à zéro]] déclenchée sur un doute de licence (RAG-72) ; 4 tweaks protégés non remis à la désinstallation.
Voir [[Version 1.1.14]].

## Incidents historiques
- **GitHub Pages** a publié le dépôt privé du 04/10 au 07/10 00:48 (`.bat` Premium, scripts, code serveur). Coupé ; `_config.yml` neutralise Pages. Pages à désactiver dans les réglages (À VÉRIFIER).
- Secrets collés dans le chat le 04/10 : régénération demandée ([[Clés et secrets]]).
- Netlify ne publiait plus (appli Netlify désinstallée de GitHub, 10-11/10) : résolu.
- 14/10 : Claude a affirmé à tort que la 1.1.12 contenait « tout le travail » → règle « jamais sans preuve » ([[Règles de travail]]).
- 21/10 : minutes GitHub Actions épuisées, plus de build Windows ([[Branches et environnements]]).
- `wmic` absent de Windows 11 24H2 (corrigé en 1.1.6).
