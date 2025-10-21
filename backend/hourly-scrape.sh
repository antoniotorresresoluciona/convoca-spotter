#!/bin/bash
# Scrape horario automático para Convoca-Spotter

cd /home/dionisio/convoca-spotter/backend

echo "========================================" >> /var/log/convoca-scraper.log
echo "$(date): Iniciando scrape horario" >> /var/log/convoca-scraper.log
echo "========================================" >> /var/log/convoca-scraper.log

# Ejecutar crawl de sublinks
/usr/bin/node /home/dionisio/convoca-spotter/backend/crawl-sublinks-now.js >> /var/log/convoca-scraper.log 2>&1

echo "$(date): Scrape completado" >> /var/log/convoca-scraper.log
echo "" >> /var/log/convoca-scraper.log
