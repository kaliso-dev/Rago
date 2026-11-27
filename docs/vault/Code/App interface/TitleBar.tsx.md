---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/TitleBar.tsx
lignes: 67
maj: 2026-11-25
---
# TitleBar.tsx

La **barre du haut** de la maquette v5 (`.topbar`), refaite le 23/11 puis complétée le 25/11 (PR #139, demande de Sofiene). Fiche parente : [[Code de l'app (interface)]] ; voir [[Maquettes v5 dans l'app (s5)]], [[Licence dans l'app]].

De gauche à droite :
- le champ « search games, tweaks, settings » (Ctrl K, ouvre [[SearchPalette.tsx]]) ;
- le bandeau `.tb-env` : « demo » dans le navigateur, « staging » dans l'exe de test (`VITE_RAGO_SERVER=staging`), rien dans le vrai Rago ;
- dans l'exe de test seulement, à la place de ce bandeau : l'avertissement rouge `.tb-env.warn` « Rago Optimizer is also running: quit it » quand la commande `other_rago_running` ([[lib.rs]]) voit le vrai Rago lancé en même temps (vérifié au démarrage puis toutes les 30 s). Une bulle (`title`) explique : deux barres en jeu s'ouvrent sur Alt+X, quitter le vrai Rago depuis son icône près de l'horloge ;
- le **bouton du compte** `.tb-acc`, une fois la licence lue : « Sign in » (rouge, ouvre la connexion `setUpsell("signin")`) sans licence active, ou la pastille « Premium » `.tb-plan` (ouvre les Paramètres, l'e-mail du compte en bulle) avec une licence active. Il avait été retiré le 23/11 parce que la maquette ne l'a pas ; Sofiene l'a redemandé le 25/11 (il ne trouvait plus où se connecter) ;
- les trois boutons de la fenêtre `.wc` (réduire, agrandir, fermer).

On déplace la fenêtre en la tirant ; un double-clic sur le fond l'agrandit. Styles dans `s5/app.css` (`.tb-env`, `.tb-acc`, `.tb-plan`). Jamais testé sur Windows.
