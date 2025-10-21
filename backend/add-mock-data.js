#!/usr/bin/env node
// Script para añadir datos de prueba (mock data) al Kanban

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'local.db');
const db = new Database(dbPath);

console.log('🎭 Añadiendo datos de prueba al sistema...\n');

const mockChanges = [
  {
    source_name: 'Fundación Inocente Inocente',
    source_type: 'fundacion',
    url: 'https://fundacioninocente.org/convocatoria-de-ayudas/',
    change_type: 'links_added',
    old_value: 'Convocatoria 2024 - Plazo cerrado',
    new_value: 'Nueva Convocatoria 2025 - Plazo abierto hasta 31 de diciembre',
    changes_description: '3 nuevos enlaces detectados: Convocatoria Proyectos Sociales 2025, Bases y Requisitos, Formulario de Solicitud',
    priority: 'ALTA',
    status: 'relevant',
    ai_summary: 'Se ha abierto una nueva convocatoria para proyectos de atención a la infancia vulnerable. Dotación de hasta 50.000€ por proyecto.',
    ai_keywords: JSON.stringify(['infancia', 'vulnerabilidad', 'proyectos sociales', 'atención directa', 'ong']),
    deadline_date: '2025-12-31',
    is_new_convocatoria: 1,
  },
  {
    source_name: 'Fundación Mapfre',
    source_type: 'fundacion',
    url: 'https://www.fundacionmapfre.org/premios-ayudas/convocatorias/',
    change_type: 'dates_changed',
    old_value: 'Plazo: hasta 15 de octubre de 2025',
    new_value: 'Plazo ampliado: hasta 30 de noviembre de 2025',
    changes_description: 'Fechas actualizadas. Añadidas: 30/11/2025, Eliminadas: 15/10/2025',
    priority: 'ALTA',
    status: 'relevant',
    ai_summary: 'Se ha ampliado el plazo de la convocatoria de Ayudas a la Investigación en Salud. El nuevo plazo finaliza el 30 de noviembre.',
    ai_keywords: JSON.stringify(['investigación', 'salud', 'innovación', 'ciencia', 'ampliación plazo']),
    deadline_date: '2025-11-30',
    is_new_convocatoria: 0,
    notes: 'Verificado - Ampliación oficial publicada en web',
  },
  {
    source_name: 'Fundación Iberdrola',
    source_type: 'fundacion',
    url: 'https://www.fundacioniberdrolaespana.org/accion-social/',
    change_type: 'headings_added',
    old_value: null,
    new_value: 'Programa de Empleo Verde 2025',
    changes_description: '2 nuevos encabezados: Programa de Empleo Verde 2025, Formación en Energías Renovables',
    priority: 'ALTA',
    status: 'relevant',
    ai_summary: 'Nuevo programa de empleo dirigido a jóvenes en riesgo de exclusión, con formación en instalación de energías renovables.',
    ai_keywords: JSON.stringify(['empleo', 'juventud', 'energías renovables', 'formación', 'inserción laboral']),
    deadline_date: '2025-06-15',
    is_new_convocatoria: 1,
  },
  {
    source_name: 'Ministerio de Cultura',
    source_type: 'ente_publico',
    url: 'https://www.cultura.gob.es/servicios-al-ciudadano/',
    change_type: 'content_change',
    old_value: 'Ayudas a industrias culturales: 1.000.000€',
    new_value: 'Ayudas a industrias culturales: 2.500.000€ (incremento presupuestario)',
    changes_description: 'Contenido modificado (similitud: 75%)',
    priority: 'MEDIA',
    status: 'relevant',
    ai_summary: 'Se ha incrementado significativamente el presupuesto de las ayudas a industrias culturales y creativas para 2025.',
    ai_keywords: JSON.stringify(['cultura', 'industrias creativas', 'presupuesto', 'artes', 'ministerio']),
    deadline_date: '2025-03-31',
    is_new_convocatoria: 0,
  },
  {
    source_name: 'Xunta de Galicia - Cultura',
    source_type: 'ente_publico',
    url: 'https://www.cultura.gal/es/axudas-subvencions-bolsas',
    change_type: 'title_change',
    old_value: 'Subvencións cultura 2024',
    new_value: 'Subvencións para proxectos culturais innovadores 2025',
    changes_description: 'Título actualizado: "Subvencións para proxectos culturais innovadores 2025"',
    priority: 'MEDIA',
    status: 'relevant',
    ai_summary: 'Nueva línea de subvenciones autonómicas enfocada en proyectos culturales que incorporen innovación tecnológica.',
    ai_keywords: JSON.stringify(['galicia', 'cultura', 'innovación', 'tecnología', 'proyectos']),
    deadline_date: '2025-05-20',
    is_new_convocatoria: 1,
  },
  {
    source_name: 'Fundación Carasso',
    source_type: 'fundacion',
    url: 'https://www.fondationcarasso.org/es/convocatorias/',
    change_type: 'links_added',
    old_value: null,
    new_value: 'Convocatoria Arte Ciudadano 2025',
    changes_description: '5 nuevos enlaces detectados: Convocatoria Arte Ciudadano, Guía práctica, FAQs, Proyectos anteriores, Contacto',
    priority: 'ALTA',
    status: 'relevant',
    ai_summary: 'Nueva convocatoria enfocada en proyectos de arte participativo que generen impacto social en barrios vulnerables.',
    ai_keywords: JSON.stringify(['arte', 'participación ciudadana', 'impacto social', 'barrios', 'comunidad']),
    deadline_date: '2025-04-30',
    is_new_convocatoria: 1,
    notes: 'Prioridad alta - Encaja perfectamente con varios de nuestros proyectos',
  },
  {
    source_name: 'Fundación Mutua Madrileña',
    source_type: 'fundacion',
    url: 'https://www.fundacionmutua.es/accion-social/',
    change_type: 'content_change',
    old_value: 'Apoyo a personas con discapacidad - 500.000€',
    new_value: 'Apoyo integral a personas con discapacidad - 750.000€ con nuevas líneas de actuación',
    changes_description: 'Contenido modificado (similitud: 68%)',
    priority: 'MEDIA',
    status: 'relevant',
    ai_summary: 'Ampliación del programa de apoyo a personas con discapacidad, incluyendo nuevas líneas para empleo inclusivo y ocio accesible.',
    ai_keywords: JSON.stringify(['discapacidad', 'inclusión', 'empleo', 'accesibilidad', 'apoyo social']),
    deadline_date: '2025-07-15',
    is_new_convocatoria: 0,
  },
  {
    source_name: 'Diagram Consultores',
    source_type: 'otra_fuente',
    url: 'https://www.diagramconsultores.com/convocatorias-subvenciones/',
    change_type: 'headings_added',
    old_value: null,
    new_value: 'Fondos Next Generation para ONG',
    changes_description: '3 nuevos encabezados: Fondos Next Generation, Transformación Digital ONG, Guía de solicitud',
    priority: 'ALTA',
    status: 'relevant',
    ai_summary: 'Publicación de información sobre acceso de ONGs a fondos Next Generation EU para transformación digital y sostenibilidad.',
    ai_keywords: JSON.stringify(['fondos europeos', 'next generation', 'transformación digital', 'ong', 'sostenibilidad']),
    deadline_date: '2025-08-31',
    is_new_convocatoria: 1,
  },
  {
    source_name: 'Las Fundaciones - Portal',
    source_type: 'otra_fuente',
    url: 'https://lasfundaciones.com/category/convocatorias/',
    change_type: 'links_added',
    old_value: null,
    new_value: 'Recopilación: 12 convocatorias abiertas en enero 2025',
    changes_description: '12 nuevos enlaces detectados de diferentes fundaciones',
    priority: 'BAJA',
    status: 'relevant',
    ai_summary: 'Actualización mensual del portal con un resumen de convocatorias activas de múltiples fundaciones.',
    ai_keywords: JSON.stringify(['recopilación', 'múltiples fundaciones', 'resumen', 'enero', 'actualización']),
    deadline_date: null,
    is_new_convocatoria: 0,
  },
  {
    source_name: 'Fundación Banco Santander',
    source_type: 'fundacion',
    url: 'https://www.fundacionbancosantander.com/es/accion-social/',
    change_type: 'dates_changed',
    old_value: 'Plazo presentación: 1 de enero - 28 de febrero',
    new_value: 'Plazo presentación: 1 de enero - 15 de marzo (ampliado)',
    changes_description: 'Fechas actualizadas. Nuevo plazo: 15/03/2025',
    priority: 'MEDIA',
    status: 'relevant',
    ai_summary: 'Ampliación del plazo para el programa de becas y ayudas a proyectos educativos. Se añaden 15 días adicionales.',
    ai_keywords: JSON.stringify(['educación', 'becas', 'formación', 'ampliación', 'estudiantes']),
    deadline_date: '2025-03-15',
    is_new_convocatoria: 0,
  },
];

