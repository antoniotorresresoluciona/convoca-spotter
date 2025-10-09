import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { username = 'admin', password = 'admin123' } = await req.json().catch(() => ({ }));

    // Hash password securely
    const passwordHash = await hash(password);

    // Check if user exists
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ username, password_hash: passwordHash });
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, username }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-set-password:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
