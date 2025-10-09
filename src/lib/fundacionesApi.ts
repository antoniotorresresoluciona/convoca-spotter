import { supabase } from "@/integrations/supabase/client";
import { Fundacion, Sublink, ChangeDetected } from "@/types/fundacion";

export async function getFundaciones(): Promise<Fundacion[]> {
  const { data, error } = await supabase
    .from('fundaciones')
    .select(`
      *,
      sublinks(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data as Fundacion[];
}

export async function createFundacion(fundacion: Partial<Fundacion>): Promise<Fundacion> {
  const { data, error } = await supabase
    .from('fundaciones')
    .insert({
      name: fundacion.name,
      url: fundacion.url,
      category: fundacion.category,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Fundacion;
}

export async function updateFundacion(id: string, fundacion: Partial<Fundacion>): Promise<Fundacion> {
  const { data, error } = await supabase
    .from('fundaciones')
    .update({
      name: fundacion.name,
      url: fundacion.url,
      category: fundacion.category,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Fundacion;
}

export async function deleteFundacion(id: string): Promise<void> {
  const { error } = await supabase
    .from('fundaciones')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function triggerMonitoring(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('monitor-fundaciones');

  if (error) throw error;

  return data;
}

export async function getChangeHistory(): Promise<ChangeDetected[]> {
  const { data, error } = await supabase
    .from('change_history')
    .select(`
      *,
      fundaciones(name)
    `)
    .order('detected_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data as ChangeDetected[];
}

export async function markChangeAsReviewed(id: string): Promise<void> {
  const { error } = await supabase
    .from('change_history')
    .update({ reviewed: true })
    .eq('id', id);

  if (error) throw error;
}

export async function updateSublink(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('sublinks')
    .update({ enabled })
    .eq('id', id);

  if (error) throw error;
}
