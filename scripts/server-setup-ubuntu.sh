#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Updating system packages..."
sudo apt update -y
sudo apt upgrade -y

echo "[2/6] Installing base dependencies..."
sudo apt install -y git curl build-essential ca-certificates

echo "[3/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "[4/6] Installing Chromium dependencies..."
sudo apt install -y chromium-browser

echo "[5/6] Installing PM2 globally..."
sudo npm install -g pm2

echo "[6/6] Done. Next steps:"
echo "- Clone your repo"
echo "- Run: npm ci"
echo "- Run: pm2 start ecosystem.config.js"
echo "- Run: pm2 save"
echo "- Run: pm2 startup"
