---
type: code
tags: [code, site, python, juridique]
fichier: site/tools/make_legal.py
lignes: 280
maj: 2026-11-22
---
# make_legal.py

Génère les trois pages fixes du site : les conditions de vente (`site/terms.html`), la politique de confidentialité (`site/privacy.html`) et la page d'erreur (`site/404.html`). Le texte juridique est dans `site/src/legal/terms.html` et `site/src/legal/privacy.html` ([[Textes juridiques (src-legal)]]) ; le script le met en page au design v5. Fiche parente : [[Code du site]]. Fonctionnalité : [[Conformité juridique]], [[Offres et prix]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109, 22/11). Commande : `python3 site/tools/make_legal.py` (affiche les icônes de chaque page puis `legal ok`), puis commiter les trois pages.

## Rôle et place dans l'ensemble
- On modifie le **texte** dans `site/src/legal/*.html` (seulement les sections : `<h2>`, paragraphes, listes, tableau), la **date** dans `UPD` de ce script, puis on lance le script. Jamais `site/terms.html` ou `site/privacy.html` à la main.
- Pourquoi ce découpage (22/11) : la section 4a (option Rago Route) avait été ajoutée à la main dans `site/terms.html` le 13/11 sans passer par le script, qui aurait effacé la section à sa prochaine exécution. Le texte des pages publiées du 22/11 a été repris tel quel dans `src/legal/`.
- [[build.py]] ne lance pas ce script et la CI [[site-check.yml]] ne vérifie pas ces pages.
- Depuis le 10/11 (`a190565`) il n'y a **plus de page des remboursements** (« No refunds page since 2026-11-10 (Sofiene: no refunds, the free trial replaces them): cancellation is in the Terms »).

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `UPD` | date « Last updated » de chaque page : terms « November 13, 2026 », privacy « November 10, 2026 » |
| `SITE`, `ACC`, `DISCORD`, `MAIL` | adresses du site, du serveur de comptes, de l'invitation Discord et lien `mailto:` du support |
| `CSSV`, `JSV`, `OGV`, `KJS` | empreintes de `v5.css`, [[v5.js]] et `og-image.png`, calculées comme [[build.py]] (adresses `?v=`) ; `KJS` : le petit script qui pose `--k` avant le premier affichage, comme [[build.py]] |
| `CSS` | le style des pages légales et de la 404 (maquettes « site-terms », « site-privacy », « site-404 »), en plus de `v5.css` |
| `head()`, `logo()`, `footer()` | haut de page (icônes, préchargement de Barlow Condensed 900 italique, `v5.css?v=`), logo (tuile blanche, R rouge), pied de page v5 commun ; `root="/"` pour la 404 |
| `sections(src, numbered, ids)` | coupe le texte à chaque `<h2>` : une `<section class="lg-sec" id>` par titre, le numéro (« 4a ») à part en contour rouge, et le sommaire ; le tableau `<div class="tbl"><table>` de la confidentialité devient une liste à deux colonnes `.lg-tbl` (rôles ARIA `table`, `row`, `cell`) |
| `glance(cards)` | les quatre encadrés « en bref » sous le titre |
| `legal_page(...)` | écrit une page légale complète puis son sprite d'icônes ([[sync_icons.py]]) |

## Fonctionnement détaillé
### Mise en page commune (design v5)
En-tête (logo, « Back to the site », « Get Premium »), surtitre « Legal // … », grand titre avec coup de pinceau, bascule `nav.lg-seg` entre « Terms of sale » et « Privacy policy », date, quatre encadrés « en bref » (« At a glance. The full terms below are what apply. »), puis deux colonnes : sommaire collant `.lg-toc` (la section lue est surlignée par un petit script) avec la carte « Questions? » (e-mail du support, bouton « Open Discord »), et le texte. La section visée par l'adresse (`:target`, par exemple `terms.html#cancel`) est encadrée. Ids : `s1` à `s12`, sauf la 4a (`route`) et la 6 (`cancel`), qui gardent leur ancienne ancre ; confidentialité : `who`, `collect`, `legal-basis`, `cookies`, `processors`, `keep`, `rights`, `changes`.

