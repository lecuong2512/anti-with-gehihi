#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_JS="$REPO_ROOT/bin/a2g.js"

WORKSPACE="${1:-$(pwd)}"

echo "=========================================="
echo "  Anti with Gehihi - Bridge Launcher     "
echo "  Gemini Web thinks. Antigravity works.  "
echo "=========================================="
echo "Workspace: $WORKSPACE"

node "$CLI_JS" setup -w "$WORKSPACE"
echo ""
node "$CLI_JS" status -w "$WORKSPACE"
