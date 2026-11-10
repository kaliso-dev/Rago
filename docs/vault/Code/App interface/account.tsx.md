---
type: code
tags: [code, app, typescript, react, compte]
fichier: app/src/lib/account.tsx
lignes: 267
maj: 2026-11-10
---
# account.tsx

Le contexte React du **compte Rago** (nom public, photo, avis) et la logique de l'**invitation à laisser un avis** : quand la montrer, combien de fois, et comment compter le temps d'utilisation réel. Contient aussi la réduction de la photo avant envoi. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Partage et support]] (avis) et [[Paramètres de l'app]] (carte Profil).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- `AccountProvider` est monté dans [[main.tsx (app)]], **à l'intérieur** de `StoreProvider` : il lit la licence et l'état des fenêtres dans [[store.tsx]].
- Il appelle le serveur par [[accountApi.ts]] ; les textes sont dans [[accountText.ts]].
- Consommé par [[ProfileCard.tsx]] (carte Profil des paramètres), [[ReviewPrompt.tsx]] (invitation en bas à droite), [[ReviewDialog.tsx]] (formulaire d'avis et connexion au compte) et `Avatar` (voir [[Petits composants de l'interface]]).

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `PROMPT_KEY` | `"rago.reviewPrompt2"` : mémoire de l'invitation dans `localStorage` |
| `FIRST_AFTER_MS` | 5 min d'utilisation réelle avant la première invitation |
| `SNOOZE_MS` | 7 jours de report après une fermeture |
| `SNOOZE_USE_MS` | et 30 min d'utilisation de plus |
| `MAX_DISMISSALS` | 2 : fermée deux fois, plus jamais |
| `PromptMemo` | `{ usedMs, nextAtMs, snoozeUntil, dismissals, done, reviewed }` |
| `AccountStatus` | `"loading"` (première réponse attendue), `"ready"`, `"offline"` (serveur injoignable) |
| `Dialog` | `null`, `{ kind: "review", fromPrompt }` ou `{ kind: "signin" }` |
| `AccountProvider`, `useAccount()` | fournisseur et lecture du contexte (erreur `"useAccount hors de AccountProvider"`) |
| `Account` | type de ce que renvoie `useAccount()` |
| `shrinkPhoto(file)` | réduit une image avant l'envoi (voir plus bas) |

`useAccount()` renvoie : `via`, `profile`, `review` (état du compte), `status`, `refresh()`, `signIn(email, password)`, `signOut()`, `saveReview(rating, comment, name)`, `deleteReview()`, `setName(name)`, `setPhoto(base64)`, `removePhoto()`, `dialog`, `openReview(fromPrompt?)`, `openSignIn()`, `closeDialog(saved?)`, `showPrompt`, `dismissPrompt()`. Les actions renvoient `null` si tout va bien, sinon l'`AccountError` à afficher.

## Fonctionnement détaillé

### Chargement du compte
- `refresh()` appelle `accountApi.me()` ; succès → `status = "ready"` ; échec au premier essai → `"offline"` (un échec plus tard garde l'état d'avant).
- Relancé à chaque changement d'état ou d'adresse de la licence (connexion Premium, déconnexion).
- Tant que `status` est `offline`, nouvel essai **toutes les 60 s** (sinon l'invitation ne viendrait jamais après un lancement sans réseau).
- Une action qui répond `invalid_token` relance `refresh()`.

### Invitation à laisser un avis (règles écrites en tête du fichier)
1. **Horloge d'utilisation réelle** : un minuteur toutes les **5 s** ajoute au plus 5 s à `usedMs` si l'app est au premier plan (fenêtre visible et active, ou un clic/une touche dans la dernière minute) et si le joueur a bougé, cliqué, tapé ou fait défiler dans les **10 dernières minutes** (`pointerdown`, `pointermove`, `keydown`, `wheel`). Le temps est cumulé d'un lancement à l'autre (`rago.reviewPrompt2`). Une fois l'invitation due, le compteur s'arrête jusqu'à ce qu'elle soit vue.
2. **Due** (`isDue`) quand : le stockage marche, pas `done`, pas `reviewed`, `usedMs >= nextAtMs` (5 min au départ) et la date de report est passée.
3. **Affichée** (`showPrompt`) quand elle est due, que le compte a répondu (`ready`), qu'il n'a pas d'avis, que rien d'autre n'occupe l'écran (pas de lot `run`, pas de confirmation, pas de palette, pas d'offre, pas de fenêtre de compte) et que la licence n'est pas `unconfigured` (exe de développement).
4. **Fermée** (`dismissPrompt` : « Plus tard », croix, ou formulaire ouvert depuis l'invitation puis fermé sans envoi) : 1re fois → report de 7 jours **et** 30 min d'utilisation ; 2e fois → `done`, plus jamais.
5. **Avis existant** (réponse du serveur, sur ce PC ou ailleurs) → `reviewed = true`, pas d'invitation. Avis supprimé → `reviewed = false` et l'invitation peut revenir après **5 nouvelles minutes**. Quand le joueur n'est pas connecté (`via` nul), la dernière réponse connue est gardée.
6. Ancienne clé `rago.reviewPrompt` (versions de test, où un avis supprimé bloquait l'invitation pour toujours) : effacée au chargement.
7. Si `localStorage` ne marche pas (test d'écriture de `rago.t` au chargement), l'invitation n'est **jamais** proposée.

### Réduction de la photo (`shrinkPhoto`)
1. Types acceptés : `image/jpeg`, `image/png`, `image/webp`, `image/gif` → sinon `invalid_image`.
2. Fichier de plus de **25 Mo** → `image_too_large`.
3. `createImageBitmap`, carré centré (côté = plus petite dimension), réduit à **512 × 512** au plus, lissage `high`.
4. Exporté en **WebP qualité 0,9**, puis en base64 sans en-tête (par blocs de 32 768 octets pour ne pas dépasser la pile).
Le serveur accepte jusqu'à 5 Mo et recadre lui-même en 256 × 256 ([[accountApi.ts]]).

## Données touchées
- `localStorage` : `rago.reviewPrompt2` (mémoire de l'invitation), `rago.t` (test d'écriture, effacé aussitôt), suppression de `rago.reviewPrompt`.
- Serveur de comptes, par [[account.rs]] : profil, avis, photo.

## Liens avec le reste
- Lit dans [[store.tsx]] : `license`, `run`, `confirm`, `paletteOpen`, `upsell`.
- Rendu : [[ReviewPrompt.tsx]], [[ReviewDialog.tsx]], [[ProfileCard.tsx]] ; montés par [[App.tsx]] et [[Settings.tsx]].
- Les avis publiés apparaissent sur le site (voir [[Site]]) et se modèrent depuis le [[Tableau de bord admin]].

## À savoir avant de modifier
- Les délais (5 min, 7 jours + 30 min, 2 fermetures) sont des choix produit : les changer change le rythme des demandes d'avis aux joueurs.
- Ne jamais montrer l'invitation par-dessus un lot en cours ou une autre fenêtre (règle de `busy`).
