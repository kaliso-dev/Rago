#!/bin/sh
# Netlify runs this before each build (build.ignore in netlify.toml): exit 0 skips the build, any other code builds.
# Each production deploy costs Netlify credits (15, out of 300 a month on the free plan), and most merges only change
# the account server (licensing/), the app (app/) or the docs: the site is then the same, so it isn't published again.
# Builds when a file of the site changed since the last build of this branch, and whenever the comparison isn't
# possible: first build of a branch, the earlier commit missing from Netlify's clone, or the same commit built again
# (Trigger deploy, Retry deploy: the way to publish again after changing a Netlify variable).
[ -n "${CACHED_COMMIT_REF:-}" ] && [ "$CACHED_COMMIT_REF" != "${COMMIT_REF:-}" ] || exit 1
git cat-file -e "$CACHED_COMMIT_REF^{commit}" 2>/dev/null || exit 1
if git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- site netlify netlify.toml; then
  echo "Site unchanged since $CACHED_COMMIT_REF: not published again (Retry deploy forces it)"
  exit 0
fi
exit 1
