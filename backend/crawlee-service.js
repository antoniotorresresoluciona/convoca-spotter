// Servicio de crawling profundo con Crawlee
import { CheerioCrawler, Dataset } from 'crawlee';
import crypto from 'crypto';

// Configuración
const CONFIG = {
  maxDepth: 2,
  maxPagesPerSource: 30,
  requestTimeout: 30000,
  maxRequestsPerMinute: 20,
  userAgent: 'ConvocaSpotter/1.0 (Mozilla/5.0 compatible)',
};

// Keywords para detectar relevancia
const KEYWORDS = [
  'convocatoria', 'ayuda', 'subvencion', 'subvención', 'beca',
  'plazo', 'requisitos', 'solicitud', 'bases', 'formulario',
  'proyecto', 'financiacion', 'financiación', 'fondo', 'dotacion',
  'dotación', 'beneficiario', 'entidad', 'organización', 'ong'
];

/**
 * Genera hash SHA-256 de un texto
 */
function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Verifica si un texto contiene palabras clave relevantes
 */
function isRelevantContent(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Verifica si una URL es válida y del mismo dominio
 */
function isValidUrl(url, baseDomain) {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseDomain);

    // Debe ser del mismo dominio o subdominio
    if (!urlObj.hostname.includes(baseObj.hostname) &&
        !baseObj.hostname.includes(urlObj.hostname)) {
      return false;
    }

    // Excluir archivos no HTML
    const ext = urlObj.pathname.split('.').pop().toLowerCase();
    const excludedExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'ico', 'woff', 'ttf'];
    if (excludedExts.includes(ext)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extrae enlaces relevantes de una página
 */
function extractRelevantLinks($, baseUrl, visited, depth) {
  const links = [];
  const baseDomain = new URL(baseUrl).origin;

  $('a[href]').each((_, elem) => {
    try {
      const href = $(elem).attr('href');
      if (!href) return;

      // Resolver URL relativas
      const absoluteUrl = new URL(href, baseUrl).href;

      // Verificar si ya fue visitada
      if (visited.has(absoluteUrl)) return;

      // Verificar si es válida
      if (!isValidUrl(absoluteUrl, baseUrl)) return;

      // Obtener texto del enlace
      const linkText = $(elem).text().trim();

      // Verificar relevancia
      if (isRelevantContent(linkText) || isRelevantContent(href)) {
        links.push({
          url: absoluteUrl,
          text: linkText,
          depth: depth + 1
        });
      }
    } catch (error) {
      // Ignorar errores en enlaces individuales
    }
  });

  return links;
}

/**
 * Extrae contenido relevante de una página
 */
function extractPageContent($) {
  // Eliminar scripts, styles y elementos no relevantes
  $('script, style, nav, header, footer, iframe').remove();

  // Extraer texto de títulos
  const titles = [];
  $('h1, h2, h3').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 5) {
      titles.push(text);
    }
  });

  // Extraer fechas (formato: DD/MM/YYYY, DD-MM-YYYY, etc.)
  const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
  const bodyText = $('body').text();
  const dates = [...new Set(bodyText.match(dateRegex) || [])];

  // Extraer párrafos relevantes
  const paragraphs = [];
  $('p, li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (isRelevantContent(text) && text.length > 20) {
      paragraphs.push(text.substring(0, 500)); // Limitar a 500 caracteres
    }
  });

  // Extraer enlaces a documentos
  const documents = [];
  $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href*="download"]').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    if (href) {
      documents.push({ url: href, text });
    }
  });

  return {
    titles,
    dates,
    paragraphs: paragraphs.slice(0, 10), // Máximo 10 párrafos relevantes
    documents: documents.slice(0, 20), // Máximo 20 documentos
  };
}

/**
 * Crawlea una URL con navegación profunda
 * @param {string} startUrl - URL inicial
 * @param {number} maxDepth - Profundidad máxima (default: 2)
 * @returns {Promise<Array>} - Array de resultados crawleados
 */
