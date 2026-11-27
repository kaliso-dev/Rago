# Images à télécharger pour l'app Rago v5 (fil « images »)

Demande de Sofiene (23/11/2026) : l'app doit suivre les maquettes au pixel près, avec les vraies covers des jeux (une cover verticale par jeu pour choisir le preset), une capture de gameplay par jeu pour l'aperçu de la page Display, et les photos des joueurs pro.
Ce fil tourne sur l'environnement « Rago (images des jeux) », qui ouvre seulement ces sites : shared.akamai.steamstatic.com, cdn.cloudflare.steamstatic.com, cdn.akamai.steamstatic.com, store.steampowered.com, images.igdb.com, www.igdb.com, cdn2.steamgriddb.com, www.steamgriddb.com, upload.wikimedia.org, commons.wikimedia.org, liquipedia.net, img-cdn.hltv.org, www.hltv.org, owcdn.net, www.vlr.gg, images.contentstack.io, cmsassets.rgpub.io, cdn2.unrealengine.com, www.minecraft.net, static.wikia.nocookie.net.
Pour trouver les adresses des images, la recherche et la lecture de pages passent par Firecrawl ; le téléchargement des fichiers passe par curl sur les sites ci-dessus.

## Où écrire
Tout va dans `/mnt/project-files/rago-redesign/images/` (dossier réseau partagé : mettre un `/` final aux chemins, ne pas chercher dans tout le dossier, relire un fichier une dizaine de secondes après l'avoir écrit). Ne rien envoyer sur GitHub : le fil de l'app intègre les images lui-même.

## Les jeux (16), avec l'id à utiliser dans les noms de fichiers
valorant (Riot), cs2 (Steam 730), fortnite (Epic), apex (Steam 1172470), pubg (Steam 578080), r6 (Steam 359550), overwatch (Steam 2357570), rivals (Marvel Rivals, Steam 2767030), finals (The Finals, Steam 2073850), tarkov (Escape from Tarkov), rl (Rocket League, Steam 252950), lol (League of Legends, Riot), roblox, gta (GTA V, Steam 271590), minecraft (Java, pour le preset Minecraft PvP), bedrock (Minecraft Bedrock).

Pour chaque jeu :
1. `covers/<id>.jpg` : la cover verticale officielle, format 2:3, au moins 600×900 (idéal 1200×1800). Steam `library_600x900_2x.jpg` d'abord, sinon IGDB `t_cover_big_2x` ou `t_1080p`, sinon une grille officielle de SteamGridDB.
2. `heroes/<id>.jpg` : l'illustration large officielle sans texte si possible (Steam `library_hero.jpg`, 1920×620 ou plus ; sinon key art IGDB `t_1080p`). Elle sert de grande cover au lanceur de jeux.
3. `logos/<id>.png` : le logo officiel sur fond transparent (Steam `logo.png` ou équivalent). Sauter si introuvable.
4. `gameplay/<id>-1.jpg` et `gameplay/<id>-2.jpg` : deux vraies captures en jeu, 1920×1080 ou plus, vue typique du joueur (vue à la première personne pour les FPS), avec le moins d'interface possible et des couleurs d'origine (pas d'image retouchée pour la pub). Elles servent d'aperçu avant/après des filtres de couleur. Priorité absolue : valorant, cs2, fortnite.

## Les 22 pros (ids de `app/src/data/pros.json`)
- Valorant : tenz, kaajak, demon1, derke, less
- CS2 : zywoo, donk, m0nesy, niko, s1mple, ropz, device, sh1ro, b1t, twistzz, xantares, frozen, jl
- Fortnite : peterbot, veno, malibuca, bugha

`pros/<id>.png` (ou `.jpg`) : photo récente, tête et épaules ou buste, au moins 400 px de large. Le mieux : les photos détourées sur fond transparent (HLTV pour CS2 sur img-cdn.hltv.org, VLR sur owcdn.net pour Valorant), sinon Liquipedia ou Wikimedia Commons.

## À rendre
- `sources.md` : une ligne par fichier avec l'adresse de l'image, la page d'origine, l'auteur ou l'éditeur, et la licence si elle est connue. Ces images appartiennent aux éditeurs et aux photographes : ça sert à vérifier les droits avant la prod.
- `planche.jpg` : une planche contact de tout ce qui a été récupéré (une ligne par jeu, une ligne pour les pros), pour que Sofiene voie le résultat d'un coup d'œil.
- La liste de ce qui manque, et pour chaque manque le site bloqué ou la raison.
