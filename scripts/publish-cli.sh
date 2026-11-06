#!/usr/bin/env bash
# Publish the madeby CLI to npm from packages/cli (prepublishOnly builds it first). Run by a person:
# npm asks for your login or one-time code. Then the MCP registry: gh workflow run mcp-publish.yml
set -euo pipefail
cd "$(dirname "$0")/../packages/cli"
npm publish --access public
