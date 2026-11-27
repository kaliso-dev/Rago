#!/bin/bash
# rend chaque page admin à 1.5 dans hd/, puis JPG q86 dans R/admin (coupe à la hauteur CSS donnée)
cd "$(dirname "$0")"
R=/mnt/project-files/rago-redesign/rendus-v5/admin
while read pg out cut; do
  [ -z "$pg" ] && continue
  V=v5 node render.js $pg 1.5 hd round-poster $pg >/dev/null
  python3 - "$pg" "$out" "$cut" "$R" <<'PY'
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
pg, out, cut, R = sys.argv[1:]
im = Image.open(f'hd/{pg}.png').convert('RGB')
if cut == '-':
    im.save(f'{R}/{out}.jpg', quality=86); print(out, im.size)
else:
    c = round(float(cut) * 1.5)
    im.crop((0, 0, im.width, c)).save(f'{R}/{out}-1.jpg', quality=86)
    im.crop((0, c, im.width, im.height)).save(f'{R}/{out}-2.jpg', quality=86); print(out, im.size, 'cut', c)
PY
done <<'LIST'
adm-login admin-connexion -
adm-login-error admin-connexion-erreur -
adm-overview admin-vue-d-ensemble 1017
adm-sales admin-ventes 1165
adm-players admin-joueurs -
adm-player admin-fiche-joueur 1371
adm-purchases admin-offrir-et-achats -
adm-site admin-site-et-promos -
adm-network admin-tests-reseau -
adm-services admin-services 1562
adm-journal admin-journal -
adm-notfound admin-introuvable -
adm-brain admin-cerveau -
adm-states admin-etats -
LIST
