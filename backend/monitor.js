import db from './database.js';
import { detectChanges, analyzeChangesWithAI } from './change-detection.js';
import { scrapeUrl, extractRelevantLinks, crawlAllPendingSublinks } from './scraper.js';
import { crawlWithSublinks, crawlSinglePage } from './crawlee-service.js';

// Monitorear fundaciones
export async function monitorFundaciones(options = {}) {
  console.log('\n=== MONITOREANDO FUNDACIONES ===');
  const useDeepCrawl = options.deepCrawl || false;

  const fundaciones = db.prepare('SELECT * FROM fundaciones WHERE enabled = 1 OR enabled IS NULL').all();

  const results = {
    checked: 0,
    changes: 0,
    errors: 0,
    newSublinks: 0,
  };

  for (const fundacion of fundaciones) {
    results.checked++;
    console.log(`\n[${results.checked}/${fundaciones.length}] ${fundacion.name}`);

    try {
      // Pequeño delay para no saturar
      await new Promise(resolve => setTimeout(resolve, 1500));

      let html, hash, sublinks, success, error;

      if (useDeepCrawl) {
        // Usar crawling profundo con Crawlee
        console.log(`  🕷️  Usando crawling profundo (depth ${options.maxDepth || 2})`);
        const crawlResults = await crawlWithSublinks(fundacion.url, options.maxDepth || 2);

        if (crawlResults && crawlResults.length > 0) {
          // Primera página es la principal
          const mainPage = crawlResults[0];
          html = mainPage.html;
          hash = mainPage.hash;
          success = true;

          // Sublinks son las páginas secundarias
          sublinks = crawlResults.slice(1).map(page => ({
            url: page.url,
            text: page.content?.titles[0] || 'Sublink',
            relevance: page.content?.paragraphs.length > 0 ? 'alta' : 'media'
          }));
        } else {
          success = false;
          error = 'No se pudo crawlear la página';
        }
      } else {
        // Usar scraping normal
        const scrapeResult = await scrapeUrl(fundacion.url);
        ({ html, hash, sublinks, success, error } = scrapeResult);
      }

      if (!success) {
        results.errors++;
        console.log(`  ❌ Error: ${error}`);
        continue;
      }

      // Detectar cambios detallados
      let changeDetection = { hasChanges: false, changes: [] };

      if (fundacion.last_html && html) {
        changeDetection = detectChanges(fundacion.last_html, html);
      } else if (fundacion.last_hash && fundacion.last_hash !== hash) {
        changeDetection.hasChanges = true;
      }

      // Actualizar fundación
      db.prepare(`
        UPDATE fundaciones
        SET last_hash = ?, last_html = ?, status = ?, last_checked = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(hash, html.substring(0, 50000), changeDetection.hasChanges ? 'updated' : 'unchanged', fundacion.id);

      if (changeDetection.hasChanges) {
        results.changes++;
        console.log(`  ✓ CAMBIOS DETECTADOS (${changeDetection.changes.length} tipos)`);

        // Analizar cambios con IA si está disponible
        const analysis = await analyzeChangesWithAI(
          changeDetection.changes,
          fundacion.name,
          fundacion.last_hash,
          hash
        );

        // Registrar cada tipo de cambio
        for (const change of changeDetection.changes) {
          let changeDescription = '';
          let changeUrl = fundacion.url;

          switch (change.type) {
            case 'title_change':
              changeDescription = `Título actualizado: "${change.new}"`;
              break;
            case 'headings_added':
              changeDescription = `${change.items.length} nuevos encabezados: ${change.items.slice(0, 2).join(', ')}`;
              break;
            case 'links_added':
              changeDescription = `${change.items.length} nuevos enlaces detectados`;
              if (change.items[0]) {
                // Asegurar que la URL sea absoluta
                try {
                  changeUrl = new URL(change.items[0].href, fundacion.url).href;
                } catch (e) {
                  changeUrl = change.items[0].href;
                }
                changeDescription += `: ${change.items[0].text}`;
              }
              break;
            case 'dates_changed':
              changeDescription = `Fechas actualizadas. Añadidas: ${change.added.length}, Eliminadas: ${change.removed.length}`;
              break;
            case 'content_change':
              changeDescription = `Contenido modificado (similitud: ${change.similarity}%)`;
              break;
          }

          db.prepare(`
            INSERT INTO change_history (
              fundacion_id, url, change_type, old_value, new_value,
              source_type, source_name, changes_description, priority, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            fundacion.id,
            changeUrl,
            change.type,
            fundacion.last_hash,
            hash,
            'fundacion',
            fundacion.name,
            changeDescription + (analysis.aiAnalysis ? `\n\nAnálisis IA: ${analysis.summary}` : ''),
            change.priority,
            'relevant'
          );
        }

        console.log(`  📊 Análisis: ${analysis.summary}`);
        console.log(`  🎯 Prioridad: ${analysis.priority}`);
      } else {
        console.log(`  - Sin cambios`);
      }

      // Procesar sublinks (solo las primeras 10 relevantes)
      if (sublinks && sublinks.length > 0) {
        const limitedSublinks = sublinks.slice(0, 10);
        console.log(`  📎 ${limitedSublinks.length} enlaces relevantes detectados`);

        // Guardar sublinks en la base de datos
        for (const link of limitedSublinks) {
          // Verificar si el sublink ya existe
          const existing = db.prepare(
            'SELECT id FROM sublinks WHERE fundacion_id = ? AND url = ?'
          ).get(fundacion.id, link.url);

          if (existing) {
            // Actualizar last_seen
            db.prepare(
              'UPDATE sublinks SET last_seen = CURRENT_TIMESTAMP WHERE id = ?'
            ).run(existing.id);
          } else {
            // Insertar nuevo sublink
            db.prepare(`
              INSERT INTO sublinks (fundacion_id, url, link_text)
              VALUES (?, ?, ?)
            `).run(fundacion.id, link.url, link.text);
            results.newSublinks++;
          }
        }
      }

    } catch (error) {
      results.errors++;
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Fundaciones: ${results.checked} revisadas, ${results.changes} cambios, ${results.errors} errores`);
  return results;
}

// Monitorear entes públicos
export async function monitorEntesPublicos() {
  console.log('\n=== MONITOREANDO ENTES PÚBLICOS ===');

  const entes = db.prepare('SELECT * FROM entes_publicos WHERE enabled = 1 OR enabled IS NULL').all();

  const results = {
    checked: 0,
    changes: 0,
    errors: 0,
  };

  for (const ente of entes) {
    results.checked++;
    console.log(`\n[${results.checked}/${entes.length}] ${ente.name}`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { html, hash, success, error } = await scrapeUrl(ente.url);

      if (!success) {
        results.errors++;
        console.log(`  ❌ Error: ${error}`);
        continue;
      }

      // Detectar cambios detallados
      let changeDetection = { hasChanges: false, changes: [] };

      if (ente.last_html && html) {
        changeDetection = detectChanges(ente.last_html, html);
      } else if (ente.last_hash && ente.last_hash !== hash) {
        changeDetection.hasChanges = true;
      }

      db.prepare(`
        UPDATE entes_publicos
        SET last_hash = ?, last_html = ?, status = ?, last_checked = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(hash, html.substring(0, 50000), changeDetection.hasChanges ? 'updated' : 'unchanged', ente.id);

      if (changeDetection.hasChanges) {
        results.changes++;
        console.log(`  ✓ CAMBIOS DETECTADOS (${changeDetection.changes.length} tipos)`);

        // Analizar cambios con IA si está disponible
        const analysis = await analyzeChangesWithAI(
          changeDetection.changes,
          ente.name,
          ente.last_hash,
          hash
        );

        // Registrar cada tipo de cambio
        for (const change of changeDetection.changes) {
          let changeDescription = '';
          let changeUrl = ente.url;

          switch (change.type) {
            case 'title_change':
              changeDescription = `Título actualizado: "${change.new}"`;
              break;
            case 'headings_added':
              changeDescription = `${change.items.length} nuevos encabezados: ${change.items.slice(0, 2).join(', ')}`;
              break;
            case 'links_added':
              changeDescription = `${change.items.length} nuevos enlaces detectados`;
              if (change.items[0]) {
                // Asegurar que la URL sea absoluta
                try {
                  changeUrl = new URL(change.items[0].href, fundacion.url).href;
                } catch (e) {
                  changeUrl = change.items[0].href;
                }
                changeDescription += `: ${change.items[0].text}`;
              }
              break;
            case 'dates_changed':
              changeDescription = `Fechas actualizadas. Añadidas: ${change.added.length}, Eliminadas: ${change.removed.length}`;
              break;
            case 'content_change':
              changeDescription = `Contenido modificado (similitud: ${change.similarity}%)`;
              break;
          }

          db.prepare(`
            INSERT INTO change_history (
              ente_publico_id, url, change_type, old_value, new_value,
              source_type, source_name, changes_description, priority, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ente.id,
            changeUrl,
            change.type,
            ente.last_hash,
            hash,
            'ente_publico',
            ente.name,
            changeDescription + (analysis.aiAnalysis ? `\n\nAnálisis IA: ${analysis.summary}` : ''),
            change.priority,
            'relevant'
          );
        }

        console.log(`  📊 Análisis: ${analysis.summary}`);
        console.log(`  🎯 Prioridad: ${analysis.priority}`);
      } else {
        console.log(`  - Sin cambios`);
      }

    } catch (error) {
      results.errors++;
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Entes Públicos: ${results.checked} revisados, ${results.changes} cambios, ${results.errors} errores`);
  return results;
}

// Monitorear otras fuentes
export async function monitorOtrasFuentes() {
  console.log('\n=== MONITOREANDO OTRAS FUENTES ===');

  const fuentes = db.prepare('SELECT * FROM otras_fuentes WHERE enabled = 1 OR enabled IS NULL').all();

  const results = {
    checked: 0,
    changes: 0,
    errors: 0,
  };

  for (const fuente of fuentes) {
    results.checked++;
    console.log(`\n[${results.checked}/${fuentes.length}] ${fuente.name}`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { html, hash, success, error } = await scrapeUrl(fuente.url);

      if (!success) {
        results.errors++;
        console.log(`  ❌ Error: ${error}`);
        continue;
      }

      // Detectar cambios detallados
      let changeDetection = { hasChanges: false, changes: [] };

      if (fuente.last_html && html) {
        changeDetection = detectChanges(fuente.last_html, html);
      } else if (fuente.last_hash && fuente.last_hash !== hash) {
        changeDetection.hasChanges = true;
      }

      db.prepare(`
        UPDATE otras_fuentes
        SET last_hash = ?, last_html = ?, status = ?, last_checked = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(hash, html.substring(0, 50000), changeDetection.hasChanges ? 'updated' : 'unchanged', fuente.id);

      if (changeDetection.hasChanges) {
        results.changes++;
        console.log(`  ✓ CAMBIOS DETECTADOS (${changeDetection.changes.length} tipos)`);

        // Analizar cambios con IA si está disponible
        const analysis = await analyzeChangesWithAI(
          changeDetection.changes,
          fuente.name,
          fuente.last_hash,
          hash
        );

        // Registrar cada tipo de cambio
        for (const change of changeDetection.changes) {
          let changeDescription = '';
          let changeUrl = fuente.url;

          switch (change.type) {
            case 'title_change':
              changeDescription = `Título actualizado: "${change.new}"`;
              break;
            case 'headings_added':
              changeDescription = `${change.items.length} nuevos encabezados: ${change.items.slice(0, 2).join(', ')}`;
              break;
            case 'links_added':
              changeDescription = `${change.items.length} nuevos enlaces detectados`;
              if (change.items[0]) {
                // Asegurar que la URL sea absoluta
                try {
                  changeUrl = new URL(change.items[0].href, fundacion.url).href;
                } catch (e) {
                  changeUrl = change.items[0].href;
                }
                changeDescription += `: ${change.items[0].text}`;
              }
              break;
            case 'dates_changed':
              changeDescription = `Fechas actualizadas. Añadidas: ${change.added.length}, Eliminadas: ${change.removed.length}`;
              break;
            case 'content_change':
              changeDescription = `Contenido modificado (similitud: ${change.similarity}%)`;
              break;
          }

          db.prepare(`
            INSERT INTO change_history (
              otra_fuente_id, url, change_type, old_value, new_value,
              source_type, source_name, changes_description, priority, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            fuente.id,
            changeUrl,
            change.type,
            fuente.last_hash,
            hash,
            'otra_fuente',
            fuente.name,
            changeDescription + (analysis.aiAnalysis ? `\n\nAnálisis IA: ${analysis.summary}` : ''),
            change.priority,
            'relevant'
          );
        }

        console.log(`  📊 Análisis: ${analysis.summary}`);
        console.log(`  🎯 Prioridad: ${analysis.priority}`);
      } else {
        console.log(`  - Sin cambios`);
      }

    } catch (error) {
      results.errors++;
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Otras Fuentes: ${fuentes.checked} revisadas, ${results.changes} cambios, ${results.errors} errores`);
  return results;
}

// Monitorear sublinks
export async function monitorSublinks(options = {}) {
  console.log('\n=== MONITOREANDO SUBLINKS ===');

  const sublinkResults = await crawlAllPendingSublinks({
    maxSublinks: options.maxSublinks || 50,
    maxPerFundacion: options.maxPerFundacion || 10,
    maxDepth: options.maxDepth || 1,
    detectChangesFlag: true,
    updateDb: true
  });

  return sublinkResults;
}

// Monitorear todo (incluyendo sublinks)
export async function monitorAll(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 INICIO DE MONITOREO COMPLETO');
  console.log('='.repeat(60));
  console.log(`Fecha: ${new Date().toLocaleString('es-ES')}\n`);

  const startTime = Date.now();

  const fundacionesResults = await monitorFundaciones();
  const entesResults = await monitorEntesPublicos();
  const fuentesResults = await monitorOtrasFuentes();

  // Monitorear sublinks si está habilitado
  let sublinkResults = { total: 0, success: 0, errors: 0, changes: 0 };
  if (options.includeSublinks !== false) {
    sublinkResults = await monitorSublinks({
      maxSublinks: options.maxSublinks || 30,
      maxPerFundacion: options.maxPerFundacion || 5
    });
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  const totals = {
    checked: fundacionesResults.checked + entesResults.checked + fuentesResults.checked,
    changes: fundacionesResults.changes + entesResults.changes + fuentesResults.changes,
    errors: fundacionesResults.errors + entesResults.errors + fuentesResults.errors,
    sublinksChecked: sublinkResults.total,
    sublinksChanges: sublinkResults.changes,
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN TOTAL');
  console.log('='.repeat(60));
  console.log(`Total fuentes revisadas: ${totals.checked}`);
  console.log(`Total cambios detectados: ${totals.changes}`);
  console.log(`Total errores: ${totals.errors}`);
  console.log(`Sublinks revisados: ${totals.sublinksChecked}`);
  console.log(`Sublinks con cambios: ${totals.sublinksChanges}`);
  console.log(`Tiempo total: ${totalTime}s`);
  console.log('='.repeat(60) + '\n');

  return totals;
}
