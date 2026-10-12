#!/bin/bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Frontend-only setup: include browser tests and frontend workspace dependencies.
# Do not install backend packages or perform database/schema operations.
pnpm --filter @workspace/crypto-app... \
  --filter @workspace/mockup-sandbox... \
  install --frozen-lockfile
