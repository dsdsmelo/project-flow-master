#!/bin/bash

# Script de deploy para Tarefaa
# Uso: ./deploy.sh

set -e

echo "=== Atualizando código do repositório ==="
git pull origin main

echo "=== Instalando dependências ==="
npm install

echo "=== Gerando build de produção ==="
npm run build

echo "=== Atualizando configuração do Nginx ==="
sudo cp nginx.conf /etc/nginx/sites-available/tarefaa

echo "=== Testando configuração do Nginx ==="
sudo nginx -t

echo "=== Recarregando Nginx ==="
sudo systemctl reload nginx

echo "=== Deploy concluído com sucesso! ==="
