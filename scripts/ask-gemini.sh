#!/usr/bin/env bash
set -euo pipefail

PROMPT="${1:-}"
if [ -z "$PROMPT" ]; then
  echo "Usage: ./ask-gemini.sh \"<prompt>\" [timeout_seconds] [workspace_path]"
  exit 1
fi

TIMEOUT="${2:-600}"
WORKSPACE="${3:-$(pwd)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_JS="$REPO_ROOT/bin/a2g.js"

node "$CLI_JS" ask "$PROMPT" -w "$WORKSPACE" -t "$TIMEOUT"
