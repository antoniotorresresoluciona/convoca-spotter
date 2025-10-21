import crypto from 'crypto';
import { analyzeChange, checkOllamaHealth } from './ollama-service.js';

/**
 * Sistema de detección de cambios más preciso
 * Similar a changedetection.io pero adaptado a nuestras necesidades
 */

/**
 * Calcula hash SHA-256 de contenido
 */
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extrae SOLO el contenido visible y textual del HTML
 * Ignora completamente elementos técnicos, scripts, estilos, y elementos dinámicos
 */
function extractTextContent(html) {
  let text = html;

  // PASO 1: Eliminar COMPLETAMENTE elementos que no son contenido
  // Scripts (con todo su contenido)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '');

  // Estilos (con todo su contenido)
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, '');

  // Comentarios HTML
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Noscript, iframe, SVG completos
  text = text.replace(/<(noscript|iframe|svg)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gis, '');

  // Head completo (contiene meta, links, scripts adicionales)
  text = text.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gis, '');

  // Elementos de navegación y estructura que cambian
  text = text.replace(/<(nav|header|footer|aside|form)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gis, '');

  // Meta tags sueltos
  text = text.replace(/<meta[^>]*>/gi, '');
  text = text.replace(/<link[^>]*>/gi, '');

  // PASO 2: Eliminar SOLO atributos dinámicos (NO href ni src de contenido)
  // Eliminar IDs y clases dinámicas
  text = text.replace(/\s+id="[^"]*"/gi, '');
  text = text.replace(/\s+class="[^"]*"/gi, '');
  // Eliminar atributos data-*
  text = text.replace(/\s+data-[a-z\-]+="[^"]*"/gi, '');
  text = text.replace(/\s+data-[a-z\-]+='[^']*'/gi, '');
  // Eliminar estilos inline
  text = text.replace(/\s+style="[^"]*"/gi, '');
  // Eliminar eventos onclick, onload, etc.
  text = text.replace(/\s+on[a-z]+="[^"]*"/gi, '');

  // PASO 3: Extraer solo el texto de los tags restantes (main, article, div, p, h1-h6, span, etc)
  text = text.replace(/<[^>]+>/g, ' ');

  // PASO 4: Limpiar el texto resultante
  // Eliminar números largos (timestamps, versiones, IDs)
  text = text.replace(/\b\d{8,}\b/g, '');

  // Eliminar URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '');
  text = text.replace(/www\.[^\s]+/g, '');

  // Eliminar emails
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

  // Normalizar espacios en blanco
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');

  // PASO 5: Filtrar líneas que no son contenido real
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Ignorar líneas vacías
      if (!line || line.length < 3) return false;

      // Ignorar líneas que son solo fechas (formato típico)
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(line)) return false;

      // Ignorar líneas que son solo números
      if (/^\d+$/.test(line)) return false;

      // Ignorar líneas que son solo caracteres especiales
      if (/^[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/.test(line)) return false;

      // Ignorar palabras clave técnicas comunes
      const technicalWords = ['javascript', 'jquery', 'cookie', 'analytics', 'gtm', 'dataLayer'];
      if (technicalWords.some(word => line.toLowerCase().includes(word))) return false;

      return true;
    });

  return lines.join('\n').trim();
}

/**
 * Extrae secciones clave del HTML
 */
function extractKeySections(html) {
  const sections = {
    title: '',
    headings: [],
    links: [],
    dates: [],
  };

  // Extraer título
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    sections.title = titleMatch[1].trim();
  }

  // Extraer h1, h2, h3
  const headingMatches = html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi);
  for (const match of headingMatches) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) sections.headings.push(text);
  }

  // Extraer enlaces con palabras clave
  const linkMatches = html.matchAll(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi);
  for (const match of linkMatches) {
    const text = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const keywords = ['convocatoria', 'ayuda', 'subvencion', 'beca', 'plazo', 'solicitud'];

    if (keywords.some(kw => text.includes(kw))) {
      sections.links.push({
        href: match[1],
        text: match[2].replace(/<[^>]+>/g, '').trim()
      });
    }
  }

  // Extraer fechas (formato dd/mm/yyyy o yyyy-mm-dd)
  // Solo extraer fechas que estén cerca de keywords relevantes
  const htmlLower = html.toLowerCase();
  const dateMatches = html.matchAll(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g);
  for (const match of dateMatches) {
    const position = match.index;
    const context = htmlLower.substring(Math.max(0, position - 100), Math.min(htmlLower.length, position + 100));

    // Solo incluir fechas que estén cerca de palabras clave relevantes
    if (context.includes('plazo') || context.includes('convocatoria') ||
        context.includes('solicitud') || context.includes('presentación') ||
        context.includes('deadline') || context.includes('hasta')) {
      sections.dates.push(match[1]);
    }
  }

  return sections;
}

/**
 * Compara dos versiones de contenido y detecta cambios específicos
 */
