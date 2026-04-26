#!/usr/bin/env bash
# setup.sh — one-command bootstrap for Final Debate About Smoking
# Usage:  bash scripts/setup.sh
#   or:   bash scripts/setup.sh --provider openai
#   or:   bash scripts/setup.sh --provider claude-cli
#   or:   bash scripts/setup.sh --no-start   (setup only, don't launch server)
set -euo pipefail

cd "$(dirname "$0")/.."

PROVIDER=""
START_SERVER=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider) PROVIDER="$2"; shift 2 ;;
    --no-start) START_SERVER=false; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "==> Installing dependencies..."
npm install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy

# --- Configure .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example"
fi

# Auto-detect provider if not specified
if [ -z "$PROVIDER" ]; then
  if command -v claude &>/dev/null; then
    PROVIDER="claude-cli"
    echo "==> Detected 'claude' CLI — using claude-cli provider (no API key needed)"
  elif command -v codex &>/dev/null; then
    PROVIDER="codex-cli"
    echo "==> Detected 'codex' CLI — using codex-cli provider (no API key needed)"
  elif grep -q 'ANTHROPIC_API_KEY="..*"' .env 2>/dev/null; then
    PROVIDER="anthropic"
    echo "==> Using anthropic provider (API key found in .env)"
  elif grep -q 'OPENAI_API_KEY="..*"' .env 2>/dev/null; then
    PROVIDER="openai"
    echo "==> Using openai provider (API key found in .env)"
  else
    echo ""
    echo "==> No provider detected. Options:"
    echo "    1. Install Claude Code CLI:  npm i -g @anthropic-ai/claude-code && claude auth login"
    echo "    2. Install Codex CLI:        npm i -g @openai/codex && codex login"
    echo "    3. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in app/.env"
    echo ""
    echo "    Then re-run:  bash scripts/setup.sh"
    exit 1
  fi
fi

# Write the provider into .env
if grep -q '^LLM_PROVIDER=' .env 2>/dev/null; then
  sed -i "s/^LLM_PROVIDER=.*/LLM_PROVIDER=\"${PROVIDER}\"/" .env
else
  echo "LLM_PROVIDER=\"${PROVIDER}\"" >> .env
fi

echo "==> Provider set to: ${PROVIDER}"

# Verify CLI auth if using a CLI provider
if [ "$PROVIDER" = "claude-cli" ]; then
  if ! claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
    echo ""
    echo "==> Claude CLI is not logged in. Run:"
    echo "    claude auth login"
    echo "    Then re-run this script."
    exit 1
  fi
  echo "==> Claude CLI auth verified"
fi

echo ""
echo "==> Setup complete!"
echo ""

if [ "$START_SERVER" = true ]; then
  echo "==> Starting dev server..."
  echo "    Open http://localhost:3000 in your browser to start the debate."
  echo ""
  npm run dev
else
  echo "    To start the app:  cd app && npm run dev"
  echo "    Then open http://localhost:3000"
fi
