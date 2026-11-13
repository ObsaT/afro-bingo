#!/usr/bin/env bash
echo "🛑 Stopping AFRO BINGO services..."
pkill -f "node server/server.js" || true
pkill -f "cloudflared tunnel" || true
echo "✅ All AFRO BINGO services stopped."
