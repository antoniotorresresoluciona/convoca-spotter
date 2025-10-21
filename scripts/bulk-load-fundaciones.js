#!/usr/bin/env node

/**
 * Script de carga masiva de fundaciones
 * Diseñado para insertar hasta 11,000 fundaciones de forma eficiente
 *
 * Uso:
 *   node bulk-load-fundaciones.js <archivo.csv>
 *   node bulk-load-fundaciones.js <archivo.json>
 *
 * Formato CSV esperado:
 *   name,url,category
 *
 * Formato JSON esperado:
 *   [{"name": "...", "url": "...", "category": "..."}]
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const BATCH_SIZE = 100; // Procesar en lotes de 100
const DELAY_BETWEEN_BATCHES = 100; // 100ms entre lotes

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function insertFundacion(fundacion) {
  try {
    const response = await fetch(`${API_URL}/rest/v1/fundaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: fundacion.name,
        url: fundacion.url,
        category: fundacion.category,
        status: 'pending',
        enabled: 1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error(`❌ Error insertando ${fundacion.name}:`, error.message);
    return null;
  }
}

async function processBatch(fundaciones, startIndex) {
  const batch = fundaciones.slice(startIndex, startIndex + BATCH_SIZE);
  const results = await Promise.all(batch.map(f => insertFundacion(f)));

  const successful = results.filter(r => r !== null).length;
  const failed = batch.length - successful;

  return { successful, failed };
}

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const fundaciones = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length >= 3) {
      fundaciones.push({
        name: values[0],
        url: values[1],
        category: values[2]
      });
    }
  }

  return fundaciones;
}

function parseJSON(content) {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('El JSON debe ser un array de objetos');
    }
    return data;
  } catch (error) {
    throw new Error(`Error parseando JSON: ${error.message}`);
  }
}

async function loadFundaciones(filePath) {
  console.log('🚀 Iniciando carga masiva de fundaciones...\n');
  console.log(`📁 Archivo: ${filePath}`);

  // Leer archivo
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  // Parsear según el formato
  let fundaciones;
  if (ext === '.csv') {
    console.log('📄 Formato: CSV');
    fundaciones = parseCSV(content);
  } else if (ext === '.json') {
    console.log('📄 Formato: JSON');
    fundaciones = parseJSON(content);
  } else {
    throw new Error('Formato no soportado. Use .csv o .json');
  }

  console.log(`📊 Total de fundaciones a insertar: ${fundaciones.length}\n`);

  // Procesar en lotes
  const startTime = Date.now();
  let totalSuccessful = 0;
  let totalFailed = 0;

  const totalBatches = Math.ceil(fundaciones.length / BATCH_SIZE);

  for (let i = 0; i < fundaciones.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`⚙️  Procesando lote ${batchNumber}/${totalBatches}...`);

    const { successful, failed } = await processBatch(fundaciones, i);
    totalSuccessful += successful;
    totalFailed += failed;

    console.log(`   ✓ Exitosas: ${successful} | ❌ Fallidas: ${failed}`);

    // Esperar entre lotes para no saturar el servidor
    if (i + BATCH_SIZE < fundaciones.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n✨ Proceso completado!\n');
  console.log('📈 Resumen:');
  console.log(`   Total procesadas: ${fundaciones.length}`);
  console.log(`   ✅ Exitosas: ${totalSuccessful}`);
  console.log(`   ❌ Fallidas: ${totalFailed}`);
  console.log(`   ⏱️  Tiempo total: ${duration}s`);
  console.log(`   🚀 Velocidad: ${(fundaciones.length / duration).toFixed(2)} fundaciones/s`);
}

// Ejecutar
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Error: Debe proporcionar un archivo como parámetro');
  console.log('\nUso:');
  console.log('  node bulk-load-fundaciones.js fundaciones.csv');
  console.log('  node bulk-load-fundaciones.js fundaciones.json');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: El archivo "${filePath}" no existe`);
  process.exit(1);
}

loadFundaciones(filePath).catch(error => {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
});
