"""Reprend le <style> de rendus-v5/perso/src/splash.html (écran de démarrage) pour l'app : chaque sélecteur rattaché
à .spl5, les id en classes (#logo -> .logo), la bande .tape renommée .spt (l'ancienne règle .tape de styles/v5.css
lui donnerait sa marge et son fond rouge). Sans la règle body (taille de la planche), #rb/#ab (couches retirées par la
maquette elle-même le 22/11) ni .ver (aucun élément ne la porte)."""
import re, sys
sys.path.insert(0, '/mnt/project-files/rago-redesign/rendus-v5/outils')
from port_s5 import split_top, split_sel
src = '/mnt/project-files/rago-redesign/rendus-v5/perso/src/splash.html'
out = sys.argv[1]
h = open(src).read()
css = '\n'.join(re.findall(r'<style>(.*?)</style>', h, re.S))
res = []
for pre, body in split_top(css):
    sels = split_sel(pre)
    if sels == ['body'] or sels == ['#rb', '#ab'] or sels == ['.ver']:
        continue
    o = []
    for s in sels:
        s = s.replace('#logo', '.logo').replace('.tape', '.spt')
        o.append('.spl5 ' + s)
    res.append(','.join(o) + '{' + body.strip() + '}')
head = '/* Généré par port_splash.py depuis rendus-v5/perso/src/splash.html : ne pas éditer à la main, retoucher dans s5/app.css. */\n'
open(out, 'w').write(head + '\n'.join(res) + '\n')
print(len(res), 'règles')
