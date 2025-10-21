#!/bin/bash

# Script de monitoreo automático para convoca-spotter
# Este script hace una llamada a la API para ejecutar el monitoreo

LOGFILE="/var/log/convoca-spotter/monitor.log"
API_URL="http://localhost:3000/api/monitor/all"

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOGFILE")"

# Ejecutar monitoreo
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando monitoreo automático..." >> "$LOGFILE"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -s -o /tmp/monitor-response.json \
  -w "HTTP Status: %{http_code}\n" >> "$LOGFILE" 2>&1

# Registrar resultado
if [ $? -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Monitoreo completado exitosamente" >> "$LOGFILE"
  cat /tmp/monitor-response.json >> "$LOGFILE"
  echo "" >> "$LOGFILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error en el monitoreo" >> "$LOGFILE"
fi

# Limpiar archivo temporal
rm -f /tmp/monitor-response.json

exit 0
