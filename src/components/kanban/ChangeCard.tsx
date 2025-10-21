import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Change } from '@/lib/changesApi';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChangeCardProps {
  change: Change;
  onViewDetails: (change: Change) => void;
}

export function ChangeCard({ change, onViewDetails }: ChangeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: change.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    normal: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const sourceTypeLabels = {
    fundacion: 'Fundación',
    ente_publico: 'Ente Público',
    otra_fuente: 'Otra Fuente',
  };

  const sourceTypeColors = {
    fundacion: 'bg-primary/10 text-primary border-primary/20',
    ente_publico: 'bg-success/10 text-success border-success/20',
    otra_fuente: 'bg-warning/10 text-warning border-warning/20',
  };

  const changeTypeConfig = {
    content_change: { icon: '📝', label: 'Contenido actualizado', color: 'text-blue-600' },
    title_change: { icon: '📄', label: 'Título cambiado', color: 'text-purple-600' },
    new_link: { icon: '🔗', label: 'Nuevo enlace', color: 'text-green-600' },
    removed_link: { icon: '❌', label: 'Enlace eliminado', color: 'text-red-600' },
    links_added: { icon: '🔗', label: 'Enlaces añadidos', color: 'text-green-600' },
    links_removed: { icon: '🗑️', label: 'Enlaces eliminados', color: 'text-red-600' },
    headings_added: { icon: '📋', label: 'Encabezados añadidos', color: 'text-indigo-600' },
    headings_removed: { icon: '📋', label: 'Encabezados eliminados', color: 'text-orange-600' },
    dates_changed: { icon: '📅', label: 'Fechas actualizadas', color: 'text-amber-600' },
  };

  const config = changeTypeConfig[change.change_type as keyof typeof changeTypeConfig] || {
    icon: '📌',
    label: change.change_type,
    color: 'text-gray-600'
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        cursor-move hover:shadow-md transition-all duration-200
        border-l-4
        ${change.priority === 'urgent' ? 'border-l-red-500' : ''}
        ${change.priority === 'high' ? 'border-l-orange-500' : ''}
        ${change.priority === 'normal' ? 'border-l-blue-500' : ''}
        ${change.priority === 'low' ? 'border-l-gray-500' : ''}
        ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}
      `}
    >
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1 -m-1 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{config.icon}</span>
              <h4 className={`font-semibold text-sm truncate ${config.color}`}>
                {config.label}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {change.source_name}
            </p>
          </div>
        </div>

        {change.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
            {change.notes}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {change.source_type && (
            <Badge
              variant="outline"
              className={`text-xs ${sourceTypeColors[change.source_type]}`}
            >
              {sourceTypeLabels[change.source_type]}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-xs font-semibold ${priorityColors[change.priority]}`}
          >
            {change.priority === 'low' && '⬇️ Baja'}
            {change.priority === 'normal' && '➡️ Normal'}
            {change.priority === 'high' && '⬆️ Alta'}
            {change.priority === 'urgent' && '🔥 Urgente'}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(change.detected_at), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => onViewDetails(change)}
          >
            Ver Detalles
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => window.open(change.url, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
