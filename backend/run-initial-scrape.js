import db from './database.js';
import { scrapeUrl, extractRelevantLinks } from './scraper.js';

console.log('🚀 Iniciando scrape inicial de fuentes...\n');

// Obtener todas las fundaciones
const fundaciones = db.prepare('SELECT * FROM fundaciones WHERE enabled = 1').all();

console.log(`📊 ${fundaciones.length} fundaciones para procesar\n`);

let processed = 0;
let totalSublinks = 0;

for (const fundacion of fundaciones) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏛️  ${fundacion.name}`);
  console.log(`🔗 ${fundacion.url}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Scrape de la página principal
    const { html, hash, sublinks, success } = await scrapeUrl(fundacion.url);

    if (!success) {
      console.log('  ❌ Error al scrapear');
      continue;
    }

    // Actualizar hash en la base de datos
    db.prepare(`
      UPDATE fundaciones
      SET last_hash = ?, last_checked = CURRENT_TIMESTAMP, status = 'checked'
      WHERE id = ?
    `).run(hash, fundacion.id);

    console.log(`  ✓ Página scrapeada correctamente`);
    console.log(`  📎 ${sublinks.length} enlaces relevantes encontrados`);

    // Insertar sublinks
    const insertSublink = db.prepare(`
      INSERT OR IGNORE INTO sublinks (fundacion_id, url, link_text, depth)
      VALUES (?, ?, ?, 1)
    `);

    let added = 0;
    for (const sublink of sublinks.slice(0, 10)) { // Limitar a 10 por fundación
      try {
        insertSublink.run(fundacion.id, sublink.url, sublink.text);
        added++;
      } catch (err) {
        // Ignorar duplicados
      }
    }

    console.log(`  ✨ ${added} nuevos sublinks añadidos`);
    totalSublinks += added;
    processed++;

    // Pequeña pausa entre scrapes
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('📊 RESUMEN');
console.log(`${'='.repeat(60)}`);
console.log(`Fundaciones procesadas: ${processed}/${fundaciones.length}`);
console.log(`Total sublinks descubiertos: ${totalSublinks}`);
console.log('\n✅ Scrape inicial completado!');
console.log('\n💡 Próximos pasos:');
console.log('   1. Los sublinks se crawlearán automáticamente por el cron job');
console.log('   2. O puedes ejecutar: npm run crawl-sublinks');
