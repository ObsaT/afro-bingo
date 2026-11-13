#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "================================================"
echo "📊 AFRO BINGO LIVE STATUS"
echo "================================================"
if pgrep -f "node server/server.js" > /dev/null; then
  echo "🟢 Backend Server (Node.js): RUNNING (Port 4000)"
else
  echo "🔴 Backend Server: STOPPED"
fi

if pgrep -f "cloudflared tunnel" > /dev/null; then
  echo "🟢 Cloudflare Tunnel: RUNNING"
  URL=$(grep -ho "https://[-a-z0-9.]*trycloudflare.com" "$DIR/logs/tunnel.log" "$DIR/tunnel.log" 2>/dev/null | tail -n 1)
  echo "🌐 Public HTTPS URL: $URL"
else
  echo "🔴 Cloudflare Tunnel: STOPPED"
fi
echo "🤖 Telegram Bot: @afrima_bingo_bot"
echo "================================================"
