#!/bin/zsh
#
# Starts the vault MCP server for the Claude desktop app.
#
# The app spawns this with no login shell and a PATH that has no node in it, so
# the node manager is bootstrapped by hand — the same three lines as the
# launcher in Meridian.swift: fnm first, because .zshrc is what sets it up and
# `fnm use` is what honours .nvmrc; nvm as the fallback the login files leave.
#
# Everything noisy goes to stderr or /dev/null. stdout is the transport.
#
# Registered in ~/Library/Application Support/Claude/claude_desktop_config.json
# by absolute path; the cd below is what lets the server find .env, which
# loadConfig() reads from the working directory.

set -e

cd "${0:A:h:h}"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if command -v fnm > /dev/null 2>&1; then
    eval "$(fnm env)"
    fnm use --install-if-missing > /dev/null 2>&1
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
    nvm use > /dev/null 2>&1 || nvm use --lts > /dev/null 2>&1
fi

exec npx tsx --import ./scripts/tsx-alias.mjs mcp/vault-server.ts
