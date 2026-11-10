---
type: code
tags: [code, app, typescript, textes, compte]
fichier: app/src/lib/accountText.ts
lignes: 167
maj: 2026-11-10
---
# accountText.ts

Les **textes du compte** (carte Profil, invitation à laisser un avis, formulaire d'avis, erreurs du serveur de comptes), en anglais et en français, et le crochet qui les traduit. Fiche parente : [[Code de l'app (interface)]]. Textes principaux de l'app : [[i18n.ts]]. Voix : [[Voix et ton]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Fichier à part de [[i18n.ts]] : il est écrit **d'abord en anglais** (le dictionnaire de référence est `en`, voix de `brand/voice-en.md`) ; `fr` est typé `Record<AccountKey, string>`, donc une clé manquante en français bloque la compilation.
- Utilisé par [[ProfileCard.tsx]], [[ReviewPrompt.tsx]] et [[ReviewDialog.tsx]].

## Ce que le fichier expose
- `type AccountKey = keyof typeof en`.
- `useAccountText()` → `{ at, errorText, lang }` :
  - `at(key, vars?)` : texte dans la langue du store ([[store.tsx]]) ; remplace `{nom}` par `vars.nom` et **laisse `{nom}` tel quel** si la variable manque (différent de `translate`, qui met une chaîne vide). Pas de pluriel.
  - `errorText(err)` : en anglais, le message du serveur s'il y en a un ; sinon le texte `err.<code>` s'il existe ; sinon le message du serveur ; sinon `err.server_error`.

## Contenu (67 clés par langue)
| Préfixe | Clés | Zone |
|---|---|---|
| `profile.` | 24 | carte Profil : photo (ajouter, changer, retirer, « Uploading… »), nom public, avis (laisser, modifier, supprimer avec confirmation), « masqué du site par l'équipe Rago », se déconnecter |
| `review.` | 24 | formulaire d'avis : étoiles, commentaire, nom public, envoi, connexion au compte |
| `prompt.` | 5 | invitation : « Enjoying Rago Optimizer? », « Leave a quick review. It shows on the website with your public name. », « Leave a review », « Not now », « Close » |
| `err.` | 14 | `network`, `invalid_credentials`, `invalid_token`, `rate_limited`, `invalid_rating`, `empty_comment`, `comment_too_long`, `name_required`, `invalid_name`, `invalid_image`, `image_too_large`, `storage_unavailable`, `unconfigured`, `server_error` |

## Liens avec le reste
- Codes d'erreur produits par le serveur (voir [[API du serveur]]), par le simulateur de [[accountApi.ts]] et par `shrinkPhoto` de [[account.tsx]].

## À savoir avant de modifier
- Un nouveau code d'erreur du serveur s'affiche en anglais tel quel en français tant qu'il n'a pas sa clé `err.<code>` : l'ajouter dans les deux langues.
