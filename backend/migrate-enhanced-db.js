#!/usr/bin/env node
// Migración de base de datos para nuevas features:
// - Versioning de contenido
// - Columnas de análisis IA
// - Tabla de documentos

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'local.db');
const db = new Database(dbPath);

console.log('🔄 Iniciando migración de base de datos...\n');

try {
  db.exec('BEGIN TRANSACTION');

  // 1. Añadir columnas de versioning a las tablas principales
  console.log('📦 Añadiendo columnas de versioning...');

  const tables = ['fundaciones', 'entes_publicos', 'otras_fuentes'];

  for (const table of tables) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN content_versions TEXT DEFAULT '[]'`);
      console.log(`  ✓ Añadida columna content_versions a ${table}`);
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log(`  ⚠️  Columna content_versions ya existe en ${table}`);
      } else {
        throw error;
      }
    }
  }

  // 2. Añadir columnas de análisis IA a change_history
  console.log('\n🤖 Añadiendo columnas de análisis IA a change_history...');

  const aiColumns = [
    { name: 'ai_summary', type: 'TEXT', default: 'NULL' },
    { name: 'ai_keywords', type: 'TEXT', default: 'NULL' }, // JSON array
    { name: 'extracted_dates', type: 'TEXT', default: 'NULL' }, // JSON array
    { name: 'deadline_date', type: 'TEXT', default: 'NULL' }, // ISO date
    { name: 'is_new_convocatoria', type: 'INTEGER', default: '0' }, // Boolean
  ];

  for (const col of aiColumns) {
    try {
      db.exec(`ALTER TABLE change_history ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`);
      console.log(`  ✓ Añadida columna ${col.name}`);
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log(`  ⚠️  Columna ${col.name} ya existe`);
      } else {
        throw error;
      }
    }
  }

  // 3. Crear tabla de documentos si no existe
  console.log('\n📄 Creando tabla de documentos...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL, -- 'fundacion', 'ente_publico', 'otra_fuente'
      url TEXT NOT NULL,
      document_type TEXT, -- 'pdf', 'doc', 'xls', etc.
      title TEXT,
      extracted_text TEXT,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, url)
    )
  `);
  console.log('  ✓ Tabla documents creada');

  // 4. Mejorar tabla sublinks
  console.log('\n🔗 Mejorando tabla sublinks...');

  const sublinkColumns = [
    { name: 'crawled_at', type: 'TIMESTAMP', default: 'NULL' },
    { name: 'depth', type: 'INTEGER', default: '1' },
    { name: 'content_hash', type: 'TEXT', default: 'NULL' },
  ];

  for (const col of sublinkColumns) {
    try {
      db.exec(`ALTER TABLE sublinks ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`);
      console.log(`  ✓ Añadida columna ${col.name} a sublinks`);
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log(`  ⚠️  Columna ${col.name} ya existe en sublinks`);
      } else {
        throw error;
      }
    }
  }

  // 5. Crear índices para mejorar performance
  console.log('\n⚡ Creando índices...');

  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_change_history_status ON change_history(status)',
    'CREATE INDEX IF NOT EXISTS idx_change_history_priority ON change_history(priority)',
    'CREATE INDEX IF NOT EXISTS idx_change_history_source_type ON change_history(source_type)',
    'CREATE INDEX IF NOT EXISTS idx_change_history_detected_at ON change_history(detected_at)',
    'CREATE INDEX IF NOT EXISTS idx_change_history_deadline ON change_history(deadline_date)',
    'CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source_id, source_type)',
    'CREATE INDEX IF NOT EXISTS idx_sublinks_fundacion ON sublinks(fundacion_id)',
    'CREATE INDEX IF NOT EXISTS idx_sublinks_depth ON sublinks(depth)',
  ];

  for (const indexSql of indices) {
    try {
      db.exec(indexSql);
      const indexName = indexSql.match(/INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/)[1];
      console.log(`  ✓ Índice ${indexName} creado`);
    } catch (error) {
      console.log(`  ⚠️  Error creando índice: ${error.message}`);
    }
  }

  // 6. Actualizar registros existentes con valores por defecto
  console.log('\n🔧 Actualizando registros existentes...');

  // Inicializar content_versions como array vacío para registros existentes
  for (const table of tables) {
    const count = db.prepare(
      `UPDATE ${table} SET content_versions = '[]' WHERE content_versions IS NULL OR content_versions = ''`
    ).run().changes;

    if (count > 0) {
      console.log(`  ✓ Actualizados ${count} registros en ${table}`);
    }
  }

  db.exec('COMMIT');

  console.log('\n✅ Migración completada exitosamente!\n');

  // Mostrar estadísticas
  console.log('📊 Estadísticas de la base de datos:');
  const stats = {
    fundaciones: db.prepare('SELECT COUNT(*) as count FROM fundaciones').get().count,
    entesPublicos: db.prepare('SELECT COUNT(*) as count FROM entes_publicos').get().count,
    otrasFuentes: db.prepare('SELECT COUNT(*) as count FROM otras_fuentes').get().count,
    cambios: db.prepare('SELECT COUNT(*) as count FROM change_history').get().count,
    sublinks: db.prepare('SELECT COUNT(*) as count FROM sublinks').get().count,
    documents: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
  };

  console.log(`  Fundaciones: ${stats.fundaciones}`);
  console.log(`  Entes Públicos: ${stats.entesPublicos}`);
  console.log(`  Otras Fuentes: ${stats.otrasFuentes}`);
  console.log(`  Cambios detectados: ${stats.cambios}`);
  console.log(`  Sublinks: ${stats.sublinks}`);
  console.log(`  Documentos: ${stats.documents}`);

  console.log('\n✨ Base de datos lista para las nuevas funcionalidades!\n');

} catch (error) {
  console.error('\n❌ Error en la migración:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}
