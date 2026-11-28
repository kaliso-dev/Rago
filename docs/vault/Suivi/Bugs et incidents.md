---
type: registre
tags: [bug, suivi]
maj: 2026-11-28
---
# Bugs et incidents

Registre des bugs de l'app et des incidents. Les retours de joueurs au cas par cas sont dans [[Problèmes joueurs]]. Archive complète, avec causes et solutions, pour déboguer plus tard : [[Historique des problèmes]].

## Ouverts ou à surveiller (10/11)
| Bug | Version | État |
|---|---|---|
| **Stream Discord qui saccade et PC qui rame** chez des joueurs qui utilisent l'optimiseur (Sofiene, 13/11 : « leur stream discord bug et sacade et leur pc bug ») ; cause probable : le jeu mis en priorité « Haute » (priorité par jeu, presets, [[Packet Optimizer]], « Jeu en priorité » de [[Pendant la partie]]) | 1.2.1 et 1.3.0 | correctif prêt le 13/11 (« Supérieure à la normale » partout, PC déjà réglés ramenés au lancement, 206 tests Rust passés, rien essayé sur Windows) mais **jamais poussé** sur la demande de Sofiene (« Ne push rien trouve juste le probleme ») ; il n'existe que dans `stream-discord/stream-discord-correctif-complet.patch` du dossier partagé ; la 1.3.0 et la 1.4.1 mettent toujours le jeu en Haute (`session.rs`, CONFIRMÉ le 25/11) ; q109 |
| **Débit bridé par le profil hitreg** : « Better hitreg » (variante par défaut de `ping_hitreg`) met l'auto-tuning TCP en `HighlyRestricted` ; avec « Packet optimization » Hitreg, Steam tombe à 15 Mbit/s | 1.2.1 et 1.3.0 | vu le 10/11 ([[Problèmes joueurs]]) ; « Best hitreg » par défaut dans `staging` depuis le 11/11 (PR #86, fusionnée par la PR #92, version test) ; les joueurs qui ont déjà « Better hitreg » le gardent |
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

## Corrigés pendant la refonte v5 (23/11, jamais sortis)
- **Fenêtres de l'app invisibles** (offre Premium, confirmation d'un lot, choix d'un preset…) : la règle `.scrim{display:none}` de la maquette (voile du rail replié) était reprise dans `s5/base.css` par la PR #119, alors que dans l'app `.scrim` est le fond de toutes les fenêtres ; la fenêtre s'ouvrait avec une largeur nulle. Présent dans `staging` du 23/11 (PR #119) à la PR #123, qui le corrige dans `base.css` et dans son générateur `port_s5.py` ([[Maquettes v5 dans l'app (s5)]]). Jamais sorti dans un exe joueur.
- **Icône de chargement invisible dans les boutons** (test réseau, Rago Route, Packet Optimizer) : la règle `.btn .spin{display:none}` des effets de bouton de la maquette la cachait ; corrigé par la PR #123 (`.btn svg.spin` dans `s5/app.css`).

## Trouvés au test Windows du 25/11 (exe de test, corrigés par la PR #139, jamais testés sur Windows)
- **Tweaks Premium refusés alors que le joueur est Premium** (« This tweak is part of Premium » sur `cpu_pstates`, `cpu_throttle`, `cpu_turbo`) : l'exe de test et la vraie 1.2.1 installée gardaient leur connexion dans le même dossier `%LOCALAPPDATA%\Rago` (`license.bin`, `scripts.bin`, `account.bin`). Chacun vérifie le jeton avec la clé de son propre serveur (staging ou prod) et efface un jeton qu'il ne reconnaît pas : chaque app effaçait la connexion de l'autre. L'exe de test garde maintenant ses fichiers dans `%LOCALAPPDATA%\Rago (gg.rago.optimizer.staging)` ([[license.rs]]) ; il faut s'y reconnecter une fois. La vraie app ne change pas de dossier.
- **Pas de ping dans la pastille, « l'ancienne barre » toujours là** : la 1.2.1 tournait en même temps ; les deux apps prenaient Alt+X et utilisaient les mêmes sessions de mesure Windows (ping, FPS), que chacune arrêtait chez l'autre. Sessions à part pour l'exe de test et avertissement quand le vrai Rago tourne aussi ([[Barre en jeu]]).
- **Noms des modes d'alimentation abîmés** (« RECOMMAND� PAR�HP ») : la sortie de `powercfg` était lue en UTF-8 au lieu de la page de code de la console ([[shell.rs]], [[tools.rs]]). Un mode sans nom affiché par son identifiant devient « Unnamed plan (F31FECF6) ».

