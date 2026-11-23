---
type: code
tags: [code, app, typescript, react, licence]
fichier: app/src/components/LicenseGate.tsx
lignes: 327
maj: 2026-11-23
---
# LicenseGate.tsx

Le **formulaire de connexion Premium** dans l'app : Google, Discord ou e-mail et mot de passe, confirmation de l'appareil, activation, écran de succès. Le fichier définit aussi les **adresses** utilisées partout dans l'interface (compte, site, Discord, support). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Licence dans l'app]], [[Connexion Google et Discord]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, PR #131 fusionnée le 24/11 : carte refaite sur les maquettes v5 `app-gate-*`).

## Ce que le fichier expose

### Adresses (constantes exportées)
| Nom | Valeur | Utilisée par |
|---|---|---|
| `ACCOUNT_URL` | **origine** de `VITE_ACCOUNT_URL` (au build = `RAGO_API_BASE`, voir [[Variables d'environnement]]) ; à défaut `http://localhost:8787` (serveur local de développement) | `/forgot`, `/account`, pages d'achat de [[Upsell.tsx]], [[ReviewDialog.tsx]], [[Settings.tsx]] |
| `SITE_URL` | `VITE_SITE_URL` sans `/` final ; vide → `ACCOUNT_URL` (dont la racine redirige vers le site en gardant `#pricing`) | `#pricing`, [[LicenseNotice.tsx]], [[Settings.tsx]] |
| `DISCORD_URL` | invitation permanente du Discord de Rago, **écrite en dur** (la même que sur le site) | [[Sidebar.tsx]] |
| `SUPPORT_URL` | `VITE_SUPPORT_URL` ; vide → `DISCORD_URL` (les tickets sont sur le Discord) | [[LicenseNotice.tsx]], [[Settings.tsx]], [[Share.tsx]] |

Une variable de CI non renseignée arrive comme chaîne vide : d'où `||` et non `??`.

### Composant
`LicenseGate({ onDone })` : le contenu de la fenêtre de connexion, que [[Upsell.tsx]] affiche pour l'offre `signin` (`Modal v5="gate2"`, 500 px). `onDone` est appelé par « Commencer » sur l'écran de succès. L'ancien mode plein écran (`div.gate`, avec son lien de langue), monté nulle part depuis le plan gratuit, a été retiré le 24/11.

## Fonctionnement détaillé (étapes)
En-tête `.gb` : icône de l'app (`rago-app-dark-64.svg`), « rago optimizer », étiquette rouge « Premium ». Chaque étape apparaît en fondu (0,2 s).

1. **Connexion** (`signin`) : « Connecte-toi à Rago Optimizer » ; boutons « Continuer avec Google » et « Continuer avec Discord » ; « ou avec ton email » ; champs e-mail (pré-rempli avec l'adresse de la licence) et mot de passe (`label.fl2` + `input.in3`, bordure rouge au focus) ; grand bouton rouge « Se connecter » avec une flèche (toujours rouge : un champ vide prend le focus au lieu d'envoyer) ; « Ta licence sera liée à ce PC. » avec un cadenas (`.lk3`) ; liens « Créer un compte » (`SITE_URL/#pricing`) et « Mot de passe oublié ? » (`ACCOUNT_URL/forgot`).
   - E-mail : `api.licenseLogin(email, password)` ; le mot de passe est effacé du champ aussitôt ; réponse `active` → succès ; `activationRequired` → étape de confirmation.
2. **Navigateur** (`browser`, 1.3.0) : `api.licenseLinkStart("google" | "discord")` ouvre la page du compte dans le navigateur ; l'app affiche « Termine dans ton navigateur » et un **code** à comparer avec celui de la page (une case par caractère, `.cd2`), avec une roue qui tourne (`.wt`) ; elle interroge `licenseLinkPoll` **toutes les 2 s** (4 s après une erreur `network` ou `rate_limited`) ; le serveur répond `link_expired` après **10 minutes**. Confirmé → succès ou confirmation de l'appareil ; autre erreur → retour à la connexion avec le message. « Retour » arrête l'attente.
3. **Confirmation** (`confirm`) : « Activer Rago Optimizer sur ce PC ? Ta licence sera liée à cet appareil : {nom du PC}. » avec le PC (`.dv`) puis Windows, l'e-mail et l'indice de clé (`dl.fx`) ; bouton rouge « Activer » avec un cadenas (roue pendant l'appel) → `api.licenseActivate()` ; « Retour ».
4. **Succès** (`success`) : la coche dans sa case inclinée (`.ok4`, seule la coche grandit) et « Licence active. Rago Optimizer est prêt. », « Les {218} réglages sont débloqués. », « Verrouillée sur {PC} · {date} », indice de clé, bouton « Commencer ». L'écran reste jusqu'au clic : c'est la confirmation d'activation que voit le joueur. `activated(status, fresh)` du store est appelé ici (`fresh` = vrai après « Activer »).

### Erreurs
- Texte : `expired` → « Ta licence doit être revérifiée en ligne… » ; en anglais, le message du serveur tel quel ; sinon `license.err.<code>` : `invalid_credentials`, `no_license`, `bound_to_other_device`, `revoked`, `rate_limited`, `network`, `unconfigured`, `invalid_token` (« Ta session a expiré. Reconnecte-toi. », retour à la connexion), `invalid_request`, `link_expired`, `server_error`.
- L'erreur est dans `.err2` (icône d'alerte). Liens sous l'erreur (`.gl2`, avec une flèche) : « Obtenir Rago Optimizer Premium » si le serveur donne un lien d'achat ; « Gérer mon compte » (`ACCOUNT_URL/account`) pour `bound_to_other_device` ; « Aide sur Discord » (`SUPPORT_URL`) pour `revoked`, `invalid_request`, `bound_to_other_device`.

## Données touchées
- Commandes `license_login`, `license_link_start`, `license_link_poll`, `license_activate` ([[api.ts]] → [[license.rs]] → [[API du serveur]]).
- Le mot de passe ne reste pas dans l'état React après l'envoi.

## Liens avec le reste
- Store : `license`, `activated`, `activatedAt`, `lang`, `sys` ([[store.tsx]]). Icônes `I` et styles `.gate2`, `.gb`, `.oa`, `.fl2`, `.err2` de `s5/pages/win.css` ([[Maquettes v5 dans l'app (s5)]]).
- Démo : adresses de test (`free…`, `other…`) décrites dans [[api.ts]].

## À savoir avant de modifier
- `ACCOUNT_URL` ne garde que l'**origine** de `VITE_ACCOUNT_URL` (qui finit par `/api/v1`) : les pages `/forgot`, `/account`, `/buy` sont à la racine du serveur.
