---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Carte graphique

Module **Carte graphique** (`gpu`) de l'app 1.2.1 : NVIDIA, AMD et Intel, chacun ses réglages.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Ta carte

### Optimisation NVIDIA `gpu_nvidia` 🔒 🔁
Pack NVIDIA complet : profil faible latence pour tous tes jeux, GPU gardé à fond, télémétrie coupée et réglages du pilote.
- Gain : Le profil peut réduire l'input lag quand le GPU est à 100 % ; le reste a un effet rarement mesurable.
- Inconvénient : GPU à fond même au bureau (chaleur, conso), Netflix peut refuser de se lire, réglages NVIDIA globaux remplacés.
- Nécessite : `gpu:nvidia`
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Optimisation AMD `gpu_amd` 🔒 🔁
Pack AMD complet : économies d'énergie du GPU coupées, GPU forcé en haute fréquence, Chill coupé, Anti-Lag activé et réglages 3D.
- Gain : Anti-Lag peut réduire l'input lag quand le GPU est à 100 % ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de chaleur, de bruit et de conso ; overlay Radeon coupé, synchro verticale forcée sur off (risque de déchirement).
- Nécessite : `gpu:amd`
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Graphique Intel `gpu_intel` 🔒 🔁
Réglages du pilote Intel : synchro verticale adaptative coupée, mémoire vidéo réservée agrandie et profil d'énergie modifié.
- Gain : Effet rarement mesurable : les pilotes Intel récents gèrent seuls leur mémoire vidéo.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:intel`
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

## Toutes les cartes

### GPU général `gpu_general` 🔒 🔁
Réglages pour toutes les cartes : priorité de l'affichage, préemption du GPU coupée, mode MSI et délais d'économie d'énergie.
- Gain : Effet rarement mesurable : beaucoup de ces réglages sont ignorés par les Windows récents.
- Inconvénient : Si une autre appli charge le GPU, l'affichage peut saccader ; un peu plus de mémoire vive sert au cache des fichiers.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### DirectX `gpu_directx` 🔒 🔁
Modifie d'anciens réglages de DirectDraw et Direct3D, utilisés par les versions 7 à 9 de DirectX.
- Gain : Effet improbable : ni Minecraft ni les jeux DirectX 11 et 12 ne lisent ces réglages.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : FPS max, Latence minimale (voir [[Tweaks Presets]]).

## NVIDIA

### Optimisation NVIDIA complète `nv_general` 🔒 🔁
Pack NVIDIA : profil faible latence pour tous tes jeux, mode MSI, préemption et HDCP coupés, télémétrie NVIDIA coupée.
- Gain : Le profil peut réduire l'input lag quand le GPU est à 100 % ; Reflex dans le jeu fait mieux s'il existe.
- Inconvénient : Netflix et les vidéos protégées peuvent refuser de se lire, et tes réglages NVIDIA globaux sont remplacés.
- Nécessite : `gpu:nvidia`, `res:nvidiaProfileInspector.exe`

### Profil pilote Rago (Profile Inspector) `nv_profile` 🔒
Importe le profil « faible latence » de Rago dans le pilote NVIDIA, appliqué à tous tes jeux.
- Gain : Peut réduire l'input lag quand le GPU est à 100 % ; Reflex dans le jeu fait mieux quand il existe.
- Inconvénient : Remplace tes réglages 3D globaux du panneau de configuration NVIDIA, pour tous les jeux.
- Nécessite : `gpu:nvidia`, `res:nvidiaProfileInspector.exe`
- Exécuté par du code Rust natif (`nvidia_profile`), pas par un script.

### Supprimer la télémétrie NVIDIA `nv_telemetry` 🔒 🔁
Coupe la télémétrie NVIDIA : rapports de plantage, collecte de données et vérifications automatiques de mises à jour.
- Gain : Plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Tu peux ne plus être prévenu des nouveaux pilotes NVIDIA, et GeForce Experience ne se met plus à jour seul.
- Nécessite : `gpu:nvidia`

### Économies d'énergie cachées NVIDIA `nv_power` 🔒 🔁
Coupe l'économie d'énergie de l'affichage du pilote NVIDIA et quelques réglages d'économie d'énergie de Windows.
- Gain : Effet rarement mesurable : plusieurs de ces réglages sont souvent ignorés par Windows.
- Inconvénient : Un peu plus de consommation, surtout sur portable ; le détail de batterie par appli peut disparaître.
- Nécessite : `gpu:nvidia`

### Forcer les P-states hauts `nv_pstates` 🔒 🔁
Empêche la carte graphique de baisser sa fréquence quand elle a peu de travail.
- Gain : Peut éviter de petites baisses de fréquence en jeu ; effet souvent faible, le GPU monte déjà vite en charge.
- Inconvénient : Le GPU reste à fond même au bureau : plus de chaleur, de bruit et de consommation.
- Nécessite : `gpu:nvidia`

### Mode MSI sur le GPU `nv_msi` 🔒 🔁
Passe la carte graphique en mode d'interruptions MSI, une façon plus moderne de signaler son travail au processeur.
- Gain : Surtout utile sur du vieux matériel : les cartes graphiques récentes utilisent déjà ce mode.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Désactiver le HDCP (NVIDIA) `nv_hdcp` 🔒 🔁
Coupe le HDCP, la protection anticopie des vidéos, sur la carte graphique NVIDIA.
- Gain : Aucun gain en jeu attendu : le HDCP ne sert qu'à la lecture de vidéos protégées.
- Inconvénient : Netflix, Disney+ et les autres vidéos protégées peuvent refuser de se lire ou passer en basse qualité.
- Nécessite : `gpu:nvidia`

### Désactiver la préemption `nv_preemption` 🔒 ⚠️ 🔁
Coupe la préemption : le GPU finit sa tâche en cours avant de passer à une autre, au lieu de s'interrompre.
- Gain : Effet rarement mesurable en jeu.
- Inconvénient : L'affichage peut saccader si une autre appli charge le GPU, et la projection sans fil (Miracast) peut ne plus marcher.

### DPC sur chaque cœur `nv_dpc` 🔒 🔁
Laisse le pilote NVIDIA traiter ses petites tâches urgentes sur tous les cœurs du processeur au lieu d'un seul.
- Gain : Effet rarement mesurable ; réglage non documenté par NVIDIA.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Désactiver le write combining `nv_writecomb` 🔒 🔁
Désactive le regroupement des écritures mémoire (write combining) dans la planification graphique de Windows.
- Gain : Effet rarement mesurable : ce réglage est souvent ignoré.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Accélération du pilote `nv_accel` 🔒 🔁
Règle l'accélération matérielle de la carte graphique sur « complète ».
- Gain : Aucun effet attendu : c'est déjà le réglage par défaut de Windows.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Mémoire contiguë `nv_contig` 🔒 🔁
Demande au pilote de réserver la mémoire du GPU en un seul bloc dans la mémoire vive.
- Gain : Effet rarement mesurable ; réglage peu documenté.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Nettoyer les restes d'installation NVIDIA `nv_debloat` 🔒 ⚙️
Supprime les fichiers d'installation NVIDIA restés dans le dossier C:\NVIDIA. Le pilote installé n'est pas touché.
- Gain : Libère de l'espace disque ; aucun effet sur les FPS.
- Inconvénient : Pour réparer ou réinstaller le pilote, il faudra retélécharger son installateur.
- Nécessite : `gpu:nvidia`

### Réglages NVIDIA avancés `nv_advanced` 🔒 ⚠️ 🔁
Une quarantaine de réglages internes du pilote NVIDIA et de l'alimentation, avec la télémétrie NVIDIA et Miracast coupés.
- Gain : Effet rarement mesurable : la plupart de ces réglages ne sont pas documentés.
- Inconvénient : La projection sans fil (Miracast) peut ne plus marcher.

### PowerMizer en performance `nv_powermizer` 🔒 🔁
Règle la gestion d'énergie NVIDIA (PowerMizer) sur performance maximale.
- Gain : Peut éviter de petites baisses de fréquence en jeu ; effet incertain sur les pilotes récents.
- Inconvénient : Le GPU reste plus souvent à haute fréquence : plus de chaleur, de bruit et de consommation.
- Nécessite : `gpu:nvidia`

### Tolérance de latence NVIDIA `nv_latency` 🔒 🔁
Raccourcit des délais internes du pilote NVIDIA avant ses passages en économie d'énergie, sur la première carte graphique.
- Gain : Effet rarement mesurable : réglages non documentés, et sur portable ils peuvent viser la puce intégrée.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:nvidia`

