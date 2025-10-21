// Servicio de integración con Ollama para análisis de cambios

const OLLAMA_URL = 'http://192.168.255.121:11434';
const MODEL = 'ollama3.1:latest'; // Actualizado de llama3.2:1b

/**
 * Analiza cambios detectados usando Ollama
 * @param {string} oldContent - Contenido antiguo
 * @param {string} newContent - Contenido nuevo
 * @param {string} source - Nombre de la fuente
 * @returns {Promise<{summary: string, relevance: string, keywords: string[]}>}
 */
export async function analyzeChange(oldContent, newContent, source) {
  try {
    const prompt = `Eres un asistente experto en analizar cambios en páginas web de convocatorias de ayudas y subvenciones.

Fuente: ${source}

Contenido antiguo (hash): ${oldContent ? oldContent.substring(0, 50) : 'N/A'}
Contenido nuevo (hash): ${newContent ? newContent.substring(0, 50) : 'N/A'}

Analiza este cambio y proporciona:
1. Un resumen breve (máximo 2 líneas) de qué cambió
2. Nivel de relevancia: ALTA, MEDIA o BAJA
3. Hasta 5 palabras clave relacionadas

Responde en formato JSON:
{
  "summary": "descripción del cambio",
  "relevance": "ALTA|MEDIA|BAJA",
  "keywords": ["palabra1", "palabra2", ...]
}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 200,
        }
      }),
    });

    if (!response.ok) {
      console.error('Error en Ollama:', response.statusText);
      return {
        summary: 'Cambio detectado - análisis no disponible',
        relevance: 'MEDIA',
        keywords: []
      };
    }

    const data = await response.json();

    try {
      // Intentar parsear la respuesta JSON
      const analysis = JSON.parse(data.response);
      return analysis;
    } catch (parseError) {
      // Si no es JSON válido, extraer información básica
      return {
        summary: data.response.substring(0, 150) || 'Cambio detectado',
        relevance: 'MEDIA',
        keywords: []
      };
    }
  } catch (error) {
    console.error('Error al analizar con Ollama:', error);
    return {
      summary: 'Cambio detectado - análisis no disponible',
      relevance: 'MEDIA',
      keywords: []
    };
  }
}

/**
 * Verifica si Ollama está disponible
 */
export async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error('Ollama no disponible:', error.message);
    return false;
  }
}

/**
 * Extrae información relevante de un HTML
 * @param {string} html - HTML completo
 * @param {string} source - Nombre de la fuente
 * @returns {Promise<{summary: string, hasConvocatorias: boolean}>}
 */
export async function extractRelevantInfo(html, source) {
  try {
    // Extraer solo texto visible (eliminar scripts, styles, etc.)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Primeros 1000 caracteres

    const prompt = `Analiza este fragmento de texto de una página web de ${source}.

Texto:
${textContent}

¿Contiene información sobre convocatorias, ayudas, subvenciones o becas?
Responde en formato JSON:
{
  "summary": "breve resumen de qué trata la página",
  "hasConvocatorias": true/false,
  "keywords": ["palabra1", "palabra2", ...]
}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 150,
        }
      }),
    });

    if (!response.ok) {
      return {
        summary: 'Contenido analizado',
        hasConvocatorias: true // Por defecto asumimos que sí
      };
    }

    const data = await response.json();

    try {
      const analysis = JSON.parse(data.response);
      return analysis;
    } catch {
      return {
        summary: 'Contenido analizado',
        hasConvocatorias: true
      };
    }
  } catch (error) {
    console.error('Error al extraer información:', error);
    return {
      summary: 'Contenido analizado',
      hasConvocatorias: true
    };
  }
}

/**
 * Extrae texto visible de HTML
 */
function extractTextFromHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comparación semántica entre dos versiones de contenido
 * @param {string} oldHtml - HTML antiguo
 * @param {string} newHtml - HTML nuevo
 * @param {string} sourceName - Nombre de la fuente
 * @returns {Promise<Object>} - Análisis completo
 */
