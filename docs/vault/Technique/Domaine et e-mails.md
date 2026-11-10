---
type: technique
tags: [technique, domaine, dns, e-mail, ovh, resend, zimbra]
maj: 2026-11-11
---
# Domaine et e-mails

Le domaine `rago-optimizer.com` (avec un z), ses enregistrements DNS, la boîte de support (Zimbra) et l'envoi des e-mails du serveur (Resend). Aucune valeur secrète ici ([[Clés et secrets]]). Voir aussi [[Netlify]], [[Railway]], [[Personnes et services]].

## OVH (domaine et DNS)
- Domaine acheté chez **OVH** le 08/10 ; serveurs DNS d'OVH (`ns200.anycast.me`, `dns200.anycast.me`) : **tous les enregistrements se changent dans l'espace client OVH**, onglet « Zone DNS » du domaine.
- Compte OVH : celui de Sofiene ; identifiants et codes de secours dans son gestionnaire de mots de passe (11/11).

### Enregistrements en place (lus en DNS public par Claude le 11/11)
| Nom | Type | Valeur | Pour |
|---|---|---|---|
| `rago-optimizer.com` | A | `75.2.60.5` (Netlify) | le [[Site]] |
| `www` | CNAME | `rago-optimiser.netlify.app` | le site |
| `account` | CNAME | `<id>.up.railway.app` (donné par Railway) | le [[Serveur de licences]] de prod |
| `rago-optimizer.com` | MX | `mx0` à `mx3.mail.ovh.net` | boîte Zimbra `support@` |
| `rago-optimizer.com` | TXT | `v=spf1 include:mx.ovh.com ~all` | SPF des e-mails envoyés par OVH |
| `rago-optimizer.com` | TXT | `google-site-verification=…` | propriété du domaine chez Google (Search Console ou écran OAuth) |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | DMARC en mode observation seulement |
| `resend._domainkey` | TXT | clé publique DKIM de Resend | signature des e-mails envoyés par Resend |
| `send` | MX + TXT (SPF) | donnés par Resend | domaine de retour des e-mails Resend |

Pas d'enregistrement `staging` : le staging utilise les adresses `*.netlify.app` et `*.up.railway.app`.

### Règles
- **Ne jamais ajouter les MX de Google** (ni d'un autre service) : ça couperait la boîte Zimbra `support@`.
- Ne pas toucher à `resend._domainkey` ni à `send` : Resend arrêterait d'envoyer (code d'inscription, achats, mot de passe oublié).
- Changer le CNAME `account` casse le serveur de prod sur ce domaine (les apps 1.1.7 et avant passent encore par `rago-production.up.railway.app`, voir [[Railway]]).

## Zimbra (boîte de support)
- Boîte **`support@rago-optimizer.com`** fournie par OVH (offre e-mail du domaine), lue dans le webmail Zimbra d'OVH. Reçoit les e-mails des joueurs (adresse affichée dans les pages légales du [[Site]]).
- Réglages exacts (redirection vers la boîte Gmail de Sofiene, réponse automatique) : **À VÉRIFIER**.

## Resend (e-mails envoyés par le serveur)
- Service d'envoi utilisé par `licensing/src/mailer.js` (API Resend) : lien de réclamation après achat, code à 6 chiffres à l'inscription, abonnement annulé, mot de passe oublié ([[Architecture du serveur]]).
- Expéditeur : `noreply@rago-optimizer.com` (variable `MAIL_FROM`) ; domaine `rago-optimizer.com` vérifié dans Resend (enregistrements `resend._domainkey` et `send` ci-dessus).
- Variables Railway : `RESEND_API_KEY` (secret, permission « Sending access »), `MAIL_FROM`, `MAIL_REPLY_TO` (facultative), `EMAIL_VERIFICATION` ([[Variables d'environnement]]).
- **Sans clé** (local, ou clé retirée) : les e-mails sont écrits dans les logs Railway (préfixe `[mail]`) et les pages renvoient le joueur vers Discord. Sur staging, le sujet est préfixé pour éviter la confusion.
- Offre gratuite de Resend (quota mensuel d'e-mails) : offre réelle du compte **À VÉRIFIER**.
- En cas de souci : tableau de bord Resend → **Emails** (chaque envoi, livré ou rejeté) et **Domains** (le domaine doit rester « Verified »).
