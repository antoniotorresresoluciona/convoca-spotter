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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move hover:shadow-lg transition-shadow"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {change.source_name || 'Sin nombre'}
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {change.url}
              </p>
            </div>
          </div>
        </div>

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
            className={`text-xs ${priorityColors[change.priority]}`}
          >
            {change.priority === 'low' && 'Baja'}
            {change.priority === 'normal' && 'Normal'}
            {change.priority === 'high' && 'Alta'}
            {change.priority === 'urgent' && 'Urgente'}
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(change)}
          >
            Ver Detalles
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(change.url, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
