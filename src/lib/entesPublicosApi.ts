import { supabase } from "@/integrations/supabase/client";
import { EntePublico } from "@/types/fundacion";

export async function getEntesPublicos(): Promise<EntePublico[]> {
  const { data, error } = await supabase
    .from('entes_publicos')
    .select(`
      *,
      sublinks:entes_publicos_sublinks(*)
    `)
    .order('name');

  if (error) throw error;
  return (data || []) as EntePublico[];
}

export async function createEntePublico(ente: Partial<EntePublico>): Promise<EntePublico> {
  const { data, error } = await supabase
    .from('entes_publicos')
    .insert({
      name: ente.name!,
      url: ente.url!,
      category: ente.category!,
      entity: ente.entity!,
      enabled: true,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data as EntePublico;
}

export async function updateEntePublico(id: string, updates: Partial<EntePublico>): Promise<void> {
  const { error } = await supabase
    .from('entes_publicos')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteEntePublico(id: string): Promise<void> {
  const { error } = await supabase
    .from('entes_publicos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
