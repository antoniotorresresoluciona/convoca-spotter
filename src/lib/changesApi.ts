import { supabase } from "@/integrations/supabase/client";

export interface Change {
  id: string;
  fundacion_id: string | null;
  sublink_id: string | null;
  url: string;
  detected_at: string;
  reviewed: boolean;
  changes_description: string | null;
  status: 'pending' | 'reviewing' | 'relevant' | 'discarded';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  reviewed_at: string | null;
  source_type: 'fundacion' | 'ente_publico' | 'otra_fuente' | null;
  source_name: string | null;
}

export interface GroupedChanges {
  pending: Change[];
  reviewing: Change[];
  relevant: Change[];
  discarded: Change[];
}

export interface ChangeFilters {
  dateRange?: '24h' | '7d' | '30d' | 'all';
  sourceType?: 'all' | 'fundacion' | 'ente_publico' | 'otra_fuente';
  category?: string;
  priority?: 'all' | 'low' | 'normal' | 'high' | 'urgent';
}

export async function getChangesByStatus(filters: ChangeFilters = {}): Promise<GroupedChanges> {
  let query = supabase
    .from('change_history')
    .select('*')
    .order('detected_at', { ascending: false });

  // Apply filters
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    const dateThreshold = new Date();
    
    switch (filters.dateRange) {
      case '24h':
        dateThreshold.setHours(now.getHours() - 24);
        break;
      case '7d':
        dateThreshold.setDate(now.getDate() - 7);
        break;
      case '30d':
        dateThreshold.setDate(now.getDate() - 30);
        break;
    }
    
    query = query.gte('detected_at', dateThreshold.toISOString());
  }

  if (filters.sourceType && filters.sourceType !== 'all') {
    query = query.eq('source_type', filters.sourceType);
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;

  if (error) throw error;

  const changes = (data || []) as Change[];

  return {
    pending: changes.filter(c => c.status === 'pending'),
    reviewing: changes.filter(c => c.status === 'reviewing'),
    relevant: changes.filter(c => c.status === 'relevant'),
    discarded: changes.filter(c => c.status === 'discarded'),
  };
}

export async function updateChangeStatus(
  id: string,
  status: Change['status']
): Promise<void> {
  const { error } = await supabase
    .from('change_history')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed: status !== 'pending'
    })
    .eq('id', id);

  if (error) throw error;
}

export async function updateChangeNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('change_history')
    .update({ notes })
    .eq('id', id);

  if (error) throw error;
}

export async function updateChangePriority(
  id: string,
  priority: Change['priority']
): Promise<void> {
  const { error } = await supabase
    .from('change_history')
    .update({ priority })
    .eq('id', id);

  if (error) throw error;
}

export async function getChangeDetail(id: string): Promise<Change | null> {
  const { data, error } = await supabase
    .from('change_history')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Change;
}

export function exportRelevantChanges(changes: Change[]): void {
  const relevant = changes.filter(c => c.status === 'relevant');
  
  const csv = [
    ['Fuente', 'Tipo', 'URL', 'Detectado', 'Prioridad', 'Notas'].join(','),
    ...relevant.map(c => [
      c.source_name || 'N/A',
      c.source_type || 'N/A',
      c.url,
      new Date(c.detected_at).toLocaleString('es-ES'),
      c.priority,
      c.notes ? `"${c.notes.replace(/"/g, '""')}"` : ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cambios-relevantes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}
