#!/bin/bash

set -e

echo "========================================="
echo "  INSTALACIÓN CONVOCA-SPOTTER"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Instalando dependencias del backend...${NC}"
cd backend
ln -sf ../node_modules node_modules
cd ..

echo -e "${GREEN}✓${NC} Dependencias listas"
echo ""

echo -e "${BLUE}2. Configurando variables de entorno...${NC}"
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="local"
VITE_SUPABASE_PUBLISHABLE_KEY="local-key"
VITE_SUPABASE_URL="http://localhost:3000"
EOF

echo -e "${GREEN}✓${NC} Variables de entorno configuradas"
echo ""

echo -e "${BLUE}3. Compilando aplicación frontend...${NC}"
npm run build
echo -e "${GREEN}✓${NC} Aplicación compilada"
echo ""

echo -e "${BLUE}4. Instalando servicio systemd...${NC}"
cp convoca-spotter.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable convoca-spotter.service
echo -e "${GREEN}✓${NC} Servicio instalado"
echo ""

echo -e "${BLUE}5. Configurando cron para monitoreo automático...${NC}"
# Crear script de monitoreo
cat > /usr/local/bin/convoca-monitor << 'CRONEOF'
#!/bin/bash
cd /home/dionisio/convoca-spotter/backend
/usr/bin/node cli.js all >> /var/log/convoca-spotter-monitor.log 2>&1
CRONEOF

chmod +x /usr/local/bin/convoca-monitor

# Agregar a crontab (cada 6 horas)
(crontab -l 2>/dev/null | grep -v convoca-monitor; echo "0 */6 * * * /usr/local/bin/convoca-monitor") | crontab -

echo -e "${GREEN}✓${NC} Monitoreo automático configurado (cada 6 horas)"
echo ""

echo -e "${BLUE}6. Iniciando servicio...${NC}"
systemctl start convoca-spotter.service
echo -e "${GREEN}✓${NC} Servicio iniciado"
echo ""

echo "========================================="
echo -e "  ${GREEN}✓ INSTALACIÓN COMPLETADA${NC}"
echo "========================================="
echo ""
echo "🌐 Aplicación web:  http://localhost:3000"
echo "📡 API Backend:     http://localhost:3000/api"
echo "🔑 Admin:           admin / admin123"
echo ""
echo "Comandos útiles:"
echo "  systemctl status convoca-spotter    # Ver estado"
echo "  systemctl restart convoca-spotter   # Reiniciar"
echo "  systemctl logs -f convoca-spotter   # Ver logs"
echo "  cd backend && npm run monitor       # Monitoreo manual"
echo ""
echo "Logs de monitoreo automático:"
echo "  tail -f /var/log/convoca-spotter-monitor.log"
echo ""
