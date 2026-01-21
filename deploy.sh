#!/bin/bash

# ===========================================
# Deploy Script para Tarefaa
# ===========================================

# Configurações - EDITE ESTAS VARIÁVEIS
VPS_USER="root"                    # Usuário SSH da VPS
VPS_HOST="SEU_IP_AQUI"            # IP da VPS (ex: 192.168.1.100)
VPS_PATH="/var/www/tarefaa"        # Caminho na VPS
DOMAIN="tarefaa.com.br"            # Domínio

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}       Deploy Tarefaa - Iniciando      ${NC}"
echo -e "${YELLOW}========================================${NC}"

# 1. Build local
echo -e "\n${GREEN}[1/4] Criando build de produção...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Erro no build! Abortando deploy.${NC}"
    exit 1
fi

echo -e "${GREEN}Build criado com sucesso!${NC}"

# 2. Criar diretório na VPS (se não existir)
echo -e "\n${GREEN}[2/4] Preparando diretório na VPS...${NC}"
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}"

# 3. Upload dos arquivos
echo -e "\n${GREEN}[3/4] Enviando arquivos para VPS...${NC}"
rsync -avz --delete ./dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/dist/

if [ $? -ne 0 ]; then
    echo -e "${RED}Erro no upload! Verifique a conexão SSH.${NC}"
    exit 1
fi

echo -e "${GREEN}Arquivos enviados com sucesso!${NC}"

# 4. Configurar Nginx (primeira vez)
echo -e "\n${GREEN}[4/4] Verificando configuração Nginx...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    # Verificar se o site já está configurado
    if [ ! -f /etc/nginx/sites-available/tarefaa ]; then
        echo "Configurando Nginx pela primeira vez..."

        # Criar configuração
        cat > /etc/nginx/sites-available/tarefaa << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name tarefaa.com.br www.tarefaa.com.br;

    root /var/www/tarefaa/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

        # Ativar site
        ln -sf /etc/nginx/sites-available/tarefaa /etc/nginx/sites-enabled/

        # Testar configuração
        nginx -t

        # Recarregar Nginx
        systemctl reload nginx

        echo "Nginx configurado!"
    else
        echo "Nginx já configurado, apenas recarregando..."
        systemctl reload nginx
    fi
ENDSSH

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}       Deploy concluído com sucesso!    ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nSeu site está disponível em: ${YELLOW}http://${DOMAIN}${NC}"
echo -e "\nPróximos passos (se primeira vez):"
echo -e "  1. Configure o DNS no Cloudflare apontando para a VPS"
echo -e "  2. Ative o proxy do Cloudflare para HTTPS automático"