### Activer KBoost `nv_kboost` 🔒 ⚠️ 🔁
Bloque la carte graphique NVIDIA à sa fréquence maximale en permanence, même au bureau.
- Gain : Peut éviter de petites baisses de fréquence en jeu ; sur portable, peut viser la puce intégrée à la place.
- Inconvénient : Plus de chaleur, de bruit, de consommation et d'usure, même quand tu ne joues pas.

## AMD

### Réglages AMD généraux `amd_general` 🔒 🔁
Réglages du pilote AMD : file d'images réduite, textures en mode performance, overlay Radeon et options annexes coupés.
- Gain : Peut réduire un peu l'input lag quand le GPU est à 100 % ; effet incertain sur les pilotes récents.
- Inconvénient : Textures parfois un peu moins nettes, overlay Radeon en jeu coupé et un peu plus de conso au repos.
- Nécessite : `gpu:amd`

### Économies d'énergie AMD `amd_power` 🔒 🔁
Coupe les économies d'énergie internes de chaque carte AMD, dont sa mise en veille très basse consommation.
- Gain : Peut éviter de petits à-coups quand la carte se réveille ; effet souvent faible.
- Inconvénient : Plus de consommation et de chaleur au repos, surtout sur portable.
- Nécessite : `gpu:amd`

