import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicFilters } from '@/components/public/PublicFilters';
import { DraggableKanban } from '@/components/public/DraggableKanban';

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

const Index = () => {
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    sourceType: 'all',
    priority: 'all',
    dateRange: '30d'
  });

  useEffect(() => {
    fetchStats();
  }, []);

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

  function handleRefresh() {
    fetchStats();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Monitor de Convocatorias
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Últimas convocatorias y ayudas detectadas automáticamente
              </p>
            </div>
            <Link to="/admin/login">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          </div>

          {/* Stats badges */}
          {stats && (
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 border">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold">{stats.total}</span>
                <span className="text-xs text-gray-600">convocatorias</span>
              </div>
              <div className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 border">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold">{stats.recentChanges}</span>
                <span className="text-xs text-gray-600">esta semana</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Cómo funciona:</strong> Arrastra las tarjetas entre las columnas para clasificar las convocatorias según tu interés.
            Tus preferencias se guardan automáticamente.
          </p>
        </div>

        {/* Filters */}
        <PublicFilters
          filters={filters}
          onChange={setFilters}
          onRefresh={handleRefresh}
        />

        {/* Kanban Board con Drag & Drop */}
        <DraggableKanban filters={filters} />
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Index;
