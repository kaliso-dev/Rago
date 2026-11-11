---
type: registre
tags: [bug, suivi]
maj: 2026-11-10
---
# Bugs et incidents

Registre des bugs de l'app et des incidents. Les retours de joueurs au cas par cas sont dans [[Problèmes joueurs]]. Archive complète, avec causes et solutions, pour déboguer plus tard : [[Historique des problèmes]].

## Ouverts ou à surveiller (10/11)
| Bug | Version | État |
|---|---|---|
| **Débit bridé par le profil hitreg** : « Better hitreg » (variante par défaut de `ping_hitreg`) met l'auto-tuning TCP en `HighlyRestricted` ; avec « Packet optimization » Hitreg, Steam tombe à 15 Mbit/s | 1.2.1 et 1.3.0 | vu le 10/11 ([[Problèmes joueurs]]) ; « Best hitreg » par défaut dans la PR #86 vers `staging`, pas fusionnée ; les joueurs qui ont déjà « Better hitreg » le gardent |
| **Tweaks d'une autre marque appliqués** : `availability()` (`app/src/lib/catalog.ts`) dit « ok » tant que les infos du PC ne sont pas chargées (`if (!sys) return { ok: true }`), et le moteur Rust ne revérifie pas. Un preset choisi trop tôt applique `cpu_amd`/`gpu_amd` sur un PC Intel/NVIDIA et la variante par défaut (`sys_ram:16` sur 8 Go) | 1.2.1, toujours sur `staging` le 10/11 | vu le 02/11 dans les logs d'un joueur RBW (crashs et ping, [[Historique des problèmes]]) ; pas de ticket ni de correctif |
| Curseur perdu en plein écran / borderless après « Optimize and play » (suspect : `win_fullscreen` dans le preset Minecraft PvP) | 1.2.1 | contournement donné le 29/10 ; `win_fullscreen` retiré du preset dans la PR #70 (1.2.2 fondue dans la [[Version 1.3.0]], `staging`, pas en prod) (RAG-87) ; cause pas confirmée sur Windows ([[Presets]]) |
| Preset `ping_packets: hitreg` qui chevauche le [[Packet Optimizer]] (ping qui saute) | 1.2.1 | retiré du preset Minecraft PvP dans la PR #70 (1.3.0, `staging`, pas en prod) (RAG-87) |
| Fonctions Windows de la 1.2 jamais testées sur un vrai PC au 28/10 ([[Barre en jeu]], launchers, outils, démarrage auto) | 1.2.0 | Sofiene : « tout fonctionne » le 29/10 (portée exacte À VÉRIFIER) |
| Remise du profil NVIDIA | 1.1.14+ | jamais vérifiée sur un PC NVIDIA |
| **Smart App Control** (Windows 11) bloque l'app au lancement : « could not verify its publisher » (exe non signé). Pas de contournement par app : le joueur doit désactiver Smart App Control | toutes | un joueur le 19/10, plus de nouvelles, suivi arrêté le 01/11 (RAG-84 annulé) ; vraie solution : signer l'exe (RAG-83, quand il y aura le budget) |
| Priorité par jeu (`pri_game`) : mauvais noms d'exe et 105 valeurs sans effet (1.1.14) | 1.1.14 | **corrigé dans la 1.2** (vérifié le 01/11, RAG-85) ; reste à tester sur un vrai PC |
| Erreur WebView2 chez une cliente (16/10) | 1.1.14 | solution donnée sans modifier l'app (compte Windows non administrateur) |
| Code de la pop-up promo créé seulement dans le mode test de Stripe (243 erreurs vues le 17/10) : la pop-up ne marchait pas en prod | site, serveur | commande `npm run admin -- popup <CODE> 50` donnée pour la recréer en live ; fait ou non : À VÉRIFIER |
| Commande admin `discord` qui ne montre pas une récompense donnée au même compte Discord sur un autre compte Rago | serveur | vu le 03/11 ([[Historique des problèmes]]) ; pas de correctif |
| Partage de connexion de l'iPhone en USB pas vu par Windows (Rago Route) | exe de test `staging` | 09/11 ; diagnostic en 5 étapes ajouté le 10/11, à tester par Sofiene ([[Proxy]]) |

## Corrigés en 1.1.14 (présents en 1.1.10)
- Écran bleu 0x7E sous Windows 11 24H2 (RAG-67).
- Aucun réglage appliqué si le dossier utilisateur contient `& ( ) ^ @` ; noms de compte avec caractères spéciaux (RAG-71).
- [[RBW Mod]] qui laisse des services arrêtés, risque de ban (RAG-69).
- Préréglage 3 du réseau en échec (RAG-68) ; annulations destructrices (RAG-60).
- [[Remise à zéro]] déclenchée sur un doute de licence (RAG-72) ; 4 tweaks protégés non remis à la désinstallation.
Voir [[Version 1.1.14]].

## Incidents historiques
- **GitHub Pages** a publié le dépôt privé du 04/10 au 07/10 00:48 (`.bat` Premium, scripts, code serveur). Coupé ; `_config.yml` neutralise une partie du dépôt. **Toujours actif le 10/11** (OBSERVÉ) : Pages publie à chaque push de la branche de prod, et comme `docs/` n'est pas exclu, le vault y est lisible en pages web. À couper dans les réglages de GitHub (q80, [[Fichiers de la racine du dépôt]]).
- Secrets collés dans le chat le 04/10 : régénération demandée ([[Clés et secrets]]).
- Netlify ne publiait plus (appli Netlify désinstallée de GitHub, 10-11/10) : résolu.
- 14/10 : Claude a affirmé à tort que la 1.1.12 contenait « tout le travail » → règle « jamais sans preuve » ([[Règles de travail]]).
- 16-17/10 : Discord bloquait tout le serveur de comptes (« global rate limits ») du 16/10 17:44 UTC au 17/10 vers 11:30 : 14 liaisons Discord ratées, 25 rôles Pro pas donnés ; ne pas les redonner à la main avec `grant-months` (doublon) ([[Historique des problèmes]]).
- 21/10 : minutes GitHub Actions épuisées, plus de build Windows ([[Branches et environnements]]).
- 22/10 : Railway bloque les déploiements (cyberattaque chez Railway), rétabli le soir même ; sans effet sur la 1.2.0.
- 28/10 : signature des mises à jour en échec (secret `TAURI_SIGNING_PRIVATE_KEY` collé avec un retour à la ligne, puis `RAGO_UPDATER_PUBKEY` avec un `%` en trop) ; mise à jour de test invisible (déploiement Railway de staging sauté, `PUBLIC_URL` de staging égal à la prod, `STAGING_RAGO_API_BASE` sans `https://`). Tout corrigé le 28-29/10 ([[Mise à jour automatique]]).
- 09/11 : site-check en échec (GitHub passé à Ubuntu 26.04, que Playwright 1.56.1 ne gère pas) ; corrigé le 10/11 (PR #75, Ubuntu 24.04 fixé) ([[CI GitHub Actions]]).
- 10/11 : sur `staging`, le champ « Your review » de la page compte avait perdu son style (la PR #82 avait retiré, avec les styles de l'ancien admin, celui des zones de texte) ; corrigé le 10/11 (commit `5fa5f06`, PR #84) ; jamais arrivé en prod ([[Styles du serveur (CSS)]], [[Tableau de bord admin]]).
- 10/11 : 3 000 minutes de novembre épuisées en deux jours par la CI du dépôt privé `network-server-rago` ; `rago`, public, n'est pas touché ([[CI GitHub Actions]]).
- `wmic` absent de Windows 11 24H2 (corrigé en 1.1.6).
