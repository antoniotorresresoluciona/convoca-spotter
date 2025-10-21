import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Power, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";

interface Sublink {
  id: number;
  fundacion_id: string;
  url: string;
  link_text: string;
  enabled: boolean;
  status: string;
  last_checked: string;
  last_error: string | null;
  crawl_count: number;
  depth: number;
  priority: string;
}

interface FundacionInfo {
  id: string;
  name: string;
}

export default function AdminSublinks() {
  const [sublinks, setSublinks] = useState<Sublink[]>([]);
  const [fundaciones, setFundaciones] = useState<Record<string, FundacionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('enabled');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sublinks
      const sublinksRes = await fetch('http://localhost:3000/rest/v1/sublinks?order=last_checked.desc');
      const sublinksData = await sublinksRes.json();
      setSublinks(sublinksData);

      // Fetch fundaciones
      const fundacionesRes = await fetch('http://localhost:3000/rest/v1/fundaciones?select=id,name');
      const fundacionesData = await fundacionesRes.json();
      const fundacionesMap: Record<string, FundacionInfo> = {};
      fundacionesData.forEach((f: FundacionInfo) => {
        fundacionesMap[f.id] = f;
      });
      setFundaciones(fundacionesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSublink = async (sublinkId: number, currentEnabled: boolean) => {
    try {
      const response = await fetch(`http://localhost:3000/rest/v1/sublinks?id=eq.${sublinkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: currentEnabled ? 0 : 1 })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling sublink:', error);
    }
  };

  const filteredSublinks = sublinks.filter(s => {
    if (filter === 'enabled') return s.enabled;
    if (filter === 'disabled') return !s.enabled;
    return true;
  });

  const statusConfig = {
    updated: { icon: CheckCircle2, color: "text-success", label: "Actualizado" },
    unchanged: { icon: AlertCircle, color: "text-muted-foreground", label: "Sin cambios" },
    error: { icon: AlertCircle, color: "text-destructive", label: "Error" },
    pending: { icon: Clock, color: "text-warning", label: "Pendiente" },
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subenlaces Monitorizados</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona los subenlaces que se monitorean automáticamente
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todos ({sublinks.length})
          </Button>
          <Button
            variant={filter === 'enabled' ? 'default' : 'outline'}
            onClick={() => setFilter('enabled')}
          >
            Activos ({sublinks.filter(s => s.enabled).length})
          </Button>
          <Button
            variant={filter === 'disabled' ? 'default' : 'outline'}
            onClick={() => setFilter('disabled')}
          >
            Inactivos ({sublinks.filter(s => !s.enabled).length})
          </Button>
        </div>

        {/* Sublinks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">Cargando subenlaces...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSublinks.map((sublink) => {
              const fundacion = fundaciones[sublink.fundacion_id];
              const config = statusConfig[sublink.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <Card key={sublink.id} className={`p-4 ${!sublink.enabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {sublink.link_text || 'Sin título'}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {fundacion?.name || 'Desconocido'}
                        </Badge>
                        {sublink.enabled ? (
                          <Badge className="bg-success text-success-foreground">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground truncate">
                        {sublink.url}
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {sublink.last_checked && (
                          <span>
                            Revisado: {new Date(sublink.last_checked).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                        <span>Revisiones: {sublink.crawl_count || 0}</span>
                        <span>Profundidad: {sublink.depth || 1}</span>
                        {sublink.priority && <span>Prioridad: {sublink.priority}</span>}
                      </div>

                      {sublink.last_error && (
                        <div className="text-xs text-destructive">
                          Error: {sublink.last_error}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={sublink.enabled ? 'text-success' : 'text-muted-foreground'}
                        onClick={() => toggleSublink(sublink.id, sublink.enabled)}
                        title={sublink.enabled ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(sublink.url, '_blank')}
                        title="Abrir URL"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredSublinks.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No hay subenlaces que mostrar</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
