#!/bin/bash
set -e

echo "🔧 Forcing npm usage..."

# Remove any pnpm files if they exist
rm -f pnpm-lock.yaml
rm -f .pnpmfile.cjs

# Ensure we're using npm
echo "📦 Installing dependencies with npm..."
npm install --legacy-peer-deps

# Build the project
echo "🏗️ Building project..."
npm run build

echo "✅ Build complete!"