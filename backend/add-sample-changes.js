import db from './database.js';
import crypto from 'crypto';

console.log('🚀 Añadiendo cambios de muestra de las fuentes configuradas...\n');

// Obtener fuentes reales
const fundaciones = db.prepare('SELECT * FROM fundaciones LIMIT 10').all();

const sampleChanges = [
  {
    source: fundaciones[0],
    type: 'fundacion',
    change_type: 'new_page',
    description: 'Nueva convocatoria de proyectos sociales 2025',
    priority: 'ALTA',
    ai_summary: 'Se ha publicado una nueva convocatoria para proyectos de inclusión social dirigidos a jóvenes en situación de vulnerabilidad. Dotación máxima de 30.000€ por proyecto.',
    deadline_date: '2025-12-15',
    ai_keywords: ['inclusión social', 'jóvenes', 'vulnerabilidad', 'proyectos', 'financiación'],
    is_new_convocatoria: true
  },
  {
    source: fundaciones[1],
    type: 'fundacion',
    change_type: 'dates_changed',
    description: 'Ampliación de plazo para la convocatoria DGrow',
    priority: 'ALTA',
    ai_summary: 'El plazo de presentación de solicitudes se ha ampliado hasta el 30 de noviembre. Se han actualizado las bases de la convocatoria.',
    deadline_date: '2025-11-30',
    ai_keywords: ['ampliación', 'plazo', 'DGrow', 'emprendimiento', 'innovación'],
    is_new_convocatoria: false
  },
  {
    source: fundaciones[2],
    type: 'fundacion',
    change_type: 'links_added',
    description: 'Nuevos documentos: bases reguladoras y formulario de solicitud',
    priority: 'MEDIA',
    ai_summary: 'Se han publicado las bases reguladoras definitivas y el formulario de solicitud online para la convocatoria de proyectos asistenciales.',
    deadline_date: '2025-12-20',
    ai_keywords: ['bases', 'formulario', 'solicitud', 'asistencial', 'discapacidad'],
    is_new_convocatoria: false
  },
  {
    source: fundaciones[3],
    type: 'fundacion',
    change_type: 'headings_added',
    description: 'Nueva sección: Proyectos de Innovación Social VII Edición',
    priority: 'ALTA',
    ai_summary: 'Bidafarma lanza la séptima edición de su convocatoria de proyectos de innovación social en el ámbito sanitario.',
    deadline_date: '2026-01-15',
    ai_keywords: ['innovación social', 'sanitario', 'Bidafarma', 'farmacia', 'salud'],
    is_new_convocatoria: true
  },
  {
    source: fundaciones[4],
    type: 'fundacion',
    change_type: 'content_change',
    description: 'Actualización de requisitos y criterios de valoración',
    priority: 'MEDIA',
    ai_summary: 'Se han actualizado los criterios de valoración priorizando proyectos con impacto directo en beneficiarios y sostenibilidad a largo plazo.',
    deadline_date: null,
    ai_keywords: ['requisitos', 'valoración', 'impacto', 'sostenibilidad'],
    is_new_convocatoria: false
  }
];

for (const change of sampleChanges) {
  if (!change.source) continue;

  const id = crypto.randomBytes(16).toString('hex');

  db.prepare(`
    INSERT INTO change_history (
      id, fundacion_id, url, change_type, source_type, source_name,
      changes_description, priority, status, ai_summary, deadline_date,
      ai_keywords, is_new_convocatoria, detected_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    id,
    change.source.id,
    change.source.url,
    change.change_type,
    change.type,
    change.source.name,
    change.description,
    change.priority,
    change.ai_summary,
    change.deadline_date,
    JSON.stringify(change.ai_keywords),
    change.is_new_convocatoria ? 1 : 0
  );

  console.log(`✓ ${change.source.name} - ${change.description}`);
}

console.log('\n✅ Cambios de muestra añadidos!');
console.log('\n💡 Estos son ejemplos basados en tus fuentes configuradas.');
console.log('   El scraper irá añadiendo cambios reales automáticamente.');
