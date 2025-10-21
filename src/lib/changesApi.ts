const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

export interface Change {
  id: string;
  fundacion_id: string | null;
  ente_publico_id: string | null;
  otra_fuente_id: string | null;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  url: string;
  detected_at: string;
  status: 'pending' | 'reviewing' | 'relevant' | 'discarded';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  reviewed: boolean;
  reviewed_at: string | null;
  source_type: 'fundacion' | 'ente_publico' | 'otra_fuente' | null;
  source_name: string | null;
  changes_description?: string | null;
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
  const response = await fetch(`${API_URL}/rest/v1/change_history?order=detected_at.desc`);

  if (!response.ok) {
    throw new Error('Error al cargar cambios');
  }

  const data = await response.json();
  const changes = (data || []) as Change[];

  // Apply filters
  let filteredChanges = changes;

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

    filteredChanges = filteredChanges.filter(c =>
      new Date(c.detected_at) >= dateThreshold
    );
  }

  if (filters.sourceType && filters.sourceType !== 'all') {
    filteredChanges = filteredChanges.filter(c => c.source_type === filters.sourceType);
  }

  if (filters.priority && filters.priority !== 'all') {
    filteredChanges = filteredChanges.filter(c => c.priority === filters.priority);
  }

  return {
    pending: filteredChanges.filter(c => c.status === 'pending'),
    reviewing: filteredChanges.filter(c => c.status === 'reviewing'),
    relevant: filteredChanges.filter(c => c.status === 'relevant'),
    discarded: filteredChanges.filter(c => c.status === 'discarded'),
  };
}

export async function updateChangeStatus(
  id: string,
  status: Change['status']
): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/change_history?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      reviewed: status === 'relevant' || status === 'discarded' ? 1 : 0,
      reviewed_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error updating status:', error);
    throw new Error('Error al actualizar estado');
  }
}

export async function updateChangeNotes(id: string, notes: string): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/change_history?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar notas');
  }
}

export async function updateChangePriority(
  id: string,
  priority: Change['priority']
): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/change_history?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priority }),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar prioridad');
  }
}

export async function getChangeDetail(id: string): Promise<Change | null> {
  const response = await fetch(`${API_URL}/rest/v1/change_history?id=eq.${id}`);

  if (!response.ok) {
    throw new Error('Error al cargar detalle');
  }

  const data = await response.json();
  return data[0] as Change || null;
}

export function exportRelevantChanges(changes: Change[]): void {
  const relevant = changes.filter(c => c.status === 'relevant');

  const csv = [
    ['Fuente', 'Tipo', 'URL', 'Detectado', 'Prioridad', 'Notas'].join(','),
    ...relevant.map(c => [
      c.source_name || 'N/A',
      c.source_type || 'N/A',
      c.url || 'N/A',
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
