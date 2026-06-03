#!/usr/bin/env bash
# Verify that @photostructure/tz-lookup is pinned to the SAME version on both
# sides. Mismatched versions risk boundary-coordinate disagreement → spurious
# Worker mismatch warns + cache fragmentation. See spec EC-T8.
#
# Note: compares declared semver range in package.json (not resolved lockfile
# patch). Drift inside ^11.x.y is accepted per spec; gross-range drift
# (e.g. ^11 vs ^12) is what this catches.
#
# Exits 0 if versions match, 1 otherwise.

set -euo pipefail

MOBILE_VER=$(grep -o '"@photostructure/tz-lookup": "[^"]*"' apps/mobile/package.json | sed 's/.*": "//;s/"$//')
WORKER_VER=$(grep -o '"@photostructure/tz-lookup": "[^"]*"' workers/api-proxy/package.json | sed 's/.*": "//;s/"$//')

if [ "$MOBILE_VER" != "$WORKER_VER" ]; then
  echo "ERROR: @photostructure/tz-lookup version mismatch"
  echo "  apps/mobile/package.json:        $MOBILE_VER"
  echo "  workers/api-proxy/package.json:  $WORKER_VER"
  echo "Run 'npm install @photostructure/tz-lookup@<same-version>' in both directories."
  exit 1
fi

echo "OK: @photostructure/tz-lookup pinned at $MOBILE_VER on both sides"
exit 0
