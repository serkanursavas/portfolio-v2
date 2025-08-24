#!/bin/bash

# Force rebuild and restart services
echo "🔄 Force rebuilding Next.js application..."

# Remove all cache and build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Clean install and fresh build
npm ci
npm run build

echo "✅ Rebuild completed!"