try {
  db.exec('BEGIN TRANSACTION');

  const insertStmt = db.prepare(`
    INSERT INTO change_history (
      source_name, source_type, url, change_type, old_value, new_value,
      changes_description, priority, status, ai_summary, ai_keywords,
      deadline_date, is_new_convocatoria, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const change of mockChanges) {
    try {
      insertStmt.run(
        change.source_name,
        change.source_type,
        change.url,
        change.change_type,
        change.old_value,
        change.new_value,
        change.changes_description,
        change.priority,
        change.status,
        change.ai_summary,
        change.ai_keywords,
        change.deadline_date,
        change.is_new_convocatoria,
        change.notes || null
      );
      added++;
      console.log(`  ✓ ${change.source_name} [${change.priority}]`);
    } catch (err) {
      console.log(`  ⚠️  ${change.source_name} - Ya existe o error`);
    }
  }

  db.exec('COMMIT');

  console.log(`\n✅ ${added} cambios relevantes añadidos exitosamente\n`);

  // Mostrar estadísticas
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN priority = 'ALTA' THEN 1 END) as alta,
      COUNT(CASE WHEN priority = 'MEDIA' THEN 1 END) as media,
      COUNT(CASE WHEN priority = 'BAJA' THEN 1 END) as baja,
      COUNT(CASE WHEN source_type = 'fundacion' THEN 1 END) as fundaciones,
      COUNT(CASE WHEN source_type = 'ente_publico' THEN 1 END) as entes,
      COUNT(CASE WHEN source_type = 'otra_fuente' THEN 1 END) as otras
    FROM change_history WHERE status = 'relevant'
  `).get();

  console.log('📊 Estadísticas del Kanban:');
  console.log(`   Total: ${stats.total} convocatorias relevantes`);
  console.log(`   Prioridad: ${stats.alta} Alta, ${stats.media} Media, ${stats.baja} Baja`);
  console.log(`   Fuentes: ${stats.fundaciones} Fundaciones, ${stats.entes} Entes Públicos, ${stats.otras} Otras`);
  console.log('\n🌐 Accede a: http://192.168.255.123:3000');
  console.log('   para ver el Kanban con los datos de prueba\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}
