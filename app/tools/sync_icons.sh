#!/bin/sh
# Copie les icônes et les images d'installeur livrées par le thread charte (brand/logo) dans l'app.
# Usage : sh tools/sync_icons.sh [dossier brand/logo]
#   par défaut : brand/logo à la racine du dépôt (app/tools → ../../brand), sinon le dossier partagé du projet
set -e
HERE="$(dirname "$0")"
if [ -n "$1" ]; then B="$1"
elif [ -d "$HERE/../../brand/logo" ]; then B="$HERE/../../brand/logo"
else B="/mnt/project-files/brand/logo"
fi
[ -f "$B/rago.ico" ] || { echo "brand/logo introuvable ($B) : sh tools/sync_icons.sh <dossier brand/logo>" >&2; exit 1; }
D="$(dirname "$0")/../src-tauri"
cp "$B/png/rago-icon-32.png"  "$D/icons/32x32.png"
cp "$B/png/rago-icon-128.png" "$D/icons/128x128.png"
cp "$B/png/rago-icon-256.png" "$D/icons/128x128@2x.png"
cp "$B/png/rago-icon-512.png" "$D/icons/icon.png"
cp "$B/rago.ico"              "$D/icons/icon.ico"
cp "$B/installer/sidebar.bmp" "$D/installer/sidebar.bmp"
cp "$B/installer/header.bmp"  "$D/installer/header.bmp"
sed -e 's#<metadata>.*</metadata>##' "$B/rago-favicon.svg" > "$(dirname "$0")/../public/favicon.svg"
echo "icônes copiées depuis $B"