## Incidents historiques
- **GitHub Pages** a publié le dépôt privé du 04/10 au 07/10 00:48 (`.bat` Premium, scripts, code serveur). Coupé ; `_config.yml` neutralise une partie du dépôt. Pages a ensuite publié le vault de la branche de prod (OBSERVÉ le 10/11). **Coupé par Sofiene le 28/11** (q80) : plus aucune page publiée (404 vérifié le 28/11) ; une configuration Pages reste visible dans l'API GitHub, À VÉRIFIER ([[Fichiers de la racine du dépôt]]).
- Secrets collés dans le chat le 04/10 : régénération demandée ([[Clés et secrets]]).
- Netlify ne publiait plus (appli Netlify désinstallée de GitHub, 10-11/10) : résolu.
- 14/10 : Claude a affirmé à tort que la 1.1.12 contenait « tout le travail » → règle « jamais sans preuve » ([[Règles de travail]]).
- 16-17/10 : Discord bloquait tout le serveur de comptes (« global rate limits ») du 16/10 17:44 UTC au 17/10 vers 11:30 : 14 liaisons Discord ratées, 25 rôles Pro pas donnés ; ne pas les redonner à la main avec `grant-months` (doublon) ([[Historique des problèmes]]).
- 21/10 : minutes GitHub Actions épuisées, plus de build Windows ([[Branches et environnements]]).
- 22/10 : Railway bloque les déploiements (cyberattaque chez Railway), rétabli le soir même ; sans effet sur la 1.2.0.
- 28/10 : signature des mises à jour en échec (secret `TAURI_SIGNING_PRIVATE_KEY` collé avec un retour à la ligne, puis `RAGO_UPDATER_PUBKEY` avec un `%` en trop) ; mise à jour de test invisible (déploiement Railway de staging sauté, `PUBLIC_URL` de staging égal à la prod, `STAGING_RAGO_API_BASE` sans `https://`). Tout corrigé le 28-29/10 ([[Mise à jour automatique]]).
- 09/11 : site-check en échec (GitHub passé à Ubuntu 26.04, que Playwright 1.56.1 ne gère pas) ; corrigé le 10/11 (PR #75, Ubuntu 24.04 fixé) ([[CI GitHub Actions]]).
- 10/11 : sur `staging`, le champ « Your review » de la page compte avait perdu son style (la PR #82 avait retiré, avec les styles de l'ancien admin, celui des zones de texte) ; corrigé le 10/11 (commit `5fa5f06`, PR #84) ; jamais arrivé en prod ([[Styles du serveur (CSS)]], [[Tableau de bord admin]]).
- 23/11 : builds Windows bloqués (« recent account payments have failed or your spending limit needs to be increased ») : `kaliso-dev/rago` était privé et ses builds prenaient des minutes payantes. Réglé le 24/11 vers 0 h (Paris) : Sofiene a remis le dépôt en public ; l'exe de test de `staging` est reconstruit (run 45285208310, réussi) ([[CI GitHub Actions]]).
- 10/11 : 3 000 minutes de novembre épuisées en deux jours par la CI du dépôt privé `network-server-rago` ; `rago`, public, n'est pas touché ([[CI GitHub Actions]]).
- `wmic` absent de Windows 11 24H2 (corrigé en 1.1.6).
