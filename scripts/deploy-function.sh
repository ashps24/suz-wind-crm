#!/usr/bin/env bash
#
# Deploy the wind farm registry function.
#
# `catalyst-config.json` is committed, so it cannot carry the operator key.
# The key is injected from `.secrets.env` (gitignored) just before deploying and
# the committed placeholder is restored afterwards — including on failure, so an
# interrupted deploy can never leave a secret in the working tree.
#
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG="functions/windfarms-api/catalyst-config.json"

if [ ! -f .secrets.env ]; then
  echo "✖ .secrets.env is missing. Create it with:" >&2
  echo "    OPERATOR_KEY=<your key>" >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a; . ./.secrets.env; set +a

if [ -z "${OPERATOR_KEY:-}" ]; then
  echo "✖ OPERATOR_KEY is empty in .secrets.env" >&2
  exit 1
fi

restore () {
  python3 - "$CONFIG" << 'PY'
import json, sys, pathlib
p = pathlib.Path(sys.argv[1])
cfg = json.loads(p.read_text())
cfg['deployment']['env_variables']['OPERATOR_KEY'] = ''
p.write_text(json.dumps(cfg, indent=2) + '\n')
PY
}
trap restore EXIT

python3 - "$CONFIG" "$OPERATOR_KEY" << 'PY'
import json, sys, pathlib
p = pathlib.Path(sys.argv[1])
cfg = json.loads(p.read_text())
cfg['deployment']['env_variables']['OPERATOR_KEY'] = sys.argv[2]
p.write_text(json.dumps(cfg, indent=2) + '\n')
PY

echo "▸ deploying windfarms-api with the operator key injected"
catalyst deploy --only functions -ni