export function detectChanges(oldHtml, newHtml) {
  const changes = [];

  // 1. Detectar cambios en hash general
  const oldHash = calculateHash(oldHtml);
  const newHash = calculateHash(newHtml);

  if (oldHash === newHash) {
    return { hasChanges: false, changes: [] };
  }

  // 2. Analizar secciones clave
  const oldSections = extractKeySections(oldHtml);
  const newSections = extractKeySections(newHtml);

  // Cambio en título
  if (oldSections.title !== newSections.title) {
    changes.push({
      type: 'title_change',
      old: oldSections.title,
      new: newSections.title,
      priority: 'high'
    });
  }

  // Cambios en encabezados - SOLO si contienen keywords relevantes
  const oldHeadings = new Set(oldSections.headings);
  const newHeadings = new Set(newSections.headings);
  const relevantKeywords = ['convocatoria', 'ayuda', 'subvencion', 'beca', 'financiacion', 'programa', 'plazo'];

  const addedHeadings = [...newHeadings].filter(h => {
    const isNew = !oldHeadings.has(h);
    const isRelevant = relevantKeywords.some(kw => h.toLowerCase().includes(kw));
    return isNew && isRelevant;
  });

  const removedHeadings = [...oldHeadings].filter(h => {
    const isRemoved = !newHeadings.has(h);
    const isRelevant = relevantKeywords.some(kw => h.toLowerCase().includes(kw));
    return isRemoved && isRelevant;
  });

  if (addedHeadings.length > 0) {
    changes.push({
      type: 'headings_added',
      items: addedHeadings,
      priority: 'high'
    });
  }

  if (removedHeadings.length > 0) {
    changes.push({
      type: 'headings_removed',
      items: removedHeadings,
      priority: 'high'
    });
  }

  // Cambios en enlaces relevantes
  const oldLinks = new Set(oldSections.links.map(l => l.href));
  const newLinks = new Set(newSections.links.map(l => l.href));

  const addedLinks = newSections.links.filter(l => !oldLinks.has(l.href));
  const removedLinks = oldSections.links.filter(l => !newLinks.has(l.href));

  if (addedLinks.length > 0) {
    changes.push({
      type: 'links_added',
      items: addedLinks,
      priority: 'high'
    });
  }

  if (removedLinks.length > 0) {
    changes.push({
      type: 'links_removed',
      items: removedLinks,
      priority: 'normal'
    });
  }

  // Cambios en fechas (posibles plazos)
  const oldDates = new Set(oldSections.dates);
  const newDates = new Set(newSections.dates);

  const addedDates = [...newDates].filter(d => !oldDates.has(d));
  const removedDates = [...oldDates].filter(d => !newDates.has(d));

  if (addedDates.length > 0 || removedDates.length > 0) {
    changes.push({
      type: 'dates_changed',
      added: addedDates,
      removed: removedDates,
      priority: 'urgent'
    });
  }

  // 3. Comparar contenido textual (cambios generales)
  const oldText = extractTextContent(oldHtml);
  const newText = extractTextContent(newHtml);

  const similarity = calculateSimilarity(oldText, newText);

  // Solo reportar cambios de contenido si:
  // 1. La similitud es muy baja (<50%) Y
  // 2. Ya hay otros cambios detectados (no es solo ruido general)
  if (similarity < 0.5 && changes.length > 0) {
    changes.push({
      type: 'content_change',
      similarity: Math.round(similarity * 100),
      priority: 'normal'
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    oldHash,
    newHash
  };
}

/**
 * Calcula similitud entre dos textos (Jaccard similarity simplificado)
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 1;
}

/**
 * Analiza cambios con IA si está disponible
 */
export async function analyzeChangesWithAI(changes, sourceName, oldHash, newHash) {
  const ollamaAvailable = await checkOllamaHealth();

  if (!ollamaAvailable) {
    return {
      summary: generateBasicSummary(changes),
      aiAnalysis: null,
      priority: determinePriority(changes)
    };
  }

  try {
    const analysis = await analyzeChange(oldHash, newHash, sourceName);

    return {
      summary: analysis.summary,
      aiAnalysis: analysis,
      priority: mapRelevanceToPriority(analysis.relevance),
      keywords: analysis.keywords || []
    };
  } catch (error) {
    console.error('Error en análisis IA:', error);
    return {
      summary: generateBasicSummary(changes),
      aiAnalysis: null,
      priority: determinePriority(changes)
    };
  }
}

/**
 * Genera resumen básico sin IA
 */
function generateBasicSummary(changes) {
  const summaryParts = [];

  for (const change of changes) {
    switch (change.type) {
      case 'title_change':
        summaryParts.push('Cambio en el título');
        break;
      case 'headings_added':
        summaryParts.push(`${change.items.length} nuevos encabezados`);
        break;
      case 'links_added':
        summaryParts.push(`${change.items.length} nuevos enlaces`);
        break;
      case 'dates_changed':
        summaryParts.push('Cambios en fechas/plazos');
        break;
      case 'content_change':
        summaryParts.push('Actualización de contenido');
        break;
    }
  }

  return summaryParts.join(', ') || 'Cambios detectados';
}

/**
 * Determina prioridad basada en tipos de cambios
 */
function determinePriority(changes) {
  const priorities = changes.map(c => c.priority);

  if (priorities.includes('urgent')) return 'urgent';
  if (priorities.includes('high')) return 'high';
  if (priorities.includes('normal')) return 'normal';
  return 'low';
}

/**
 * Mapea relevancia de IA a prioridad
 */
function mapRelevanceToPriority(relevance) {
  switch (relevance) {
    case 'ALTA': return 'urgent';
    case 'MEDIA': return 'normal';
    case 'BAJA': return 'low';
    default: return 'normal';
  }
}