### `terms.html` : « Terms of Sale » (mise à jour « November 13, 2026 »)
Encadrés : free trial 3 days (section 4), per license 1 PC (5), cancel anytime (6), payments no refunds (6). Treize sections (titres `<h2>`) :
1. **Who we are** : projet indépendant, vendu depuis la France par « the Rago Optimizer team » ; contact par e-mail ou Discord ; hébergeurs Netlify (site) et Railway (pages de compte et serveur de licences). Pas d'adresse postale (voir [[Conformité juridique]]).
2. **What you buy** : Free (jeu de tweaks limité, **30 tweaks actifs au maximum en même temps**, sans compte sauf pour laisser un avis), Premium mensuel ou annuel, Lifetime (Premium en un paiement « for as long as Rago Optimizer Premium is offered »). Aucune promesse de ping ou de FPS.
3. **Prices and payment** : prix en dollars US, pas de TVA (franchise de l'article 293 B du CGI), paiement Stripe ; renouvellement automatique ; codes de réduction valables aussi sur Lifetime ; passage d'un abonnement à Lifetime = l'abonnement est annulé, le temps restant n'est pas remboursé.
4a. **Rago Route option** (`id="route"`, depuis le 13/11) : 3 $ par mois ou 17,99 $ par an en plus de Premium ou Lifetime, abonnement à part, ajouté au paiement ou depuis le compte, compris dans l'essai gratuit, s'arrête avec Premium, bêta, pas remboursé (voir [[Offres et prix]]).
4. **Free trial** : **3 jours, sur le mensuel uniquement**, carte demandée sur Stripe, rien n'est prélevé pendant l'essai, prélèvement automatique à la fin ; **un essai par personne** (e-mail et empreinte Stripe de la carte gardés) ; annuel et Lifetime sans essai.
5. **Your license** : une licence = un PC, liée à la première activation ; changement de PC par le support ; échec de renouvellement : Stripe réessaie, puis retour au mode gratuit.
6. **Cancellation, no refunds** (`id="cancel"`) : annulation à tout moment depuis la page compte ; **aucun remboursement** (abonnement, renouvellement, Lifetime), sauf double paiement ou paiement par erreur ; un litige bancaire coupe Premium définitivement ; renonciation au droit de rétractation de 14 jours (UE et Royaume-Uni) pour un contenu numérique livré tout de suite.
7. **Using the app safely** : point de restauration proposé (coché d'office avant les tweaks Advanced), arrêt d'un tweak = réglages remis, actions uniques irréversibles, remise à zéro quand Premium s'arrête ou à la déconnexion ; Rago ne modifie pas Minecraft.
8. **Affiliate program** : 5 % sur le premier paiement Premium avec un code d'affilié ; un parrainage compte quand l'acheteur a activé l'app ; 3 filleuls au maximum, puis une récompense de 6 mois (voir [[Promotions et affiliation]]).
9. **Reviews** : un avis par compte, affiché avec le nom public et la photo, jamais masqué parce qu'il est négatif.
10. **Liability**, 11. **Suspension** (fraude, litige, partage), 12. **Changes and law** (droit français, sans retirer la protection du pays du consommateur).

### `privacy.html` : « Privacy Policy » (mise à jour « November 10, 2026 »)
Encadrés : cookies 0 ads, your card Stripe only, network test no IP kept, delete 30 days.
- **Who is responsible** : l'équipe Rago Optimizer, en France.
- **What we collect, and why** : un tableau à deux colonnes (donnée, raison) : compte et sessions (hachés), code à 6 chiffres de l'inscription (supprimé dans la journée), identifiants Google ou Discord, références de paiement Stripe, identifiants hachés du PC (machine ID Windows, UUID matériel, numéro de série de la carte mère), nom du PC, versions, dernière IP, code d'affilié, nom public / photo (256 × 256, métadonnées retirées) / avis, liaison Discord, données d'essai (e-mail, abonnement, empreinte de carte), membres du serveur Discord (invitations, rôles VIP et MVP), journal de licence, IP gardée brièvement en mémoire, résultats du test réseau (ping, gigue, pertes par serveur, version, ID anonyme du PC, ville / région / pays / fournisseur déduits de l'IP par la base DB-IP **locale**, IP non gardée). Voir [[Test réseau]].
- **Legal basis** ; **Cookies and local storage** : `rg_session`, `rg_claim` (2 jours), `rg_signup` (24 h), `rg_oauth` (10 min), `rg_discord` (10 min), `rago_preview` et `rago_admin` (équipe), `rg_ref` (cookie du serveur de comptes) et `rago_ref` (stockage du site), 30 jours ; `rago_promo_seen`, `rago_promo_seen_code`, `rago_promo_claimed` (stockage du site, 30 jours). Phrase : « We don't use advertising or analytics cookies, and the site loads no third-party fonts or trackers » (c'est pourquoi [[build.py]] remplace Google Fonts par des polices locales).
- **Who processes it for us** : Stripe, Supabase, Railway, Netlify, Resend, OVHcloud, Discord, Google.
- **How long we keep it** : compte : jusqu'à 30 jours après la demande de suppression ; facturation : 10 ans ; journal de sécurité : 12 mois ; essais : 2 ans ; Discord : 12 mois après le départ ; codes d'inscription : 1 jour ; tests réseau : 12 mois.
- **Your rights** (CNIL) et **Changes**.

