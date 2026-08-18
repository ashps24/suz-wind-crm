#!/usr/bin/env bash
#
# Snapshot the wind farm registry to backups/.
#
# `catalyst ds:export` prompts before downloading, so it cannot run unattended.
# This reads the public GET endpoint instead, which already returns rows in the
# SiteSeed shape the app and the restore path both use.
#
# Run this before anything destructive. The table has no point-in-time restore.
#
set -euo pipefail
cd "$(dirname "$0")/.."

API="${NEXT_PUBLIC_WINDFARMS_API:-https://suzlon-876513394.development.catalystserverless.com/server/windfarms-api}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="backups/windfarms-${STAMP}.json"

mkdir -p backups
curl -fsS "${API}/wind-farms" --max-time 60 -o "${OUT}"

COUNT=$(python3 -c "import json;print(len(json.load(open('${OUT}'))['sites']))")
if [ "${COUNT}" -eq 0 ]; then
  echo "✖ refusing to keep an empty snapshot" >&2
  rm -f "${OUT}"
  exit 1
fi

echo "▸ ${COUNT} sites -> ${OUT}"
