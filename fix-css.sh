#!/bin/bash

echo "🔧 CSS sorununu düzeltmek için kapsamlı temizlik..."

# Frontend servisini durdur
echo "⏹️ Frontend servisi durduruluyor..."
sudo systemctl stop portfolio-frontend

# Tüm cache'leri temizle
echo "🗑️ Cache temizleniyor..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf ~/.npm/_cacache

# Fresh install
echo "📦 Fresh install..."
npm ci

# Fresh build
echo "🏗️ Fresh build..."
npm run build

# Servisi yeniden başlat
echo "🚀 Frontend servisi başlatılıyor..."
sudo systemctl start portfolio-frontend

echo "✅ CSS sorunu düzeltme işlemi tamamlandı!"