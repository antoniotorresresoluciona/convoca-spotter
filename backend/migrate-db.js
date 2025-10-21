#!/usr/bin/env node

/**
 * Script de migración para actualizar la base de datos existente
 * Agrega las columnas necesarias para el sistema Kanban mejorado
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

console.log('🔧 Iniciando migración de base de datos...\n');

// Función para verificar si una columna existe
function columnExists(tableName, columnName) {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return tableInfo.some(col => col.name === columnName);
}

// Migración 1: Agregar columnas a fundaciones
if (!columnExists('fundaciones', 'last_html')) {
  console.log('✓ Agregando columna last_html a fundaciones...');
  db.exec('ALTER TABLE fundaciones ADD COLUMN last_html TEXT');
}

// Migración 2: Agregar columnas a entes_publicos
if (!columnExists('entes_publicos', 'last_html')) {
  console.log('✓ Agregando columna last_html a entes_publicos...');
  db.exec('ALTER TABLE entes_publicos ADD COLUMN last_html TEXT');
}

// Migración 3: Agregar columnas a otras_fuentes
if (!columnExists('otras_fuentes', 'last_html')) {
  console.log('✓ Agregando columna last_html a otras_fuentes...');
  db.exec('ALTER TABLE otras_fuentes ADD COLUMN last_html TEXT');
}

// Migración 4: Agregar columnas a change_history
if (!columnExists('change_history', 'url')) {
  console.log('✓ Agregando columna url a change_history...');
  db.exec('ALTER TABLE change_history ADD COLUMN url TEXT');
}

if (!columnExists('change_history', 'changes_description')) {
  console.log('✓ Agregando columna changes_description a change_history...');
  db.exec('ALTER TABLE change_history ADD COLUMN changes_description TEXT');
}

if (!columnExists('change_history', 'reviewed')) {
  console.log('✓ Agregando columna reviewed a change_history...');
  db.exec('ALTER TABLE change_history ADD COLUMN reviewed INTEGER DEFAULT 0');
}

// Migración 5: Actualizar registros existentes
console.log('\n📊 Actualizando registros existentes...');

// Marcar cambios antiguos como revisados si tienen un estado final
const updated = db.prepare(`
  UPDATE change_history
  SET reviewed = 1
  WHERE status IN ('relevant', 'discarded') AND (reviewed = 0 OR reviewed IS NULL)
`).run();

console.log(`✓ ${updated.changes} cambios marcados como revisados`);

// Migración 6: Crear índices si no existen
console.log('\n🔍 Creando índices...');

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_change_history_url ON change_history(url)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_change_history_reviewed ON change_history(reviewed)');
  console.log('✓ Índices creados correctamente');
} catch (error) {
  console.log('⚠️  Algunos índices ya existían:', error.message);
}

console.log('\n✅ Migración completada exitosamente!\n');

// Mostrar estadísticas
const stats = {
  fundaciones: db.prepare('SELECT COUNT(*) as count FROM fundaciones').get(),
  entes: db.prepare('SELECT COUNT(*) as count FROM entes_publicos').get(),
  fuentes: db.prepare('SELECT COUNT(*) as count FROM otras_fuentes').get(),
  changes: db.prepare('SELECT COUNT(*) as count FROM change_history').get(),
  pending: db.prepare('SELECT COUNT(*) as count FROM change_history WHERE status = "pending"').get(),
  relevant: db.prepare('SELECT COUNT(*) as count FROM change_history WHERE status = "relevant"').get(),
};

console.log('📈 Estadísticas de la base de datos:');
console.log(`   Fundaciones: ${stats.fundaciones.count}`);
console.log(`   Entes Públicos: ${stats.entes.count}`);
console.log(`   Otras Fuentes: ${stats.fuentes.count}`);
console.log(`   Total Cambios: ${stats.changes.count}`);
console.log(`   - Pendientes: ${stats.pending.count}`);
console.log(`   - Relevantes: ${stats.relevant.count}`);
console.log('');

db.close();
