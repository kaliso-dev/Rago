#!/bin/sh
# Build of the Netlify previews: deploy previews of pull requests and branch deploys (the staging branch).
# Same as the live build, plus: the site's account links and the reviews and pop-up it reads (home page and reviews
# page) go to the staging account server (Netlify variable STAGING_ACCOUNT_URL), never to the live one. Without the
# variable they're off on the preview (see previewAccountBase in site/src/page.html). The live site is built by
# [build] in netlify.toml.
set -eu
LIVE="https://account.rago-optimizer.com"
URL=$(printf '%s' "${STAGING_ACCOUNT_URL:-}" | tr -d ' \r\n' | sed 's|/*$||')

if [ -n "$URL" ]; then
  if ! printf '%s' "$URL" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
    echo "STAGING_ACCOUNT_URL must be an https address without a path, e.g. https://rago-staging.up.railway.app (got: $URL)"
    exit 1
  fi
  case "$URL" in
    "$LIVE"|*rago-production.up.railway.app) echo "STAGING_ACCOUNT_URL is the live account server: use the staging one"; exit 1 ;;
  esac
  TARGET="$URL"
  echo "Preview: account links go to $URL"
else
  TARGET="#account-off"
  echo "Preview: STAGING_ACCOUNT_URL isn't set, account links are off on this preview"
fi

# Each page's CONFIG (home page, reviews page), then the links baked for visitors without JavaScript.
for PAGE in site/index.html site/reviews.html; do
  sed -i "s|previewAccountBase: \"\"|previewAccountBase: \"$URL\"|" "$PAGE"
  if [ -n "$URL" ]; then
    sed -i "s|href=\"$LIVE/|href=\"$URL/|g" "$PAGE"
  else
    sed -i "s|href=\"$LIVE/[^\"]*\"|href=\"$TARGET\"|g" "$PAGE"
  fi
  grep -q "previewAccountBase: \"$URL\"" "$PAGE" || { echo "previewAccountBase not found in $PAGE"; exit 1; }
done

# Same as the live build: the sources and notes of site/ aren't published.
rm -rf site/src site/tools && rm -f site/*.md
