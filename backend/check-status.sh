#!/bin/bash
# Script para verificar el estado del sistema Convoca-Spotter

echo "======================================"
echo "CONVOCA-SPOTTER - Estado del Sistema"
echo "======================================"
echo ""

# 1. Estado del servidor
echo "📡 SERVIDOR:"
if systemctl is-active --quiet convoca-monitor.service; then
    echo "  ✅ Servidor ejecutándose en puerto 3000"
else
    echo "  ❌ Servidor NO está ejecutándose"
fi
echo ""

# 2. Estado del timer
echo "⏰ SCRAPER AUTOMÁTICO:"
if systemctl is-active --quiet convoca-scraper.timer; then
    echo "  ✅ Timer activo (ejecuta cada hora)"
    echo "  📅 Próxima ejecución:"
    systemctl status convoca-scraper.timer | grep "Trigger:" | head -1
else
    echo "  ❌ Timer NO está activo"
fi
echo ""

# 3. Última ejecución
echo "📝 ÚLTIMA EJECUCIÓN:"
if [ -f /var/log/convoca-scraper.log ]; then
    echo "  Log: /var/log/convoca-scraper.log"
    echo "  Últimas líneas:"
    tail -5 /var/log/convoca-scraper.log | sed 's/^/    /'
else
    echo "  ⚠️  No hay log todavía"
fi
echo ""

# 4. Estadísticas de base de datos
echo "📊 BASE DE DATOS:"
cd /home/dionisio/convoca-spotter/backend
node db-stats.js
echo ""

echo "======================================"
echo "💡 Comandos útiles:"
echo "  Ver logs:        tail -f /var/log/convoca-scraper.log"
echo "  Forzar scrape:   systemctl start convoca-scraper.service"
echo "  Parar timer:     systemctl stop convoca-scraper.timer"
echo "  Reactivar timer: systemctl start convoca-scraper.timer"
echo "======================================"
