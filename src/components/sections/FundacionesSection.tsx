import { useState, useMemo, useEffect } from "react";
import { Building2, RefreshCw, Plus, Search, Filter, Download, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { FundacionCard } from "@/components/FundacionCard";
import { FundacionDialog } from "@/components/FundacionDialog";
import { Fundacion } from "@/types/fundacion";
import { useToast } from "@/hooks/use-toast";
import { 
  getFundaciones, 
  createFundacion, 
  updateFundacion, 
  deleteFundacion, 
  triggerMonitoring 
} from "@/lib/fundacionesApi";

const FundacionesSection = () => {
  const { toast } = useToast();
  const [fundaciones, setFundaciones] = useState<Fundacion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFundacion, setEditingFundacion] = useState<Fundacion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFundaciones();
  }, []);

  const loadFundaciones = async () => {
    try {
      setIsLoading(true);
      const data = await getFundaciones();
      setFundaciones(data);
    } catch (error) {
      console.error('Error loading fundaciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las fundaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(fundaciones.map(f => f.category));
    return Array.from(cats).sort();
  }, [fundaciones]);

  const filteredFundaciones = useMemo(() => {
    return fundaciones.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           f.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesEnabled = f.enabled !== false;
      return matchesSearch && matchesCategory && matchesStatus && matchesEnabled;
    });
  }, [fundaciones, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = fundaciones.filter(f => f.enabled !== false).length;
    const totalSublinks = fundaciones.reduce((acc, f) => acc + (f.sublinks?.filter(s => s.enabled).length || 0), 0);
    const updated = fundaciones.filter(f => f.status === 'updated' && f.enabled !== false).length;
    const lastCheck = fundaciones.reduce((max, f) => {
      const time = f.last_checked ? new Date(f.last_checked).getTime() : 0;
      return time > max ? time : max;
    }, 0);

    return { total, totalSublinks, updated, lastCheck };
  }, [fundaciones]);

  const handleSaveFundacion = async (data: Partial<Fundacion>) => {
    try {
      if (editingFundacion) {
        await updateFundacion(editingFundacion.id, data);
        toast({
          title: "Fundación actualizada",
          description: "Los cambios se han guardado correctamente",
        });
      } else {
        await createFundacion(data);
        toast({
          title: "Fundación añadida",
          description: "La fundación se ha añadido correctamente",
        });
      }
      setEditingFundacion(null);
      loadFundaciones();
    } catch (error) {
      console.error('Error saving fundacion:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la fundación",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFundacion = async (id: string) => {
    try {
      await deleteFundacion(id);
      toast({
        title: "Fundación eliminada",
        description: "La fundación se ha eliminado correctamente",
      });
      loadFundaciones();
    } catch (error) {
      console.error('Error deleting fundacion:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la fundación",
        variant: "destructive",
      });
    }
  };

  const handleStartMonitoring = async () => {
    setIsMonitoring(true);
    toast({
      title: "Iniciando monitoreo",
      description: "Revisando todas las fundaciones...",
    });

    try {
      const result = await triggerMonitoring();
      
      toast({
        title: "Monitoreo completado",
        description: `Se han revisado ${result.results?.total || 0} fundaciones. ${result.results?.updated || 0} con cambios detectados.`,
      });
      
      await loadFundaciones();
    } catch (error) {
      console.error('Error during monitoring:', error);
      toast({
        title: "Error en el monitoreo",
        description: "Hubo un problema al ejecutar el monitoreo",
        variant: "destructive",
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  const handleExportCSV = () => {
    const updated = fundaciones.filter(f => f.status === 'updated');
    const csv = [
      ['Nombre', 'URL', 'Categoría', 'Estado', 'Última revisión'].join(','),
      ...updated.map(f => [
        f.name,
        f.url,
        f.category,
        f.status,
        f.last_checked ? new Date(f.last_checked).toLocaleString('es-ES') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundaciones-actualizadas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Exportación completada",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Cargando fundaciones...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Fundaciones"
          value={stats.total}
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Subenlaces Monitorizados"
          value={stats.totalSublinks}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Actualizaciones Detectadas"
          value={stats.updated}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Última Revisión"
          value={stats.lastCheck ? new Date(stats.lastCheck).toLocaleDateString('es-ES') : 'N/A'}
          icon={Clock}
          variant="default"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-6 rounded-xl border">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fundaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="updated">Actualizadas</SelectItem>
              <SelectItem value="unchanged">Sin cambios</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={stats.updated === 0}
            className="flex-1 md:flex-initial"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingFundacion(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary flex-1 md:flex-initial"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva
          </Button>
          <Button
            onClick={handleStartMonitoring}
            disabled={isMonitoring}
            size="sm"
            className="bg-gradient-primary flex-1 md:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isMonitoring ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isMonitoring ? 'Monitorizando...' : 'Monitoreo'}</span>
            <span className="sm:hidden">Mon.</span>
          </Button>
        </div>
      </div>

      {/* Fundaciones List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Fundaciones ({filteredFundaciones.length})
          </h2>
        </div>

        {filteredFundaciones.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron fundaciones</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Añade tu primera fundación para comenzar"}
            </p>
            {!(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fundación
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFundaciones.map(fundacion => (
              <FundacionCard
                key={fundacion.id}
                fundacion={fundacion}
                onEdit={(f) => {
                  setEditingFundacion(f);
                  setDialogOpen(true);
                }}
                onDelete={handleDeleteFundacion}
                onViewDetails={(f) => {
                  toast({
                    title: "Detalles de " + f.name,
                    description: "Funcionalidad próximamente disponible",
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <FundacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveFundacion}
        fundacion={editingFundacion}
      />
    </main>
  );
};

export default FundacionesSection;
