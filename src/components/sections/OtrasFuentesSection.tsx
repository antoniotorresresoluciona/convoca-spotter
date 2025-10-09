import { useState, useMemo, useEffect } from "react";
import { Search, RefreshCw, Plus, Filter, Download, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { OtraFuenteCard } from "@/components/OtraFuenteCard";
import { OtraFuenteDialog } from "@/components/OtraFuenteDialog";
import { OtraFuente } from "@/types/fundacion";
import { useToast } from "@/hooks/use-toast";
import { 
  getOtrasFuentes, 
  createOtraFuente, 
  updateOtraFuente, 
  deleteOtraFuente 
} from "@/lib/otrasFuentesApi";

const OtrasFuentesSection = () => {
  const { toast } = useToast();
  const [fuentes, setFuentes] = useState<OtraFuente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFuente, setEditingFuente] = useState<OtraFuente | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFuentes();
  }, []);

  const loadFuentes = async () => {
    try {
      setIsLoading(true);
      const data = await getOtrasFuentes();
      setFuentes(data);
    } catch (error) {
      console.error('Error loading fuentes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las fuentes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(fuentes.map(f => f.category));
    return Array.from(cats).sort();
  }, [fuentes]);

  const types = useMemo(() => {
    const tps = new Set(fuentes.map(f => f.type));
    return Array.from(tps).sort();
  }, [fuentes]);

  const filteredFuentes = useMemo(() => {
    return fuentes.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           f.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
      const matchesType = typeFilter === "all" || f.type === typeFilter;
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesEnabled = f.enabled !== false;
      return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesEnabled;
    });
  }, [fuentes, searchQuery, categoryFilter, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = fuentes.filter(f => f.enabled !== false).length;
    const totalSublinks = fuentes.reduce((acc, f) => acc + (f.sublinks?.filter(s => s.enabled).length || 0), 0);
    const updated = fuentes.filter(f => f.status === 'updated' && f.enabled !== false).length;
    const lastCheck = fuentes.reduce((max, f) => {
      const time = f.last_checked ? new Date(f.last_checked).getTime() : 0;
      return time > max ? time : max;
    }, 0);

    return { total, totalSublinks, updated, lastCheck };
  }, [fuentes]);

  const handleSaveFuente = async (data: Partial<OtraFuente>) => {
    try {
      if (editingFuente) {
        await updateOtraFuente(editingFuente.id, data);
        toast({
          title: "Fuente actualizada",
          description: "Los cambios se han guardado correctamente",
        });
      } else {
        await createOtraFuente(data);
        toast({
          title: "Fuente añadida",
          description: "La fuente se ha añadido correctamente",
        });
      }
      setEditingFuente(null);
      loadFuentes();
    } catch (error) {
      console.error('Error saving fuente:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la fuente",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFuente = async (id: string) => {
    try {
      await deleteOtraFuente(id);
      toast({
        title: "Fuente eliminada",
        description: "La fuente se ha eliminado correctamente",
      });
      loadFuentes();
    } catch (error) {
      console.error('Error deleting fuente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la fuente",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const updated = fuentes.filter(f => f.status === 'updated');
    const csv = [
      ['Nombre', 'URL', 'Categoría', 'Tipo', 'Estado', 'Última revisión'].join(','),
      ...updated.map(f => [
        f.name,
        f.url,
        f.category,
        f.type,
        f.status,
        f.last_checked ? new Date(f.last_checked).toLocaleString('es-ES') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otras-fuentes-actualizadas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Exportación completada",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Cargando fuentes...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Fuentes"
          value={stats.total}
          icon={Search}
          variant="warning"
        />
        <StatCard
          title="Subenlaces Monitorizados"
          value={stats.totalSublinks}
          icon={TrendingUp}
          variant="warning"
        />
        <StatCard
          title="Actualizaciones Detectadas"
          value={stats.updated}
          icon={CheckCircle}
          variant="warning"
        />
        <StatCard
          title="Última Revisión"
          value={stats.lastCheck ? new Date(stats.lastCheck).toLocaleDateString('es-ES') : 'N/A'}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-6 rounded-xl border border-warning/20">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fuentes..."
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {types.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
              setEditingFuente(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-primary flex-1 md:flex-initial"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva
          </Button>
        </div>
      </div>

      {/* Fuentes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Otras Fuentes ({filteredFuentes.length})
          </h2>
        </div>

        {filteredFuentes.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-warning/20">
            <Search className="h-12 w-12 mx-auto text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron fuentes</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Añade tu primera fuente para comenzar"}
            </p>
            {!(searchQuery || categoryFilter !== "all" || typeFilter !== "all" || statusFilter !== "all") && (
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fuente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFuentes.map(fuente => (
              <OtraFuenteCard
                key={fuente.id}
                fuente={fuente}
                onEdit={(f) => {
                  setEditingFuente(f);
                  setDialogOpen(true);
                }}
                onDelete={handleDeleteFuente}
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

      <OtraFuenteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveFuente}
        fuente={editingFuente}
      />
    </main>
  );
};

export default OtrasFuentesSection;
