import { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Estadísticas de los últimos 30 días
            </p>
          </div>
          <Button onClick={handleExport} disabled={stats.relevant === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relevantes
          </Button>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasa de Relevancia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {stats.relevanceRate}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                De los cambios revisados, {stats.relevanceRate}% fueron marcados como relevantes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Revisión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pendientes</span>
                <span className="font-semibold">{stats.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">En Revisión</span>
                <span className="font-semibold">{stats.reviewing}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completados</span>
                <span className="font-semibold">
                  {stats.relevant + stats.discarded}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Fuentes Más Activas</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
            ) : (
              <div className="space-y-3">
                {stats.topSources.map(([source, count], index) => (
                  <div key={source} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{source}</p>
                    </div>
                    <div className="text-sm font-semibold">{count} cambios</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