export async function crawlWithSublinks(startUrl, maxDepth = CONFIG.maxDepth) {
  const results = [];
  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];

  console.log(`🕷️  Iniciando crawl de: ${startUrl}`);

  // Configurar crawler
  const crawler = new CheerioCrawler({
    maxRequestsPerMinute: CONFIG.maxRequestsPerMinute,
    requestHandlerTimeoutSecs: CONFIG.requestTimeout / 1000,

    async requestHandler({ request, $, enqueueLinks }) {
      const { url, userData = {} } = request;
      const depth = userData.depth || 0;

      console.log(`  📄 Crawling [depth ${depth}]: ${url}`);

      // Marcar como visitada
      visited.add(url);

      // Extraer HTML completo
      const html = $.html();
      const contentHash = hashText(html);

      // Extraer contenido estructurado
      const content = extractPageContent($);

      // Guardar resultado
      results.push({
        url,
        depth,
        html,
        hash: contentHash,
        content,
        crawledAt: new Date().toISOString(),
      });

      // Si no hemos alcanzado la profundidad máxima, extraer sublinks
      if (depth < maxDepth && results.length < CONFIG.maxPagesPerSource) {
        const relevantLinks = extractRelevantLinks($, url, visited, depth);

        console.log(`    🔗 Encontrados ${relevantLinks.length} enlaces relevantes`);

        // Añadir enlaces a la cola (máximo 10 por página)
        for (const link of relevantLinks.slice(0, 10)) {
          if (!visited.has(link.url)) {
            queue.push({
              url: link.url,
              depth: link.depth
            });
          }
        }
      }
    },

    failedRequestHandler({ request, error }) {
      console.error(`  ❌ Error crawling ${request.url}:`, error.message);
    },
  });

  // Procesar cola
  try {
    // Procesar URL inicial
    await crawler.run([{
      url: startUrl,
      userData: { depth: 0 }
    }]);

    // Procesar sublinks de forma secuencial
    for (const item of queue.slice(1)) {
      if (results.length >= CONFIG.maxPagesPerSource) {
        console.log(`  ⚠️  Límite de páginas alcanzado (${CONFIG.maxPagesPerSource})`);
        break;
      }

      if (!visited.has(item.url)) {
        await crawler.run([{
          url: item.url,
          userData: { depth: item.depth }
        }]);

        // Rate limiting: esperar 2 segundos entre requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Crawl completado: ${results.length} páginas procesadas`);

  } catch (error) {
    console.error(`❌ Error en crawling:`, error);
  }

  return results;
}

/**
 * Extrae solo la página principal (sin sublinks)
 * Útil para monitoreo rápido
 */
export async function crawlSinglePage(url) {
  console.log(`🕷️  Crawling página individual: ${url}`);

  let result = null;

  const crawler = new CheerioCrawler({
    maxRequestsPerMinute: CONFIG.maxRequestsPerMinute,

    async requestHandler({ request, $ }) {
      const html = $.html();
      const content = extractPageContent($);

      result = {
        url: request.url,
        depth: 0,
        html,
        hash: hashText(html),
        content,
        crawledAt: new Date().toISOString(),
      };
    },

    failedRequestHandler({ request, error }) {
      console.error(`❌ Error: ${error.message}`);
    },
  });

  try {
    await crawler.run([url]);
    console.log(`✅ Página crawleada exitosamente`);
  } catch (error) {
    console.error(`❌ Error crawling:`, error);
  }

  return result;
}

/**
 * Encuentra documentos en una URL
 */
export async function findDocuments(url) {
  console.log(`📄 Buscando documentos en: ${url}`);

  const documents = [];

  const crawler = new CheerioCrawler({
    maxRequestsPerMinute: CONFIG.maxRequestsPerMinute,

    async requestHandler({ request, $ }) {
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        if (href && (
          href.endsWith('.pdf') ||
          href.endsWith('.doc') ||
          href.endsWith('.docx') ||
          href.endsWith('.xls') ||
          href.endsWith('.xlsx') ||
          href.includes('download')
        )) {
          try {
            const absoluteUrl = new URL(href, url).href;
            documents.push({
              url: absoluteUrl,
              text: text || 'Documento',
              type: href.split('.').pop().toLowerCase(),
            });
          } catch (error) {
            // Ignorar URLs inválidas
          }
        }
      });
    },
  });

  try {
    await crawler.run([url]);
    console.log(`✅ Encontrados ${documents.length} documentos`);
  } catch (error) {
    console.error(`❌ Error buscando documentos:`, error);
  }

  return documents;
}

export default {
  crawlWithSublinks,
  crawlSinglePage,
  findDocuments,
};
