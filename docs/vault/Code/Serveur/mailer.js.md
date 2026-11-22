---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/mailer.js
lignes: 134
maj: 2026-11-10
---
# mailer.js

Envoie les 4 e-mails du serveur par l'API Resend (achat, code d'inscription, résiliation, mot de passe). Sans clé Resend, l'e-mail est écrit dans les logs. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Abonnement dans l'app]], [[Connexion Google et Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

[[server.js]] crée le service avec `createMailer(cfg)` et le passe à [[app.js]]. La mise en page est faite de tableaux avec des couleurs écrites sur chaque cellule, parce que beaucoup de webmails ignorent le style du `<body>`. Tous les textes sont en anglais (voir [[Voix et ton]]).

## Ce que le fichier expose

- `orderLines(license)` : lignes du récapitulatif de commande `[[libellé, valeur]…]`.
- `createMailer(cfg, {log, fetchImpl})` → `{send, purchase, signupCode, subscriptionCanceled, passwordReset}`.

## Fonctionnement détaillé

**Envoi (`send(to, subject, html, text)`)** :
- sur un serveur de test (`cfg.staging`), le sujet commence par **`[Test] `** : jamais confondu avec un vrai achat ;
- sans `RESEND_API_KEY` : log `[mail] to=… subject="…"` suivi du texte (le parcours marche quand même en local ; les codes d'inscription s'y lisent) ;
- sinon `POST https://api.resend.com/emails` avec `from` = `MAIL_FROM`, `to`, `subject`, `html`, `text`, et `reply_to` = `MAIL_REPLY_TO` s'il est réglé ; réponse non OK → erreur `Resend <statut>: …`.

**Gabarit (`layout`)** : fond `#0A0A0B`, largeur max 520 px, logo `<PUBLIC_URL>/assets/email-wordmark.png` (180 × 29), titre, contenu, pied « Rago Optimizer. Every millisecond counts. » avec liens Terms, Privacy, Cancellation (`<SITE_URL>/terms.html`, `/privacy.html`, `/terms.html#cancel`) et « Support on Discord » si `SUPPORT_URL`. Bouton pilule rouge `#FF3B30`, texte `#0A0A0B`, suivi du lien en clair.

**Récapitulatif (`orderLines`)** : `Plan` = « Rago Optimizer Premium · Monthly / Yearly / Lifetime / Affiliate reward » ; `Paid` (montant formaté en `en-US`) ; pour un essai d'un abonnement : `Free trial` = « N days » et `First payment` = date (ou « When the trial ends »), prix, « unless you cancel before » ; pour un abonnement sans essai : `Renews` = date, « unless you cancel ». Dates en anglais, fuseau UTC.

| E-mail | Fonction | Sujet | Contenu |
|---|---|---|---|
| Achat | `purchase(to, claimUrl, license)` | « Your Rago Optimizer Premium license », ou « Your N-day free trial of Rago Optimizer Premium » | Titre « Payment confirmed » / « Free trial started ». Récapitulatif. Bouton « Create your account » (lien de rattachement `claimUrl`, « Keep it private ») ou « Open your account » (`/account`) si l'achat a été fait connecté. Renonciation au droit de rétractation de 14 jours + « Payments aren't refunded. ». Pour un abonnement : comment résilier (portail, et `STRIPE_PORTAL_LOGIN_URL` s'il est réglé). Paragraphe Discord si `SUPPORT_URL`. |
| Code d'inscription | `signupCode(to, code)` | « `<code>` is your Rago Optimizer code » | Titre « Confirm your email », code à 6 chiffres en grand, valable 15 minutes. |
| Résiliation | `subscriptionCanceled(to, sub)` | « Your subscription is canceled: Rago Optimizer Premium » ou « Your free trial is canceled: … » | Premium reste actif jusqu'à la date de fin, plus aucun prélèvement ; à la fin, l'app remet les réglages modifiés et repasse en gratuit ; « Resume » possible depuis l'app ou le compte. Envoyé seulement quand la résiliation est faite **depuis l'app** (1.3.0). |
| Mot de passe | `passwordReset(to, url)` | « Reset your Rago Optimizer password » | Lien valable 1 heure, bouton « Choose a new password ». |

L'e-mail d'achat sert aussi de **support durable** pour la renonciation au droit de rétractation (obligation légale, voir [[Conformité juridique]]).

## Données touchées

Réseau (Resend). Aucune table.

## Erreurs et cas limites

- Le paragraphe Discord de l'e-mail d'achat dit toujours « open a ticket and give the email of your Rago Optimizer account. Staff check your license and add the role », **même quand le bot du rôle Pro est configuré** (alors que la page compte propose « Link Discord »). À VÉRIFIER avec Sofiene : texte à mettre à jour ?
- [[app.js]] n'envoie pas d'e-mail d'achat pour un achat en double (licence déjà active).

## Liens avec le reste

Appelé par [[app.js]] (webhook, inscription, mot de passe oublié, résiliation depuis l'app). Variables `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` : [[config.js]], [[Variables d'environnement]]. `cfg.mailEnabled` (clé + `MAIL_FROM` réel) décide si le code d'inscription est demandé.

## Tests

« emails go out from MAIL_FROM, with replies to MAIL_REPLY_TO when set » et « staging server: … says so on every page and email » dans `flow.test.js` ; les autres tests remplacent le mailer par un faux qui garde les messages ([[Tests du serveur]]).

## À savoir avant de modifier

- Toute phrase sur le remboursement ou la rétractation doit rester alignée sur les CGV du site ([[Conformité juridique]], décision « plus de remboursement » de la [[Version 1.3.0]]).
- Garder les styles en ligne : les webmails retirent les feuilles de style.
