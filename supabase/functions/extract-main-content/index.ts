import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';
import { Readability } from 'https://cdn.jsdelivr.net/npm/readability-denodom@0.0.2/mod.generated.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the content from the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ConvocatoriasMonitor/1.0; +http://example.com/bot.html)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse the HTML using deno-dom
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    // Use Readability to extract the main content
    const reader = new Readability(doc, {
      // We are parsing a full document, so we don't need to specify a URL
    });
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to extract article using Readability');
    }

    // Return the extracted content
    return new Response(
      JSON.stringify({
        success: true,
        content: {
          title: article.title,
          textContent: article.textContent,
          htmlContent: article.content, // The cleaned HTML content
          length: article.length,
          excerpt: article.excerpt,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in extract-main-content:', error);
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