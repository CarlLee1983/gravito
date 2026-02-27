#!/bin/bash
# Clean start for luminosity-site development

echo "🧹 Cleaning up old processes..."
pkill -f "vite" || true
pkill -f "src/index.ts" || true
sleep 2

echo "📦 Starting Vite dev server (port 5173)..."
bun run dev:vite &
VITE_PID=$!
sleep 4

echo "🚀 Starting App server (port 3000)..."
NODE_ENV=development bun run --watch src/index.ts &
SERVER_PID=$!

echo ""
echo "✅ Dev servers started!"
echo "   📍 App:  http://localhost:3000"
echo "   📍 Vite: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
wait
