import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { KanbanFilters } from '@/components/kanban/KanbanFilters';
import { ChangeFilters } from '@/lib/changesApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminKanban = () => {
  const [filters, setFilters] = useState<ChangeFilters>({
    dateRange: '30d',
    sourceType: 'all',
    priority: 'all',
  });

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Tablero Kanban</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona y revisa los cambios detectados en las fuentes monitoreadas
          </p>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo funciona el Kanban?</CardTitle>
            <CardDescription>
              Organiza los cambios detectados por estado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-[120px] font-semibold text-gray-500">Pendiente:</div>
              <div className="text-muted-foreground">Cambios recién detectados que requieren revisión</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="min-w-[120px] font-semibold text-blue-500">En Revisión:</div>
              <div className="text-muted-foreground">Cambios que estás revisando actualmente</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="min-w-[120px] font-semibold text-green-500">Relevante:</div>
              <div className="text-muted-foreground">Cambios confirmados como importantes</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="min-w-[120px] font-semibold text-red-500">Descartado:</div>
              <div className="text-muted-foreground">Cambios que no son relevantes</div>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> Arrastra y suelta las tarjetas entre columnas para cambiar su estado,
                o haz clic en "Ver Detalles" para revisar y añadir notas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <KanbanFilters filters={filters} onFiltersChange={setFilters} />
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <KanbanBoard filters={filters} />
      </div>
    </AdminLayout>
  );
};

export default AdminKanban;
