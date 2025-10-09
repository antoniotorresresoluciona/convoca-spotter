import { useState, useMemo, useEffect } from "react";
import { Landmark, RefreshCw, Plus, Search, Filter, Download, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { EntePublicoCard } from "@/components/EntePublicoCard";
import { EntePublicoDialog } from "@/components/EntePublicoDialog";
import { EntePublico } from "@/types/fundacion";
import { useToast } from "@/hooks/use-toast";
import { 
  getEntesPublicos, 
  createEntePublico, 
  updateEntePublico, 
  deleteEntePublico 
} from "@/lib/entesPublicosApi";

const EntesPublicosSection = () => {
  const { toast } = useToast();
  const [entes, setEntes] = useState<EntePublico[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEnte, setEditingEnte] = useState<EntePublico | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntes();
  }, []);

  const loadEntes = async () => {
    try {
      setIsLoading(true);
      const data = await getEntesPublicos();
      setEntes(data);
    } catch (error) {
      console.error('Error loading entes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los entes públicos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(entes.map(e => e.category));
    return Array.from(cats).sort();
  }, [entes]);

  const filteredEntes = useMemo(() => {
    return entes.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           e.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesEnabled = e.enabled !== false;
      return matchesSearch && matchesCategory && matchesStatus && matchesEnabled;
    });
  }, [entes, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = entes.filter(e => e.enabled !== false).length;
    const totalSublinks = entes.reduce((acc, e) => acc + (e.sublinks?.filter(s => s.enabled).length || 0), 0);
    const updated = entes.filter(e => e.status === 'updated' && e.enabled !== false).length;
    const lastCheck = entes.reduce((max, e) => {
      const time = e.last_checked ? new Date(e.last_checked).getTime() : 0;
      return time > max ? time : max;
    }, 0);

    return { total, totalSublinks, updated, lastCheck };
  }, [entes]);

  const handleSaveEnte = async (data: Partial<EntePublico>) => {
    try {
      if (editingEnte) {
        await updateEntePublico(editingEnte.id, data);
        toast({
          title: "Ente actualizado",
          description: "Los cambios se han guardado correctamente",
        });
      } else {
        await createEntePublico(data);
        toast({
          title: "Ente añadido",
          description: "El ente público se ha añadido correctamente",
        });
      }
      setEditingEnte(null);
      loadEntes();
    } catch (error) {
      console.error('Error saving ente:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el ente público",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEnte = async (id: string) => {
    try {
      await deleteEntePublico(id);
      toast({
        title: "Ente eliminado",
        description: "El ente público se ha eliminado correctamente",
      });
      loadEntes();
    } catch (error) {
      console.error('Error deleting ente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ente público",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const updated = entes.filter(e => e.status === 'updated');
    const csv = [
      ['Nombre', 'URL', 'Categoría', 'Entidad', 'Estado', 'Última revisión'].join(','),
      ...updated.map(e => [
        e.name,
        e.url,
        e.category,
        e.entity,
        e.status,
        e.last_checked ? new Date(e.last_checked).toLocaleString('es-ES') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entes-publicos-actualizados-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Exportación completada",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Cargando entes públicos...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Entes Públicos"
          value={stats.total}
          icon={Landmark}
          variant="success"
        />
        <StatCard
          title="Subenlaces Monitorizados"
          value={stats.totalSublinks}
          icon={TrendingUp}
          variant="success"
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
          variant="success"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-6 rounded-xl border border-success/20">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entes públicos..."
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
              <SelectItem value="updated">Actualizados</SelectItem>
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
              setEditingEnte(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary flex-1 md:flex-initial"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Entes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Entes Públicos ({filteredEntes.length})
          </h2>
        </div>

        {filteredEntes.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-success/20">
            <Landmark className="h-12 w-12 mx-auto text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron entes públicos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Añade tu primer ente público para comenzar"}
            </p>
            {!(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Ente Público
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEntes.map(ente => (
              <EntePublicoCard
                key={ente.id}
                ente={ente}
                onEdit={(e) => {
                  setEditingEnte(e);
                  setDialogOpen(true);
                }}
                onDelete={handleDeleteEnte}
                onViewDetails={(e) => {
                  toast({
                    title: "Detalles de " + e.name,
                    description: "Funcionalidad próximamente disponible",
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <EntePublicoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveEnte}
        ente={editingEnte}
      />
    </main>
  );
};

export default EntesPublicosSection;