### Désactiver le HDCP (AMD) `amd_hdcp` 🔒 🔁
Essaie de couper le HDCP, la protection anticopie des vidéos, sur la carte AMD.
- Gain : Effet improbable : le réglage vise un modèle d'écran précis, sans doute pas le tien ; aucun gain en jeu.
- Inconvénient : S'il s'applique, Netflix et les autres vidéos protégées peuvent refuser de se lire.
- Nécessite : `gpu:amd`

### Veille de la mémoire GPU `amd_memsleep` 🔒 🔁
Empêche la puce graphique AMD de passer en veille profonde quand elle a peu de travail.
- Gain : Peut éviter de petits à-coups au réveil du GPU ; effet souvent faible.
- Inconvénient : Un peu plus de consommation et de chaleur au repos.
- Nécessite : `gpu:amd`

### Activer De-Lag `amd_delag` 🔒 🔁
Active Anti-Lag dans le pilote AMD, qui empêche le processeur de prendre trop d'avance sur la carte graphique.
- Gain : Peut réduire l'input lag quand le GPU est à 100 % ; sans effet sinon.
- Inconvénient : Peut coûter un peu de FPS dans certains jeux.
- Nécessite : `gpu:amd`

### Désactiver les journaux AMD `amd_logging` 🔒 🔁
Désactive le service de journaux du pilote AMD.
- Gain : Effet rarement mesurable : un petit service de fond en moins.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:amd`

### Réglages AMD avancés `amd_advanced` 🔒 ⚠️ 🔁
Pack AMD avancé : économies d'énergie coupées, GPU forcé en haute fréquence, Chill coupé, Anti-Lag activé et réglages 3D.
- Gain : Anti-Lag peut réduire l'input lag quand le GPU est à 100 % ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de chaleur, de bruit et de conso ; overlay Radeon coupé, synchro verticale forcée sur off (risque de déchirement).

## Intel

### Réglages GPU Intel `intel_gpu` 🔒 🔁
Réglages du pilote Intel : synchro verticale adaptative coupée, mémoire vidéo réservée agrandie et profil d'énergie modifié.
- Gain : Effet rarement mesurable : les pilotes Intel récents gèrent seuls leur mémoire vidéo.
- Inconvénient : Aucun inconvénient connu.
- Nécessite : `gpu:intel`
- Jumeau de `gpu_intel` (même script, compté une fois).