### `404.html`
`<meta name="robots" content="noindex">`. Netlify la sert pour **n'importe quelle** adresse inconnue : tous les liens, images, polices et la feuille sont absolus (`/…`). En-tête complet du site (Why Rago, Features, Rago Route, Tweaks, Reviews, Pricing, FAQ, Sign in, Get Premium), « Error // 404 », « This page doesn't exist. », « The link may be old or mistyped. », boutons « Back to Rago Optimizer » et « See pricing », rangée de paquets « 1 2 3 404 5 » (« packet lost // this page never arrived »), raccourcis Tweaks, Rago Route, Reviews, FAQ, grand « 404 » en contour, pied de page.

## Données touchées
Lit `site/src/legal/terms.html`, `site/src/legal/privacy.html`, `site/v5.css`, `site/v5.js`, `site/og-image.png`. Écrit `site/terms.html`, `site/privacy.html`, `site/404.html`.

## Erreurs et cas limites
- Une section numérotée des conditions doit commencer par « N. » ou « Na. » (`re.match` sinon `AttributeError`).
- Une icône inconnue arrête [[sync_icons.py]] avec son nom.

## Liens avec le reste
- Pages publiées : [[Fichiers publiés du site]] ; servies par [[Netlify]] (la 404 est celle de Netlify pour tout le domaine).
- Les engagements écrits ici doivent rester vrais dans le code : essai et prix ([[Paiements Stripe]], [[Offres et prix]]), remise à zéro ([[Remise à zéro]]), avis, affiliation ([[Promotions et affiliation]]), test réseau ([[Test réseau]]), données collectées ([[Serveur de licences]]).
- Suivi juridique : [[Conformité juridique]].

## À savoir avant de modifier
- Changer la date « Last updated » à chaque modification de fond (`UPD` en tête du script).
- Les encadrés « en bref » reprennent des faits du texte (3 jours, 1 PC, pas de remboursement…) : les changer avec le texte.
- Toute nouvelle donnée collectée, tout nouveau cookie ou sous-traitant doit être ajouté ici (règle de conformité).
- La phrase « no third-party fonts or trackers » engage le site : ne pas ajouter d'outil d'analyse ou de police externe sans changer cette page (voir aussi [[recherche-conversion (site)]] qui proposait une analyse d'audience, jamais faite).
