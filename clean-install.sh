#!/bin/bash

echo "🧹 Cleaning up node_modules and Next.js cache..."
rm -rf node_modules
rm -rf .next
rm -rf .vercel

echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Clean installation completed!" 