export async function compareVersionsSemantically(oldHtml, newHtml, sourceName) {
  try {
    const oldText = extractTextFromHtml(oldHtml).substring(0, 2000);
    const newText = extractTextFromHtml(newHtml).substring(0, 2000);

    const prompt = `Eres un experto en análisis de convocatorias de ayudas y subvenciones.

Fuente: ${sourceName}

VERSIÓN ANTERIOR:
${oldText}

VERSIÓN NUEVA:
${newText}

Analiza los cambios y responde en JSON:
{
  "summary": "Resumen ejecutivo de los cambios (2-3 líneas)",
  "priority": "ALTA|MEDIA|BAJA",
  "changes": [
    {
      "type": "nueva_convocatoria|cambio_plazo|cambio_requisitos|otro",
      "description": "descripción del cambio",
      "impact": "impacto para solicitantes"
    }
  ],
  "deadlines": ["2025-12-31", "2025-06-15"],
  "keywords": ["innovación social", "discapacidad", "empleo"],
  "isNewConvocatoria": true/false
}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 500,
        }
      }),
    });

    if (!response.ok) {
      console.error('Error en Ollama:', response.statusText);
      return {
        summary: 'Cambio detectado - análisis no disponible',
        priority: 'MEDIA',
        changes: [],
        deadlines: [],
        keywords: [],
        isNewConvocatoria: false
      };
    }

    const data = await response.json();

    try {
      const analysis = JSON.parse(data.response);
      return analysis;
    } catch (parseError) {
      return {
        summary: data.response.substring(0, 200) || 'Cambio detectado',
        priority: 'MEDIA',
        changes: [],
        deadlines: [],
        keywords: [],
        isNewConvocatoria: false
      };
    }
  } catch (error) {
    console.error('Error en comparación semántica:', error);
    return {
      summary: 'Error en análisis',
      priority: 'MEDIA',
      changes: [],
      deadlines: [],
      keywords: [],
      isNewConvocatoria: false
    };
  }
}

/**
 * Extrae información estructurada de una convocatoria
 * @param {string} html - HTML de la página
 * @param {string} sourceName - Nombre de la fuente
 * @returns {Promise<Object>} - Información extraída
 */
export async function extractConvocatoriaDetails(html, sourceName) {
  try {
    const text = extractTextFromHtml(html).substring(0, 3000);

    const prompt = `Extrae información estructurada de esta convocatoria de ${sourceName}:

${text}

Responde en JSON:
{
  "titulo": "título de la convocatoria",
  "descripcion": "descripción breve",
  "plazo": "fecha límite (formato YYYY-MM-DD si existe)",
  "requisitos": ["requisito 1", "requisito 2"],
  "cuantia": "monto o rango de ayuda",
  "ambito": "local|autonómico|nacional|internacional",
  "categorias": ["categoría1", "categoría2"],
  "enlace_solicitud": "URL si existe"
}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 400,
        }
      }),
    });

    if (!response.ok) {
      return {
        titulo: 'Convocatoria',
        descripcion: 'Información no disponible',
        plazo: null,
        requisitos: [],
        cuantia: 'No especificado',
        ambito: 'No especificado',
        categorias: [],
        enlace_solicitud: null
      };
    }

    const data = await response.json();

    try {
      const details = JSON.parse(data.response);
      return details;
    } catch {
      return {
        titulo: 'Convocatoria',
        descripcion: data.response.substring(0, 200),
        plazo: null,
        requisitos: [],
        cuantia: 'No especificado',
        ambito: 'No especificado',
        categorias: [],
        enlace_solicitud: null
      };
    }
  } catch (error) {
    console.error('Error extrayendo detalles:', error);
    return {
      titulo: 'Error',
      descripcion: 'Error al extraer información',
      plazo: null,
      requisitos: [],
      cuantia: 'No especificado',
      ambito: 'No especificado',
      categorias: [],
      enlace_solicitud: null
    };
  }
}

/**
 * Detecta nuevas convocatorias comparando enlaces
 * @param {Array} oldLinks - Enlaces antiguos
 * @param {Array} newLinks - Enlaces nuevos
 * @returns {Array} - Nuevas convocatorias detectadas
 */
export function detectNewConvocatorias(oldLinks = [], newLinks = []) {
  const oldUrls = new Set(oldLinks.map(link => link.url || link));
  const newConvocatorias = [];

  for (const link of newLinks) {
    const url = link.url || link;
    if (!oldUrls.has(url)) {
      newConvocatorias.push(link);
    }
  }

  return newConvocatorias;
}

/**
 * Genera un resumen ejecutivo de múltiples cambios
 * @param {Array} changes - Array de cambios detectados
 * @returns {Promise<string>} - Resumen ejecutivo
 */
export async function generateExecutiveSummary(changes) {
  if (!changes || changes.length === 0) {
    return 'No se detectaron cambios';
  }

  try {
    const changesText = changes.map((c, i) =>
      `${i + 1}. ${c.changes_description || c.type}`
    ).join('\n');

    const prompt = `Genera un resumen ejecutivo breve (máximo 3 líneas) de estos cambios detectados en convocatorias:

${changesText}

Resumen ejecutivo:`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 150,
        }
      }),
    });

    if (!response.ok) {
      return `${changes.length} cambios detectados en total`;
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Error generando resumen:', error);
    return `${changes.length} cambios detectados`;
  }
}
