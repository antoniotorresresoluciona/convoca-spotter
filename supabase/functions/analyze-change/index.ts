import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { changeId } = await req.json();
    
    if (!changeId) {
      return new Response(
        JSON.stringify({ error: 'changeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Obtener el cambio de la base de datos
    const { data: change, error: changeError } = await supabase
      .from('change_history')
      .select('*')
      .eq('id', changeId)
      .single();

    if (changeError || !change) {
      return new Response(
        JSON.stringify({ error: 'Change not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hacer scraping de la URL para obtener contenido actual
    let pageContent = '';
    try {
      const pageResponse = await fetch(change.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ConvocatoriasMonitor/1.0)',
        },
      });
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        // Extraer texto simple (remover tags HTML)
        pageContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 4000); // Limitar a 4000 caracteres
      }
    } catch (e) {
      console.error('Error fetching page content:', e);
    }

    // Analizar con IA
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que analiza páginas web de fundaciones y entes públicos para detectar convocatorias, ayudas y subvenciones.
            
Extrae y resume:
1. Tipo de convocatoria/ayuda (si existe)
2. Plazo de presentación (fechas importantes)
3. Requisitos principales
4. Cuantía o presupuesto (si se menciona)
5. A quién va dirigido

Si no encuentras información relevante sobre convocatorias, indica que la página no contiene convocatorias activas.
Responde en español de forma concisa y estructurada.`
          },
          {
            role: 'user',
            content: `Analiza esta página web y extrae información sobre convocatorias/ayudas:

URL: ${change.url}
Fuente: ${change.source_name} (${change.source_type})

Contenido de la página:
${pageContent || 'No se pudo obtener el contenido de la página'}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0]?.message?.content || 'No se pudo analizar el contenido';

    // Actualizar el cambio con el análisis
    await supabase
      .from('change_history')
      .update({
        notes: analysis,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-change:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
