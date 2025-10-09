import { supabase } from "@/integrations/supabase/client";
import { OtraFuente } from "@/types/fundacion";

export async function getOtrasFuentes(): Promise<OtraFuente[]> {
  const { data, error } = await supabase
    .from('otras_fuentes')
    .select(`
      *,
      sublinks:otras_fuentes_sublinks(*)
    `)
    .order('name');

  if (error) throw error;
  return (data || []) as OtraFuente[];
}

export async function createOtraFuente(fuente: Partial<OtraFuente>): Promise<OtraFuente> {
  const { data, error } = await supabase
    .from('otras_fuentes')
    .insert({
      name: fuente.name!,
      url: fuente.url!,
      category: fuente.category!,
      type: fuente.type!,
      enabled: true,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data as OtraFuente;
}

export async function updateOtraFuente(id: string, updates: Partial<OtraFuente>): Promise<void> {
  const { error } = await supabase
    .from('otras_fuentes')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteOtraFuente(id: string): Promise<void> {
  const { error } = await supabase
    .from('otras_fuentes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
