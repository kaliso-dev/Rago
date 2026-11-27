"""Reprend rendus-v5/src/ingame.css pour la fenêtre de la barre en jeu : sans le fond de la planche (.win.ig, .igbg),
l'infobulle dessinée (.igtt, Windows la dessine) ni la planche des états (.igst … .pgrid)."""
import re, sys
src = '/mnt/project-files/rago-redesign/rendus-v5/src/ingame.css'
out = sys.argv[1]
css = open(src).read()
# planche des états : de son commentaire jusqu'aux règles html.round
plan = css.index('/* planche des états */')
rnd = css.index('html.round .igp{')
css = css[:plan] + css[rnd:]
drop = ('.win.ig{', '.igbg{', '.pcrop .igp::before', '.igtt{', 'html.round .scn')
lines = [l for l in css.split('\n') if not l.startswith(drop) and not l.startswith('/* infobulle de Windows')]
css = '\n'.join(lines).rstrip() + '\n'
head = '/* Généré par port_ig.py depuis rendus-v5/src/ingame.css : ne pas éditer à la main, retoucher dans s5/overlay.css. */\n'
open(out, 'w').write(head + css)
print(len(css.split('\n')), 'lignes')
