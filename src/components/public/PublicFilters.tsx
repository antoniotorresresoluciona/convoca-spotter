import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

interface FiltersState {
  sourceType: string;
  priority: string;
  dateRange: string;
}

interface PublicFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onRefresh?: () => void;
}

export function PublicFilters({ filters, onChange, onRefresh }: PublicFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      {/* Tipo de fuente */}
      <div>
        <label className="text-xs font-medium text-neutral-900 mb-2 block uppercase tracking-wide">
          Tipo de Fuente
        </label>
        <Select
          value={filters.sourceType}
          onValueChange={(value) => onChange({ ...filters, sourceType: value })}
        >
          <SelectTrigger className="border-neutral-300 bg-white hover:border-neutral-400 focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fuentes</SelectItem>
            <SelectItem value="fundacion">Fundaciones</SelectItem>
            <SelectItem value="ente_publico">Entes Públicos</SelectItem>
            <SelectItem value="otra_fuente">Otras Fuentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prioridad */}
      <div>
        <label className="text-xs font-medium text-neutral-900 mb-2 block uppercase tracking-wide">
          Prioridad
        </label>
        <Select
          value={filters.priority}
          onValueChange={(value) => onChange({ ...filters, priority: value })}
        >
          <SelectTrigger className="border-neutral-300 bg-white hover:border-neutral-400 focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="BAJA">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rango de fechas */}
      <div>
        <label className="text-xs font-medium text-neutral-900 mb-2 block uppercase tracking-wide">
          Periodo
        </label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onChange({ ...filters, dateRange: value })}
        >
          <SelectTrigger className="border-neutral-300 bg-white hover:border-neutral-400 focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Últimos 30 días" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="14d">Últimos 14 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="60d">Últimos 60 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
            <SelectItem value="all">Todas las fechas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Botón de actualizar */}
      <div>
        <Button
          onClick={onRefresh}
          className="w-full bg-black text-white hover:bg-neutral-800 transition-colors h-10 font-medium"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
    </div>
  );
}
