import crypto from 'crypto';
import db from './database.js';
import { detectChanges, analyzeChangesWithAI } from './change-detection.js';

// Calcular hash SHA-256 de texto
function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Palabras clave para detectar enlaces relevantes
const KEYWORDS = [
  'convocatoria', 'convocatorias', 'ayuda', 'ayudas', 'subvencion', 'subvenciones',
  'beca', 'becas', 'grant', 'grants', 'financiacion', 'financiación', 'programa',
  'programas', 'solicitud', 'solicitudes', 'bases', 'requisitos', 'plazo', 'plazos'
];

// Extraer enlaces relevantes del HTML con su texto
export function extractRelevantLinks(html, baseUrl) {
  const links = [];
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    const textLower = text.toLowerCase();

    // Verificar si el texto contiene keywords
    const isRelevant = KEYWORDS.some(keyword => textLower.includes(keyword));

    if (isRelevant && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const url = new URL(href, baseUrl);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const existingLink = links.find(link => link.url === url.href);
          if (!existingLink) {
            links.push({ url: url.href, text });
          }
        }
      } catch (e) {
        console.error('Invalid URL:', href, e.message);
      }
    }
  }

  return links;
}

// Scraping de URL con retry
export async function scrapeUrl(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`  Scraping: ${url} (attempt ${i + 1}/${retries})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(30000), // 30 segundos timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const hash = hashText(html);
      const sublinks = extractRelevantLinks(html, url);

      return { html, hash, sublinks, success: true };
    } catch (error) {
      console.error(`  Error (attempt ${i + 1}): ${error.message}`);
      if (i === retries - 1) {
        return { html: '', hash: '', sublinks: [], success: false, error: error.message };
      }
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

// Crawlear un sublink y detectar cambios
export async function crawlSublink(sublinkId, options = {}) {
  const { detectChangesFlag = true, updateDb = true } = options;

  try {
    // Obtener el sublink de la base de datos
    const sublink = db.prepare('SELECT * FROM sublinks WHERE id = ?').get(sublinkId);

    if (!sublink) {
      throw new Error(`Sublink ${sublinkId} not found`);
    }

    console.log(`\n🔍 Crawling sublink: ${sublink.url}`);
    console.log(`   Link text: ${sublink.link_text}`);

    // Scraping del sublink
    const { html, hash, sublinks: nestedSublinks, success, error } = await scrapeUrl(sublink.url);

    if (!success) {
      console.log(`  ❌ Error: ${error}`);
      if (updateDb) {
        db.prepare(`
          UPDATE sublinks
          SET status = 'error', last_error = ?, last_checked = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(error, sublinkId);
      }
      return { success: false, error, sublinkId };
    }

    // Detectar cambios si hay un hash previo
    let changeDetection = { hasChanges: false, changes: [] };

    if (detectChangesFlag && sublink.last_html && html) {
      changeDetection = detectChanges(sublink.last_html, html);
    } else if (detectChangesFlag && sublink.last_hash && sublink.last_hash !== hash) {
      changeDetection.hasChanges = true;
    }

    // Actualizar el sublink en la base de datos
    if (updateDb) {
      db.prepare(`
        UPDATE sublinks
        SET last_hash = ?,
            last_html = ?,
            status = ?,
            last_checked = CURRENT_TIMESTAMP,
            crawl_count = crawl_count + 1
        WHERE id = ?
      `).run(
        hash,
        html.substring(0, 50000),
        changeDetection.hasChanges ? 'updated' : 'unchanged',
        sublinkId
      );
    }

    // Si hay cambios, registrarlos
    if (changeDetection.hasChanges && updateDb) {
      console.log(`  ✓ CAMBIOS DETECTADOS (${changeDetection.changes.length} tipos)`);

      // Obtener información de la fundación padre
      const fundacion = db.prepare('SELECT * FROM fundaciones WHERE id = ?').get(sublink.fundacion_id);

      // Analizar cambios con IA si está disponible
      const analysis = await analyzeChangesWithAI(
        changeDetection.changes,
        `${fundacion.name} - ${sublink.link_text}`,
        sublink.last_hash,
        hash
      );

      // Registrar cada tipo de cambio
      for (const change of changeDetection.changes) {
        let changeDescription = '';
        let changeUrl = sublink.url;

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
              try {
                changeUrl = new URL(change.items[0].href, sublink.url).href;
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
            fundacion_id, sublink_id, url, change_type, old_value, new_value,
            source_type, source_name, changes_description, priority, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sublink.fundacion_id,
          sublinkId,
          changeUrl,
          change.type,
          sublink.last_hash,
          hash,
          'sublink',
          `${fundacion.name} - ${sublink.link_text}`,
          changeDescription + (analysis.aiAnalysis ? `\n\nAnálisis IA: ${analysis.summary}` : ''),
          change.priority,
          'pending'
        );
      }

      console.log(`  📊 Análisis: ${analysis.summary}`);
      console.log(`  🎯 Prioridad: ${analysis.priority}`);
    } else {
      console.log(`  - Sin cambios`);
    }

    // Procesar nested sublinks si se encuentran (solo primer nivel)
    let newNestedSublinks = 0;
    if (nestedSublinks && nestedSublinks.length > 0) {
      const limitedNestedSublinks = nestedSublinks.slice(0, 5); // Limitar a 5 para evitar explosión
      console.log(`  📎 ${limitedNestedSublinks.length} enlaces anidados encontrados`);

      for (const nestedLink of limitedNestedSublinks) {
        // Verificar si ya existe
        const existing = db.prepare(
          'SELECT id FROM sublinks WHERE fundacion_id = ? AND url = ?'
        ).get(sublink.fundacion_id, nestedLink.url);

        if (!existing) {
          db.prepare(`
            INSERT INTO sublinks (fundacion_id, url, link_text, depth)
            VALUES (?, ?, ?, ?)
          `).run(sublink.fundacion_id, nestedLink.url, nestedLink.text, (sublink.depth || 1) + 1);
          newNestedSublinks++;
        }
      }

      if (newNestedSublinks > 0) {
        console.log(`  ✨ ${newNestedSublinks} nuevos enlaces anidados agregados`);
      }
    }

    return {
      success: true,
      sublinkId,
      hasChanges: changeDetection.hasChanges,
      changesCount: changeDetection.changes.length,
      newNestedSublinks
    };

  } catch (error) {
    console.error(`  ❌ Error crawling sublink ${sublinkId}: ${error.message}`);

    if (updateDb) {
      db.prepare(`
        UPDATE sublinks
        SET status = 'error', last_error = ?, last_checked = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(error.message, sublinkId);
    }

    return { success: false, error: error.message, sublinkId };
  }
}

// Crawlear todos los sublinks de una fundación
export async function crawlFundacionSublinks(fundacionId, options = {}) {
  const { maxDepth = 1, maxSublinks = 20 } = options;

  console.log(`\n🔎 Crawling sublinks for fundacion ${fundacionId}`);
  console.log(`   Max depth: ${maxDepth}, Max sublinks: ${maxSublinks}`);

  const fundacion = db.prepare('SELECT * FROM fundaciones WHERE id = ?').get(fundacionId);
  if (!fundacion) {
    throw new Error(`Fundación ${fundacionId} not found`);
  }

  console.log(`   Fundación: ${fundacion.name}`);

  // Obtener sublinks que necesitan crawling
  const sublinks = db.prepare(`
    SELECT * FROM sublinks
    WHERE fundacion_id = ?
      AND (depth IS NULL OR depth <= ?)
      AND (status IS NULL OR status != 'error')
    ORDER BY priority DESC, last_checked ASC NULLS FIRST
    LIMIT ?
  `).all(fundacionId, maxDepth, maxSublinks);

  console.log(`   ${sublinks.length} sublinks to crawl`);

  const results = {
    total: sublinks.length,
    success: 0,
    errors: 0,
    changes: 0,
    newNestedSublinks: 0
  };

  for (const sublink of sublinks) {
    // Pequeño delay para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await crawlSublink(sublink.id, options);

    if (result.success) {
      results.success++;
      if (result.hasChanges) {
        results.changes++;
      }
      results.newNestedSublinks += result.newNestedSublinks || 0;
    } else {
      results.errors++;
    }
  }

  console.log(`\n✅ Crawling completado:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   Éxitos: ${results.success}`);
  console.log(`   Errores: ${results.errors}`);
  console.log(`   Cambios detectados: ${results.changes}`);
  console.log(`   Nuevos enlaces anidados: ${results.newNestedSublinks}`);

  return results;
}

// Crawlear todos los sublinks pendientes
export async function crawlAllPendingSublinks(options = {}) {
  const { maxSublinks = 50, maxPerFundacion = 10 } = options;

  console.log(`\n🌐 CRAWLING ALL PENDING SUBLINKS`);
  console.log(`   Max total: ${maxSublinks}, Max per fundación: ${maxPerFundacion}`);

  // Obtener fundaciones que tienen sublinks pendientes
  const fundacionesWithSublinks = db.prepare(`
    SELECT DISTINCT f.id, f.name, COUNT(s.id) as pending_count
    FROM fundaciones f
    INNER JOIN sublinks s ON s.fundacion_id = f.id
    WHERE (s.last_checked IS NULL OR s.status = 'pending')
      AND (f.enabled = 1 OR f.enabled IS NULL)
    GROUP BY f.id, f.name
    ORDER BY pending_count DESC
  `).all();

  console.log(`   ${fundacionesWithSublinks.length} fundaciones con sublinks pendientes`);

  const overallResults = {
    fundaciones: 0,
    total: 0,
    success: 0,
    errors: 0,
    changes: 0,
    newNestedSublinks: 0
  };

  let totalProcessed = 0;

  for (const fundacion of fundacionesWithSublinks) {
    if (totalProcessed >= maxSublinks) {
      console.log(`\n⏸️  Límite de ${maxSublinks} sublinks alcanzado, deteniendo...`);
      break;
    }

    const remaining = maxSublinks - totalProcessed;
    const limit = Math.min(maxPerFundacion, remaining);

    console.log(`\n📍 ${fundacion.name} (${fundacion.pending_count} pendientes)`);

    const results = await crawlFundacionSublinks(fundacion.id, {
      ...options,
      maxSublinks: limit
    });

    overallResults.fundaciones++;
    overallResults.total += results.total;
    overallResults.success += results.success;
    overallResults.errors += results.errors;
    overallResults.changes += results.changes;
    overallResults.newNestedSublinks += results.newNestedSublinks;

    totalProcessed += results.total;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN TOTAL DE CRAWLING`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Fundaciones procesadas: ${overallResults.fundaciones}`);
  console.log(`Total sublinks: ${overallResults.total}`);
  console.log(`Éxitos: ${overallResults.success}`);
  console.log(`Errores: ${overallResults.errors}`);
  console.log(`Cambios detectados: ${overallResults.changes}`);
  console.log(`Nuevos enlaces anidados: ${overallResults.newNestedSublinks}`);
  console.log(`${'='.repeat(60)}\n`);

  return overallResults;
}
