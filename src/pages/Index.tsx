import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { KanbanFilters } from '@/components/kanban/KanbanFilters';
import { ChangeFilters } from '@/lib/changesApi';

const Index = () => {
  const [filters, setFilters] = useState<ChangeFilters>({
    dateRange: 'all',
    sourceType: 'all',
    priority: 'all',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏛️ Monitor de Convocatorias</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tablero de revisión de cambios detectados
              </p>
            </div>
            <Link to="/admin/login">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <KanbanFilters filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Kanban Board */}
      <main className="container mx-auto px-4 py-6">
        <KanbanBoard filters={filters} />
      </main>
    </div>
  );
};

export default Index;
