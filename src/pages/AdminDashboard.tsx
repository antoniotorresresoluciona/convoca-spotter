import { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, CheckCircle, XCircle, Clock, BarChart3, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Change, getChangesByStatus, exportRelevantChanges } from '@/lib/changesApi';
import { AdminLayout } from '@/components/admin/AdminLayout';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    loadChanges();
  }, []);

  const loadChanges = async () => {
    try {
      setIsLoading(true);
      const grouped = await getChangesByStatus({ dateRange: '30d' });
      const allChanges = [
        ...grouped.pending,
        ...grouped.reviewing,
        ...grouped.relevant,
        ...grouped.discarded,
      ];
      setChanges(allChanges);
    } catch (error) {
      console.error('Error loading changes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = changes.length;
    const relevant = changes.filter((c) => c.status === 'relevant').length;
    const discarded = changes.filter((c) => c.status === 'discarded').length;
    const pending = changes.filter((c) => c.status === 'pending').length;
    const reviewing = changes.filter((c) => c.status === 'reviewing').length;
    
    const reviewed = changes.filter((c) => c.reviewed).length;
    const relevanceRate = reviewed > 0 ? ((relevant / reviewed) * 100).toFixed(1) : '0';

    // Top sources
    const sourceCount = changes.reduce((acc, c) => {
      if (c.source_name) {
        acc[c.source_name] = (acc[c.source_name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topSources = Object.entries(sourceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      total,
      relevant,
      discarded,
      pending,
      reviewing,
      relevanceRate,
      topSources,
    };
  }, [changes]);

  const handleExport = () => {
    exportRelevantChanges(changes);
    toast({
      title: 'Exportación completada',
      description: 'El archivo CSV se ha descargado correctamente',
    });
  };

  const runMonitoring = async () => {
    setIsMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-monitoring');

      if (error) throw error;

      toast({
        title: 'Monitoreo completado',
        description: `Resultados del monitoreo disponibles`,
      });

      // Recargar cambios
      await loadChanges();
    } catch (error) {
      console.error('Error running monitoring:', error);
      toast({
        title: 'Error',
        description: 'No se pudo ejecutar el monitoreo',
        variant: 'destructive',
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-6">
          <div>
            <h2 className="text-2xl font-semibold text-black">Dashboard</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Estadísticas de los últimos 30 días
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={runMonitoring}
              disabled={isMonitoring}
              className="bg-neutral-900 text-white hover:bg-black"
            >
              <Play className="h-4 w-4 mr-2" />
              {isMonitoring ? 'Monitoreando...' : 'Ejecutar Monitoreo'}
            </Button>
            <Button
              onClick={handleExport}
              disabled={stats.relevant === 0}
              className="bg-black text-white hover:bg-neutral-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Relevantes
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Cambios"
            value={stats.total}
            icon={BarChart3}
            variant="default"
          />
          <StatCard
            title="Relevantes"
            value={stats.relevant}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Descartados"
            value={stats.discarded}
            icon={XCircle}
            variant="warning"
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 p-6">
            <h3 className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-4">
              Tasa de Relevancia
            </h3>
            <div className="text-4xl font-semibold text-black">
              {stats.relevanceRate}%
            </div>
            <p className="text-sm text-neutral-600 mt-3">
              De los cambios revisados, {stats.relevanceRate}% fueron marcados como relevantes
            </p>
          </div>

          <div className="bg-white border border-neutral-200 p-6">
            <h3 className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-4">
              Estado de Revisión
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">Pendientes</span>
                <span className="font-semibold text-black">{stats.pending}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">En Revisión</span>
                <span className="font-semibold text-black">{stats.reviewing}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600">Completados</span>
                <span className="font-semibold text-black">
                  {stats.relevant + stats.discarded}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Sources */}
        <div className="bg-white border border-neutral-200 p-6">
          <h3 className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-4">
            Top 5 Fuentes Más Activas
          </h3>
          {stats.topSources.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay datos disponibles</p>
          ) : (
            <div className="space-y-4">
              {stats.topSources.map(([source, count], index) => (
                <div key={source} className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-neutral-100 text-black font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black truncate">{source}</p>
                  </div>
                  <div className="text-sm font-semibold text-neutral-600">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
