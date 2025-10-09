import { Calendar, Filter, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChangeFilters } from '@/lib/changesApi';

interface KanbanFiltersProps {
  filters: ChangeFilters;
  onFiltersChange: (filters: ChangeFilters) => void;
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.dateRange || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, dateRange: value as ChangeFilters['dateRange'] })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo el período</SelectItem>
          <SelectItem value="24h">Últimas 24h</SelectItem>
          <SelectItem value="7d">Últimos 7 días</SelectItem>
          <SelectItem value="30d">Últimos 30 días</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sourceType || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, sourceType: value as ChangeFilters['sourceType'] })
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las fuentes</SelectItem>
          <SelectItem value="fundacion">Fundaciones</SelectItem>
          <SelectItem value="ente_publico">Entes Públicos</SelectItem>
          <SelectItem value="otra_fuente">Otras Fuentes</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, priority: value as ChangeFilters['priority'] })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <Tag className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="low">Baja</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
