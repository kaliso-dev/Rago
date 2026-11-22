---
type: code
tags: [code, site, python, juridique]
fichier: site/tools/make_legal.py
lignes: 205
maj: 2026-11-10
---
# make_legal.py

Génère les trois pages fixes du site : les conditions de vente (`site/terms.html`), la politique de confidentialité (`site/privacy.html`) et la page d'erreur (`site/404.html`). Le texte juridique est écrit directement dans ce script. Fiche parente : [[Code du site]]. Fonctionnalité : [[Conformité juridique]], [[Offres et prix]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Commande : `python3 site/tools/make_legal.py` (affiche `ok`), puis commiter les trois pages.

## Rôle et place dans l'ensemble
- Les pages légales n'ont **pas** de source dans `site/src/` : on modifie le texte **dans ce script**, jamais dans `terms.html` ou `privacy.html`.
- [[build.py]] ne lance pas ce script et la CI [[site-check.yml]] ne vérifie pas ces pages : rien n'empêche techniquement d'éditer le HTML à la main, mais la prochaine exécution écraserait la modification. Le 10/11, une exécution dans une copie du dépôt donne trois fichiers identiques à ceux commités.
- Depuis le 10/11 (`a190565`) il n'y a **plus de page des remboursements** : commentaire du code « No refunds page since 2026-11-10 (Sofiene: no refunds, the free trial replaces them): cancellation is in the Terms ». L'ancienne adresse `/refunds.html` est redirigée en 301 vers `/terms.html#cancel` par [[netlify.toml]].

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `OUT` | le dossier `site/` |
| `MAIL` | lien `mailto:` vers l'adresse de support |
| `UPD` | date par défaut « October 9, 2026 » (non utilisée aujourd'hui : les deux pages passent `upd="November 10, 2026"`) |
| `SITE` | `https://rago-optimizer.com` (même valeur que [[build.py]]) |
| `HEAD` | gabarit du haut de page : `<!doctype html>`, `lang="en"`, `theme-color` `#0A0A0B`, `{meta}`, `<title>{title} · Rago Optimizer</title>`, icônes, polices locales `fonts/…woff2`, CSS en ligne (couleurs `--ink #0A0A0B`, `--red #FF3B30`…, colonne de 760 px, tableaux dans des cadres arrondis de 24 px), logo `rago-wordmark.svg`, bouton « Back to the site », `<h1>`, « Last updated: {upd} » |
| `FOOT` | pied : liens « Terms of Sale », « Privacy Policy », « Cancellation » (`terms.html#cancel`), « Rago Optimizer » |
| `page(name, title, desc, body, upd)` | écrit `HEAD + body + FOOT` dans `site/<name>` avec une `<meta name="description">` et une `<link rel="canonical" href="https://rago-optimizer.com/<name>">` : les pages légales sont publiques et indexables |

## Fonctionnement détaillé
### `terms.html` : « Terms of Sale » (mise à jour « November 10, 2026 »)
Douze sections numérotées (titres `<h2>`) :
1. **Who we are** : projet indépendant, vendu depuis la France par « the Rago Optimizer team » ; contact par e-mail ou Discord ; hébergeurs Netlify (site) et Railway (pages de compte et serveur de licences). Pas d'adresse postale (voir [[Conformité juridique]]).
2. **What you buy** : Free (jeu de tweaks limité, **30 tweaks actifs au maximum en même temps**, sans compte sauf pour laisser un avis), Premium mensuel ou annuel, Lifetime (Premium en un paiement « for as long as Rago Optimizer Premium is offered »). Aucune promesse de ping ou de FPS.
3. **Prices and payment** : prix en dollars US, pas de TVA (franchise de l'article 293 B du CGI), paiement Stripe ; renouvellement automatique ; codes de réduction valables aussi sur Lifetime ; passage d'un abonnement à Lifetime = l'abonnement est annulé, le temps restant n'est pas remboursé.
4. **Free trial** : **3 jours, sur le mensuel uniquement**, carte demandée sur Stripe, rien n'est prélevé pendant l'essai, prélèvement automatique à la fin ; **un essai par personne** (e-mail et empreinte Stripe de la carte gardés) ; annuel et Lifetime sans essai.
5. **Your license** : une licence = un PC, liée à la première activation ; changement de PC par le support ; échec de renouvellement : Stripe réessaie, puis retour au mode gratuit.
6. **Cancellation, no refunds** (`id="cancel"`) : annulation à tout moment depuis la page compte ; **aucun remboursement** (abonnement, renouvellement, Lifetime), sauf double paiement ou paiement par erreur ; un litige bancaire coupe Premium définitivement ; renonciation au droit de rétractation de 14 jours (UE et Royaume-Uni) pour un contenu numérique livré tout de suite.
7. **Using the app safely** : point de restauration proposé (coché d'office avant les tweaks Advanced), arrêt d'un tweak = réglages remis, actions uniques irréversibles, remise à zéro quand Premium s'arrête ou à la déconnexion ; Rago ne modifie pas Minecraft.
8. **Affiliate program** : 5 % sur le premier paiement Premium avec un code d'affilié ; un parrainage compte quand l'acheteur a activé l'app ; 3 filleuls au maximum, puis une récompense de 6 mois (voir [[Promotions et affiliation]]).
9. **Reviews** : un avis par compte, affiché avec le nom public et la photo, jamais masqué parce qu'il est négatif.
10. **Liability**, 11. **Suspension** (fraude, litige, partage), 12. **Changes and law** (droit français, sans retirer la protection du pays du consommateur).

### `privacy.html` : « Privacy Policy » (mise à jour « November 10, 2026 »)
- **Who is responsible** : l'équipe Rago Optimizer, en France.
- **What we collect, and why** : un tableau à deux colonnes (donnée, raison) : compte et sessions (hachés), code à 6 chiffres de l'inscription (supprimé dans la journée), identifiants Google ou Discord, références de paiement Stripe, identifiants hachés du PC (machine ID Windows, UUID matériel, numéro de série de la carte mère), nom du PC, versions, dernière IP, code d'affilié, nom public / photo (256 × 256, métadonnées retirées) / avis, liaison Discord, données d'essai (e-mail, abonnement, empreinte de carte), membres du serveur Discord (invitations, rôles VIP et MVP), journal de licence, IP gardée brièvement en mémoire, résultats du test réseau (ping, gigue, pertes par serveur, version, ID anonyme du PC, ville / région / pays / fournisseur déduits de l'IP par la base DB-IP **locale**, IP non gardée). Voir [[Test réseau]].
- **Legal basis** ; **Cookies and local storage** : `rg_session`, `rg_claim` (2 jours), `rg_signup` (24 h), `rg_oauth` (10 min), `rg_discord` (10 min), `rago_preview` et `rago_admin` (équipe), `rg_ref` (cookie du serveur de comptes) et `rago_ref` (stockage du site), 30 jours ; `rago_promo_seen`, `rago_promo_seen_code`, `rago_promo_claimed` (stockage du site, 30 jours). Phrase : « We don't use advertising or analytics cookies, and the site loads no third-party fonts or trackers » (c'est pourquoi [[build.py]] remplace Google Fonts par des polices locales).
- **Who processes it for us** : Stripe, Supabase, Railway, Netlify, Resend, OVHcloud, Discord, Google.
- **How long we keep it** : compte : jusqu'à 30 jours après la demande de suppression ; facturation : 10 ans ; journal de sécurité : 12 mois ; essais : 2 ans ; Discord : 12 mois après le départ ; codes d'inscription : 1 jour ; tests réseau : 12 mois.
- **Your rights** (CNIL) et **Changes**.

### `404.html`
Construite à partir de `HEAD` avec `<meta name="robots" content="noindex">`. Comme Netlify la sert pour **n'importe quelle** adresse inconnue (y compris dans un sous-dossier), tous les liens et images sont rendus absolus (`href="/…"`, `src="/…"`, `url("/fonts/…")`), sauf les liens `https:`. Contenu : « This page doesn't exist. », « Error 404 », « The link may be old or mistyped. », boutons « Back to Rago Optimizer » (fond rouge) et « See pricing » (`/#pricing`).

## Données touchées
Écrit `site/terms.html`, `site/privacy.html`, `site/404.html`. Ne lit rien.

## Erreurs et cas limites
- Les accolades du CSS sont doublées (`{{ }}`) parce que `HEAD` passe par `str.format` : une accolade simple ajoutée au CSS fait planter le script.
- `MAIL` est inséré par f-string dans le corps : ne pas mettre d'accolades dans le texte juridique.

## Liens avec le reste
- Pages publiées : [[Fichiers publiés du site]] ; servies par [[Netlify]] (la 404 est celle de Netlify pour tout le domaine).
- Les engagements écrits ici doivent rester vrais dans le code : essai et prix ([[Paiements Stripe]], [[Offres et prix]]), remise à zéro ([[Remise à zéro]]), avis, affiliation ([[Promotions et affiliation]]), test réseau ([[Test réseau]]), données collectées ([[Serveur de licences]]).
- Suivi juridique : [[Conformité juridique]].

## À savoir avant de modifier
- Changer la date « Last updated » à chaque modification de fond (`upd=` de l'appel `page`).
- Toute nouvelle donnée collectée, tout nouveau cookie ou sous-traitant doit être ajouté ici (règle de conformité).
- La phrase « no third-party fonts or trackers » engage le site : ne pas ajouter d'outil d'analyse ou de police externe sans changer cette page (voir aussi [[recherche-conversion (site)]] qui proposait une analyse d'audience, jamais faite).
