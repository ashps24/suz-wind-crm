#!/usr/bin/env bash
#
# Build and deploy the static export to Catalyst Slate.
#
# Slate hosts a directory of files with no server, matches request paths exactly,
# and serves the HTML document with `cache-control: max-age=31536000`. Three
# things follow from that, and this script exists to handle all three:
#
#   1. `.catalyst/slate-config.toml` lives *inside* the output directory, so a
#      clean build deletes it. It is rewritten on every run.
#   2. A returning visitor can hold a year-old `index.html` that references
#      `_next/static` chunk filenames a later build no longer emits. Every
#      release's chunks are archived and merged forward so those documents keep
#      working.
#   3. That same stale document needs a way to notice it is stale — `version.json`
#      is what the inline bootstrap script in `app/layout.tsx` polls.
#
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="suzlon-wind-crm"
ARCHIVE=".slate-static-archive"
RELEASE="$(date -u +%Y%m%d-%H%M%S)"

echo "▸ release ${RELEASE}"

# The document bakes this in; version.json below advertises it.
export NEXT_PUBLIC_RELEASE="${RELEASE}"
# Wind farm registry the frontend reads and writes through.
export NEXT_PUBLIC_WINDFARMS_API="https://suzlon-876513394.development.catalystserverless.com/server/windfarms-api"

rm -rf out .next
npm run build

# What the stale-document check fetches. Must not be long-cached itself; the
# bootstrap script cache-busts it with a query string.
printf '{"release":"%s"}\n' "${RELEASE}" > out/version.json

# Recreated every run — the clean build above deletes it.
mkdir -p out/.catalyst
printf 'framework = "static"\ndeployment_name = "default"\n' > out/.catalyst/slate-config.toml

# Merge previously shipped chunks in *without* clobbering this build's files,
# then fold this build's chunks into the archive for the next release.
mkdir -p "${ARCHIVE}"
if [ -d "${ARCHIVE}" ] && [ -n "$(ls -A "${ARCHIVE}" 2>/dev/null)" ]; then
  cp -Rn "${ARCHIVE}/." out/_next/static/ 2>/dev/null || true
  echo "▸ carried forward $(find "${ARCHIVE}" -type f | wc -l | tr -d ' ') archived chunk files"
fi
cp -R out/_next/static/. "${ARCHIVE}/"

echo "▸ uploading $(find out -type f | wc -l | tr -d ' ') files ($(du -sh out | cut -f1))"
catalyst deploy slate "${APP_NAME}" -m "release ${RELEASE}" -ni

echo "▸ deployed release ${RELEASE}"
