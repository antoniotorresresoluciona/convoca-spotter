import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords para identificar enlaces relevantes
const KEYWORDS = [
  'convocatoria', 'convocatorias', 'ayuda', 'ayudas', 'subvencion', 'subvenciones',
  'beca', 'becas', 'grant', 'grants', 'financiacion', 'financiación', 'programa',
  'programas', 'solicitud', 'solicitudes', 'bases', 'requisitos', 'plazo', 'plazos'
];

// Hash de texto usando SHA-256
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extrae enlaces relevantes del HTML
function extractRelevantLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').toLowerCase();
    
    // Verificar si el texto contiene keywords
    const isRelevant = KEYWORDS.some(keyword => text.includes(keyword));
    
    if (isRelevant && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const fullUrl = new URL(href, baseUrl).href;
        if (!links.includes(fullUrl)) {
          links.push(fullUrl);
        }
      } catch (e) {
        console.error('Invalid URL:', href);
      }
    }
  }

  return links;
}

// Scraping de URL
async function scrapeUrl(url: string, supabase: any): Promise<{ hash: string; sublinks?: string[] }> {
  console.log(`Invoking extract-main-content for ${url}`);
  const { data: extractionData, error: extractionError } = await supabase.functions.invoke('extract-main-content', {
    body: { url },
  });

  if (extractionError) {
    throw new Error(`Error invoking extract-main-content: ${extractionError.message}`);
  }

  if (!extractionData || !extractionData.success || !extractionData.content) {
    // If readability fails, we fallback to hashing the whole body, but we can't extract sublinks.
    console.warn(`extract-main-content failed for ${url}. Falling back to full page hash.`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ConvocatoriasMonitor/1.0)',
      },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const hash = await hashText(html);
    return { hash, sublinks: [] };
  }

  const mainContent = extractionData.content.textContent || '';
  const cleanedHtml = extractionData.content.htmlContent || '';

  const hash = await hashText(mainContent);
  const sublinks = extractRelevantLinks(cleanedHtml, url);

  return { hash, sublinks };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting monitoring of all sources...');

    const results = {
      fundaciones: { checked: 0, changes: 0, errors: 0 },
      entes_publicos: { checked: 0, changes: 0, errors: 0 },
      otras_fuentes: { checked: 0, changes: 0, errors: 0 },
    };

    // ==================== FUNDACIONES ====================
    console.log('Fetching fundaciones...');
    const { data: fundaciones, error: fundError } = await supabase
      .from('fundaciones')
      .select('*')
      .eq('enabled', true);

    if (fundError) throw fundError;

    for (const fundacion of fundaciones || []) {
      results.fundaciones.checked++;
      
      try {
        console.log(`Scraping fundacion: ${fundacion.name} - ${fundacion.url}`);
        const { hash, sublinks } = await scrapeUrl(fundacion.url, supabase);

        const hasChanged = fundacion.last_hash && fundacion.last_hash !== hash;

        // Actualizar fundación
        await supabase
          .from('fundaciones')
          .update({
            last_hash: hash,
            status: hasChanged ? 'updated' : 'unchanged',
            last_checked: new Date().toISOString(),
          })
          .eq('id', fundacion.id);

        // Si cambió, registrar en change_history
        if (hasChanged) {
          results.fundaciones.changes++;
          await supabase
            .from('change_history')
            .insert({
              fundacion_id: fundacion.id,
              url: fundacion.url,
              status: 'pending',
              source_type: 'fundacion',
              source_name: fundacion.name,
              changes_description: `Se detectaron cambios en el contenido de la página principal de ${fundacion.name}`,
            });
        }

        // Procesar sublinks de fundaciones
        const { data: existingSublinks } = await supabase
          .from('sublinks')
          .select('url')
          .eq('fundacion_id', fundacion.id);

        const existingUrls = new Set(existingSublinks?.map(s => s.url) || []);
        const newSublinks = sublinks?.filter(url => !existingUrls.has(url)) || [];

        // Insertar nuevos sublinks
        if (newSublinks.length > 0) {
          await supabase
            .from('sublinks')
            .insert(
              newSublinks.map(url => ({
                fundacion_id: fundacion.id,
                url,
                enabled: true,
                status: 'pending',
              }))
            );
        }

        // Monitorear sublinks habilitados
        const { data: enabledSublinks } = await supabase
          .from('sublinks')
          .select('*')
          .eq('fundacion_id', fundacion.id)
          .eq('enabled', true);

        for (const sublink of enabledSublinks || []) {
          try {
            const { hash: sublinkHash } = await scrapeUrl(sublink.url, supabase);
            const sublinkChanged = sublink.last_hash && sublink.last_hash !== sublinkHash;

            await supabase
              .from('sublinks')
              .update({
                last_hash: sublinkHash,
                status: sublinkChanged ? 'updated' : 'unchanged',
                last_checked: new Date().toISOString(),
              })
              .eq('id', sublink.id);

            if (sublinkChanged) {
              results.fundaciones.changes++;
              await supabase
                .from('change_history')
                .insert({
                  fundacion_id: fundacion.id,
                  sublink_id: sublink.id,
                  url: sublink.url,
                  status: 'pending',
                  source_type: 'fundacion',
                  source_name: fundacion.name,
                  changes_description: `Se detectaron cambios en el subenlace: ${sublink.url}`,
                });
            }
          } catch (error) {
            console.error(`Error scraping sublink ${sublink.url}:`, error);
          }
        }
      } catch (error) {
        results.fundaciones.errors++;
        console.error(`Error processing fundacion ${fundacion.name}:`, error);
      }
    }

    // ==================== ENTES PÚBLICOS ====================
    console.log('Fetching entes publicos...');
    const { data: entes, error: entesError } = await supabase
      .from('entes_publicos')
      .select('*')
      .eq('enabled', true);

    if (entesError) throw entesError;

    for (const ente of entes || []) {
      results.entes_publicos.checked++;
      
      try {
        console.log(`Scraping ente: ${ente.name} - ${ente.url}`);
        const { hash, sublinks } = await scrapeUrl(ente.url, supabase);

        const hasChanged = ente.last_hash && ente.last_hash !== hash;

        await supabase
          .from('entes_publicos')
          .update({
            last_hash: hash,
            status: hasChanged ? 'updated' : 'unchanged',
            last_checked: new Date().toISOString(),
          })
          .eq('id', ente.id);

        if (hasChanged) {
          results.entes_publicos.changes++;
          await supabase
            .from('change_history')
            .insert({
              url: ente.url,
              status: 'pending',
              source_type: 'ente_publico',
              source_name: ente.name,
              changes_description: `Se detectaron cambios en el contenido de ${ente.name} (${ente.entity})`,
            });
        }

        // Procesar sublinks de entes
        const { data: existingSublinks } = await supabase
          .from('entes_publicos_sublinks')
          .select('url')
          .eq('ente_id', ente.id);

        const existingUrls = new Set(existingSublinks?.map(s => s.url) || []);
        const newSublinks = sublinks?.filter(url => !existingUrls.has(url)) || [];

        if (newSublinks.length > 0) {
          await supabase
            .from('entes_publicos_sublinks')
            .insert(
              newSublinks.map(url => ({
                ente_id: ente.id,
                url,
                enabled: true,
                status: 'pending',
              }))
            );
        }

        // Monitorear sublinks habilitados
        const { data: enabledSublinks } = await supabase
          .from('entes_publicos_sublinks')
          .select('*')
          .eq('ente_id', ente.id)
          .eq('enabled', true);

        for (const sublink of enabledSublinks || []) {
          try {
            const { hash: sublinkHash } = await scrapeUrl(sublink.url, supabase);
            const sublinkChanged = sublink.last_hash && sublink.last_hash !== sublinkHash;

            await supabase
              .from('entes_publicos_sublinks')
              .update({
                last_hash: sublinkHash,
                status: sublinkChanged ? 'updated' : 'unchanged',
                last_checked: new Date().toISOString(),
              })
              .eq('id', sublink.id);

            if (sublinkChanged) {
              results.entes_publicos.changes++;
              await supabase
                .from('change_history')
                .insert({
                  url: sublink.url,
                  status: 'pending',
                  source_type: 'ente_publico',
                  source_name: ente.name,
                  changes_description: `Se detectaron cambios en el subenlace: ${sublink.url}`,
                });
            }
          } catch (error) {
            console.error(`Error scraping ente sublink ${sublink.url}:`, error);
          }
        }
      } catch (error) {
        results.entes_publicos.errors++;
        console.error(`Error processing ente ${ente.name}:`, error);
      }
    }

    // ==================== OTRAS FUENTES ====================
    console.log('Fetching otras fuentes...');
    const { data: fuentes, error: fuentesError } = await supabase
      .from('otras_fuentes')
      .select('*')
      .eq('enabled', true);

    if (fuentesError) throw fuentesError;

    for (const fuente of fuentes || []) {
      results.otras_fuentes.checked++;
      
      try {
        console.log(`Scraping fuente: ${fuente.name} - ${fuente.url}`);
        const { hash, sublinks } = await scrapeUrl(fuente.url, supabase);

        const hasChanged = fuente.last_hash && fuente.last_hash !== hash;

        await supabase
          .from('otras_fuentes')
          .update({
            last_hash: hash,
            status: hasChanged ? 'updated' : 'unchanged',
            last_checked: new Date().toISOString(),
          })
          .eq('id', fuente.id);

        if (hasChanged) {
          results.otras_fuentes.changes++;
          await supabase
            .from('change_history')
            .insert({
              url: fuente.url,
              status: 'pending',
              source_type: 'otra_fuente',
              source_name: fuente.name,
              changes_description: `Se detectaron cambios en ${fuente.name} (${fuente.type})`,
            });
        }

        // Procesar sublinks de otras fuentes
        const { data: existingSublinks } = await supabase
          .from('otras_fuentes_sublinks')
          .select('url')
          .eq('fuente_id', fuente.id);

        const existingUrls = new Set(existingSublinks?.map(s => s.url) || []);
        const newSublinks = sublinks?.filter(url => !existingUrls.has(url)) || [];

        if (newSublinks.length > 0) {
          await supabase
            .from('otras_fuentes_sublinks')
            .insert(
              newSublinks.map(url => ({
                fuente_id: fuente.id,
                url,
                enabled: true,
                status: 'pending',
              }))
            );
        }

        // Monitorear sublinks habilitados
        const { data: enabledSublinks } = await supabase
          .from('otras_fuentes_sublinks')
          .select('*')
          .eq('fuente_id', fuente.id)
          .eq('enabled', true);

        for (const sublink of enabledSublinks || []) {
          try {
            const { hash: sublinkHash } = await scrapeUrl(sublink.url, supabase);
            const sublinkChanged = sublink.last_hash && sublink.last_hash !== sublinkHash;

            await supabase
              .from('otras_fuentes_sublinks')
              .update({
                last_hash: sublinkHash,
                status: sublinkChanged ? 'updated' : 'unchanged',
                last_checked: new Date().toISOString(),
              })
              .eq('id', sublink.id);

            if (sublinkChanged) {
              results.otras_fuentes.changes++;
              await supabase
                .from('change_history')
                .insert({
                  url: sublink.url,
                  status: 'pending',
                  source_type: 'otra_fuente',
                  source_name: fuente.name,
                  changes_description: `Se detectaron cambios en el subenlace: ${sublink.url}`,
                });
            }
          } catch (error) {
            console.error(`Error scraping fuente sublink ${sublink.url}:`, error);
          }
        }
      } catch (error) {
        results.otras_fuentes.errors++;
        console.error(`Error processing fuente ${fuente.name}:`, error);
      }
    }

    console.log('Monitoring completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monitoring completed successfully',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in monitor-all-sources:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
