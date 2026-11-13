#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

mkdir -p "$DIR/logs"

# 1. Check if Node is already running
if pgrep -f "node server/server.js" > /dev/null; then
  echo "⚠️ Node server is already running."
else
  echo "🚀 Building frontend..."
  npm run build
  echo "🚀 Starting Node server..."
  nohup node server/server.js > "$DIR/logs/server.log" 2>&1 &
  echo "✅ Node server started (PID: $!)"
fi

# 2. Check if Cloudflare tunnel is already running
if pgrep -f "cloudflared tunnel --url" > /dev/null; then
  echo "⚠️ Cloudflare tunnel is already running."
else
  echo "🌐 Starting Cloudflare tunnel..."
  nohup ./cloudflared tunnel --url http://127.0.0.1:4000 --logfile "$DIR/logs/tunnel.log" > /dev/null 2>&1 &
  echo "✅ Cloudflare tunnel started (PID: $!)"
fi

sleep 4
URL=$(grep -o "https://[-a-z0-9.]*trycloudflare.com" "$DIR/logs/tunnel.log" "$DIR/tunnel.log" 2>/dev/null | tail -n 1)

echo "================================================"
echo "🎉 AFRO BINGO IS LIVE ON CLOUDFLARE!"
echo "🌐 Public URL: $URL"
echo "🤖 Telegram Bot: @afrima_bingo_bot"
echo "================================================"
