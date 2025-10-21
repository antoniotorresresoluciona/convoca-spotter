import { useEffect, useState } from 'react';
import { PublicChangeCard } from '@/components/public/PublicChangeCard';
import { PublicFilters } from '@/components/public/PublicFilters';
import { Loader2, AlertCircle, Building2, Landmark, FileSearch } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PublicChange {
  id: string;
  source_name: string;
  source_type: 'fundacion' | 'ente_publico' | 'otra_fuente';
  changes_description: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detected_at: string;
  url: string;
  ai_summary?: string;
  deadline_date?: string;
  ai_keywords?: string[];
  is_new_convocatoria?: boolean;
  change_type?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
}

interface GroupedChanges {
  fundaciones: PublicChange[];
  entesPublicos: PublicChange[];
  otrasFuentes: PublicChange[];
}

export default function PublicKanban() {
  const [changes, setChanges] = useState<PublicChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    sourceType: 'all',
    priority: 'all',
    dateRange: '30d'
  });

  useEffect(() => {
    fetchRelevantChanges();
    fetchStats();
  }, [filters]);

  async function fetchRelevantChanges() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sourceType: filters.sourceType,
        priority: filters.priority,
        dateRange: filters.dateRange,
        limit: '100'
      });

      const response = await fetch(`/api/public/relevant-changes?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar convocatorias');
      }

      const data = await response.json();
      setChanges(data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      console.error('Error fetching changes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/public/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  function groupBySourceType(changes: PublicChange[]): GroupedChanges {
    return {
      fundaciones: changes.filter(c => c.source_type === 'fundacion'),
      entesPublicos: changes.filter(c => c.source_type === 'ente_publico'),
      otrasFuentes: changes.filter(c => c.source_type === 'otra_fuente'),
    };
  }

  const grouped = groupBySourceType(changes);

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="container mx-auto px-6 py-6 max-w-7xl">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-2">
              Monitor de Convocatorias
            </h1>
            <p className="text-base text-neutral-600 max-w-2xl mx-auto">
              Sistema de seguimiento de convocatorias y ayudas públicas
            </p>
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-semibold text-black">{stats.total}</div>
                <div className="text-xs text-neutral-500 mt-1">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-black">{stats.recentChanges}</div>
                <div className="text-xs text-neutral-500 mt-1">Esta semana</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-6 max-w-7xl">
        {/* Filters */}
        <div className="py-8 border-b border-neutral-200">
          <PublicFilters
            filters={filters}
            onChange={setFilters}
            onRefresh={fetchRelevantChanges}
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mb-4" />
            <span className="text-sm text-neutral-500">Cargando convocatorias</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="py-8">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && changes.length === 0 && (
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              No se encontraron convocatorias
            </h3>
            <p className="text-sm text-neutral-500">
              Ajusta los filtros o intenta más tarde
            </p>
          </div>
        )}

        {/* Kanban Columns */}
        {!loading && !error && changes.length > 0 && (
          <div className="py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Fundaciones */}
              <div>
                <div className="mb-6 pb-4 border-b border-neutral-200">
                  <div className="flex items-center gap-3 mb-1">
                    <Building2 className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-xl font-semibold text-black">
                      Fundaciones
                    </h2>
                  </div>
                  <p className="text-sm text-neutral-500 ml-8">
                    {grouped.fundaciones.length} {grouped.fundaciones.length === 1 ? 'convocatoria' : 'convocatorias'}
                  </p>
                </div>
                <div className="space-y-4">
                  {grouped.fundaciones.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-12">
                      Sin resultados
                    </p>
                  ) : (
                    grouped.fundaciones.map(change => (
                      <PublicChangeCard key={change.id} change={change} />
                    ))
                  )}
                </div>
              </div>

              {/* Entes Públicos */}
              <div>
                <div className="mb-6 pb-4 border-b border-neutral-200">
                  <div className="flex items-center gap-3 mb-1">
                    <Landmark className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-xl font-semibold text-black">
                      Entes Públicos
                    </h2>
                  </div>
                  <p className="text-sm text-neutral-500 ml-8">
                    {grouped.entesPublicos.length} {grouped.entesPublicos.length === 1 ? 'convocatoria' : 'convocatorias'}
                  </p>
                </div>
                <div className="space-y-4">
                  {grouped.entesPublicos.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-12">
                      Sin resultados
                    </p>
                  ) : (
                    grouped.entesPublicos.map(change => (
                      <PublicChangeCard key={change.id} change={change} />
                    ))
                  )}
                </div>
              </div>

              {/* Otras Fuentes */}
              <div>
                <div className="mb-6 pb-4 border-b border-neutral-200">
                  <div className="flex items-center gap-3 mb-1">
                    <FileSearch className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-xl font-semibold text-black">
                      Otras Fuentes
                    </h2>
                  </div>
                  <p className="text-sm text-neutral-500 ml-8">
                    {grouped.otrasFuentes.length} {grouped.otrasFuentes.length === 1 ? 'convocatoria' : 'convocatorias'}
                  </p>
                </div>
                <div className="space-y-4">
                  {grouped.otrasFuentes.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-12">
                      Sin resultados
                    </p>
                  ) : (
                    grouped.otrasFuentes.map(change => (
                      <PublicChangeCard key={change.id} change={change} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-neutral-200 mt-16 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
            <div className="flex gap-6">
              <a href="#" className="hover:text-black transition-colors">Aviso Legal</a>
              <a href="#" className="hover:text-black transition-colors">Privacidad</a>
              <a href="#" className="hover:text-black transition-colors">Accesibilidad</a>
            </div>
            <div className="text-center md:text-right">
              <p>Sistema de monitoreo automático</p>
              <p className="mt-1">
                Actualizado: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
