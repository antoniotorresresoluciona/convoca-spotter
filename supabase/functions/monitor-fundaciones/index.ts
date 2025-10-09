import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Fundacion {
  id: string;
  name: string;
  url: string;
  category: string;
  last_hash: string | null;
  status: string;
}

interface Sublink {
  id: string;
  fundacion_id: string;
  url: string;
  enabled: boolean;
  last_hash: string | null;
  status: string;
}

// Palabras clave para detectar subenlaces relevantes
const KEYWORDS = [
  'convocatoria',
  'ayuda',
  'bases',
  'proyecto',
  'solicitud',
  'plazo',
  'inscripcion',
  'presentacion',
  'subvencion',
  'grant'
];

// Función para calcular hash SHA-256 de texto
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Función para extraer enlaces relevantes de HTML
function extractRelevantLinks(html: string, baseUrl: string): string[] {
  const links: Set<string> = new Set();
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].toLowerCase();
    
    // Verificar si el texto del enlace contiene alguna palabra clave
    const hasKeyword = KEYWORDS.some(keyword => text.includes(keyword));
    
    if (hasKeyword) {
      try {
        const url = new URL(href, baseUrl);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          links.add(url.href);
        }
      } catch (e) {
        console.error('Invalid URL:', href, e);
      }
    }
  }

  return Array.from(links);
}

// Función para hacer scraping de una URL
async function scrapeUrl(url: string): Promise<{ html: string; hash: string; sublinks?: string[] }> {
  console.log(`Scraping URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const hash = await hashText(html);
    const sublinks = extractRelevantLinks(html, url);

    return { html, hash, sublinks };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting monitoring job...');

    // Obtener todas las fundaciones
    const { data: fundaciones, error: fundacionesError } = await supabase
      .from('fundaciones')
      .select('*');

    if (fundacionesError) {
      console.error('Error fetching fundaciones:', fundacionesError);
      throw fundacionesError;
    }

    console.log(`Found ${fundaciones?.length || 0} fundaciones to monitor`);

    const results = {
      total: fundaciones?.length || 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      newSublinks: 0,
    };

    // Procesar cada fundación
    for (const fundacion of fundaciones || []) {
      try {
        console.log(`Processing ${fundacion.name}...`);
        
        // Delay para no saturar los servidores
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Hacer scraping de la URL principal
        const { hash, sublinks } = await scrapeUrl(fundacion.url);

        // Detectar cambios en la URL principal
        const hasChanged = fundacion.last_hash !== null && fundacion.last_hash !== hash;
        const newStatus = hasChanged ? 'updated' : 'unchanged';

        if (hasChanged) {
          results.updated++;
          
          // Guardar en el historial
          await supabase.from('change_history').insert({
            fundacion_id: fundacion.id,
            url: fundacion.url,
            changes_description: `Detectados cambios en la página principal`,
          });

          console.log(`✓ Changes detected in ${fundacion.name}`);
        } else {
          results.unchanged++;
        }

        // Actualizar fundación
        await supabase
          .from('fundaciones')
          .update({
            last_hash: hash,
            status: newStatus,
            last_checked: new Date().toISOString(),
          })
          .eq('id', fundacion.id);

        // Verificar si ya existen subenlaces para esta fundación
        const { data: existingSublinks } = await supabase
          .from('sublinks')
          .select('url')
          .eq('fundacion_id', fundacion.id);

        const existingUrls = new Set(existingSublinks?.map(s => s.url) || []);

        // Añadir nuevos subenlaces detectados
        if (sublinks && sublinks.length > 0) {
          const newSublinks = sublinks.filter(url => !existingUrls.has(url));
          
          if (newSublinks.length > 0) {
            const sublinkInserts = newSublinks.slice(0, 10).map(url => ({
              fundacion_id: fundacion.id,
              url,
              enabled: true,
              status: 'pending',
            }));

            await supabase.from('sublinks').insert(sublinkInserts);
            results.newSublinks += sublinkInserts.length;
            console.log(`✓ Added ${sublinkInserts.length} new sublinks for ${fundacion.name}`);
          }
        }

        // Monitorear subenlaces habilitados
        const { data: enabledSublinks } = await supabase
          .from('sublinks')
          .select('*')
          .eq('fundacion_id', fundacion.id)
          .eq('enabled', true);

        for (const sublink of enabledSublinks || []) {
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { hash: sublinkHash } = await scrapeUrl(sublink.url);
            const sublinkChanged = sublink.last_hash !== null && sublink.last_hash !== sublinkHash;

            if (sublinkChanged) {
              results.updated++;
              
              await supabase.from('change_history').insert({
                fundacion_id: fundacion.id,
                sublink_id: sublink.id,
                url: sublink.url,
                changes_description: `Detectados cambios en subenlace`,
              });

              console.log(`✓ Changes detected in sublink: ${sublink.url}`);
            }

            await supabase
              .from('sublinks')
              .update({
                last_hash: sublinkHash,
                status: sublinkChanged ? 'updated' : 'unchanged',
                last_checked: new Date().toISOString(),
              })
              .eq('id', sublink.id);

          } catch (sublinkError) {
            console.error(`Error processing sublink ${sublink.url}:`, sublinkError);
            results.errors++;
          }
        }

      } catch (error) {
        console.error(`Error processing fundacion ${fundacion.name}:`, error);
        results.errors++;
        
        await supabase
          .from('fundaciones')
          .update({
            status: 'pending',
            last_checked: new Date().toISOString(),
          })
          .eq('id', fundacion.id);
      }
    }

    console.log('Monitoring job completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in monitoring job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
