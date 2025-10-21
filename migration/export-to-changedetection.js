#!/usr/bin/env node
/**
 * Script de migración: Convoca-Spotter → changedetection.io
 *
 * Exporta todas las fuentes activas (fundaciones, entes, otras fuentes)
 * como watches de changedetection.io usando su API REST.
 *
 * Uso:
 *   node export-to-changedetection.js [--dry-run]
 *
 * Variables de entorno requeridas:
 *   CDIO_API_URL=http://changedetection.changedetection.svc.cluster.local
 *   CDIO_API_KEY=super-secreta-cambia-esto
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const CDIO_API_URL = process.env.CDIO_API_URL || 'http://localhost:5000';
const CDIO_API_KEY = process.env.CDIO_API_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');

// Keywords para filtros de changedetection.io
const KEYWORDS = [
  'convocatoria', 'convocatorias', 'ayuda', 'ayudas', 'subvencion', 'subvenciones',
  'beca', 'becas', 'grant', 'grants', 'financiacion', 'financiación', 'programa',
  'programas', 'solicitud', 'solicitudes', 'bases', 'requisitos', 'plazo', 'plazos'
];

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0
};

/**
 * Crea un watch en changedetection.io via API
 */
async function createWatch(url, title, tag, extraConfig = {}) {
  const watchData = {
    url,
    title,
    tags: [tag],

    // Configuración de monitoreo
    fetch_backend: 'html_requests', // o 'playwright' si quieres JS rendering
    extract_title_as_title: false,

    // Filtros de contenido
    text_should_not_be_present: [
      'cookie', 'cookies', 'gdpr', 'banner',
      'javascript', 'disabled', 'enable'
    ].join('\n'),

    // Trigger palabras clave
    trigger_text: KEYWORDS.join('\n'),

    // Notificaciones (configura según necesites)
    notification_urls: [],
    notification_title: `Cambio detectado: ${title}`,
    notification_body: 'Se han detectado cambios relevantes',

    // Headers personalizados
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },

    // Configuración de checks
    time_between_check: { weeks: 0, days: 0, hours: 2, minutes: 0, seconds: 0 },

    ...extraConfig
  };

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would create watch: ${title}`);
    console.log(`    URL: ${url}`);
    console.log(`    Tag: ${tag}`);
    return { success: true, uuid: 'dry-run-uuid' };
  }

  try {
    const response = await fetch(`${CDIO_API_URL}/api/v1/watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CDIO_API_KEY
      },
      body: JSON.stringify(watchData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`  ✅ Created watch: ${title} (UUID: ${result.uuid || 'unknown'})`);
    return { success: true, uuid: result.uuid };
  } catch (error) {
    console.error(`  ❌ Failed to create watch: ${title}`);
    console.error(`     Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Migra fundaciones
 */
async function migrateFundaciones(db) {
  console.log('\n📦 Migrando Fundaciones...');
  const fundaciones = db.prepare('SELECT * FROM fundaciones WHERE enabled = 1').all();

  for (const fundacion of fundaciones) {
    stats.total++;
    const result = await createWatch(
      fundacion.url,
      fundacion.name,
      'fundacion',
      {
        tag: `fundacion,${fundacion.category || 'general'}`,
        // Si la fundación tenía configuración específica, agrégala aquí
      }
    );

    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    // Rate limiting: esperar entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Fundaciones procesadas: ${fundaciones.length}`);
}

/**
 * Migra entes públicos
 */
async function migrateEntesPublicos(db) {
  console.log('\n🏛️  Migrando Entes Públicos...');
  const entes = db.prepare('SELECT * FROM entes_publicos WHERE enabled = 1').all();

  for (const ente of entes) {
    stats.total++;
    const result = await createWatch(
      ente.url,
      ente.name,
      'ente_publico',
      {
        tag: `ente_publico,${ente.category || 'general'}`,
        // BOE, DOGA, etc suelen ser pesados: considera usar Playwright
        fetch_backend: ente.url.includes('boe.es') || ente.url.includes('doga')
          ? 'playwright'
          : 'html_requests'
      }
    );

    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Entes públicos procesados: ${entes.length}`);
}

/**
 * Migra otras fuentes
 */
async function migrateOtrasFuentes(db) {
  console.log('\n📰 Migrando Otras Fuentes...');
  const fuentes = db.prepare('SELECT * FROM otras_fuentes WHERE enabled = 1').all();

  for (const fuente of fuentes) {
    stats.total++;
    const result = await createWatch(
      fuente.url,
      fuente.name,
      'otra_fuente',
      {
        tag: `otra_fuente,${fuente.category || 'agregador'}`
      }
    );

    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Otras fuentes procesadas: ${fuentes.length}`);
}

/**
 * Verifica conectividad con changedetection.io
 */
async function checkConnection() {
  console.log('🔍 Verificando conexión con changedetection.io...');
  console.log(`   URL: ${CDIO_API_URL}`);

  if (!CDIO_API_KEY && !DRY_RUN) {
    throw new Error('CDIO_API_KEY no configurada. Set CDIO_API_KEY env variable.');
  }

  if (DRY_RUN) {
    console.log('   [DRY-RUN] Skipping connection check\n');
    return;
  }

  try {
    const response = await fetch(`${CDIO_API_URL}/api/v1/watch`, {
      method: 'GET',
      headers: {
        'x-api-key': CDIO_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('   ✅ Conexión exitosa\n');
  } catch (error) {
    throw new Error(`No se pudo conectar con changedetection.io: ${error.message}`);
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Convoca-Spotter → changedetection.io Migration      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY-RUN MODE: No se crearán watches reales\n');
  }

  // Abrir base de datos
  const dbPath = join(__dirname, '../backend/local.db');
  console.log(`📂 Abriendo base de datos: ${dbPath}`);
  const db = new Database(dbPath, { readonly: true });

  try {
    // Verificar conexión
    await checkConnection();

    // Migrar cada tipo de fuente
    await migrateFundaciones(db);
    await migrateEntesPublicos(db);
    await migrateOtrasFuentes(db);

    // Resumen final
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  RESUMEN DE MIGRACIÓN                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Total fuentes:   ${stats.total}`);
    console.log(`✅ Exitosas:     ${stats.success}`);
    console.log(`❌ Fallidas:     ${stats.failed}`);
    console.log(`⏭️  Omitidas:     ${stats.skipped}`);
    console.log('');

    if (stats.failed > 0) {
      console.log('⚠️  Algunas fuentes fallaron. Revisa los logs arriba.');
      process.exit(1);
    } else {
      console.log('🎉 Migración completada exitosamente!');
      console.log('');
      console.log('Próximos pasos:');
      console.log('  1. Accede a la UI de changedetection.io');
      console.log('  2. Verifica que los watches se crearon correctamente');
      console.log('  3. Configura notificaciones (webhook, email, etc.)');
      console.log('  4. Conecta con Ollama para análisis de cambios');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Ejecutar
main().catch(error => {
  console.error('Error inesperado:', error);
  process.exit(1);
});
