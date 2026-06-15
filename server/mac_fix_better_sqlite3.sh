#!/usr/bin/env bash
set -euo pipefail

echo "== OpenScienceEnigmaSuite: macOS better-sqlite3 fix =="
echo "This rebuilds the native module for YOUR Mac so Gatekeeper won't block it."
echo ""

cd "$(dirname "$0")"

# Recommended: use Node 20 LTS (better-sqlite3 may fail on very new Node versions)
echo "Node version:"
node -v || true
echo ""

rm -rf node_modules package-lock.json
npm install

# Rebuild better-sqlite3 from source for your current Node + CPU
npm rebuild better-sqlite3 --build-from-source

# Remove quarantine flag if it exists
if [ -d "node_modules/better-sqlite3" ]; then
  xattr -dr com.apple.quarantine "node_modules/better-sqlite3" 2>/dev/null || true
fi

echo ""
echo "Done. Now run from project root:"
echo "  npm start"
