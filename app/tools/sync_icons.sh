#!/bin/sh
# Copie les icônes et les images d'installeur livrées par le thread charte (brand/logo) dans l'app.
# Usage : sh tools/sync_icons.sh [dossier brand/logo]   (par défaut /mnt/project-files/brand/logo)
set -e
B="${1:-/mnt/project-files/brand/logo}"
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
