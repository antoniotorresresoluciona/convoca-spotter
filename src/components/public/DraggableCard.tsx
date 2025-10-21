import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, AlertCircle, Sparkles, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PublicChange {
  id: string;
  source_name: string;
  source_type: 'fundacion' | 'ente_publico' | 'otra_fuente';
  changes_description: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detected_at: string;
  url: string;
  ai_summary?: string;
  deadline_date?: string;
  ai_keywords?: string[];
  is_new_convocatoria?: boolean;
  change_type?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
}

interface DraggableCardProps {
  change: PublicChange;
  isDragging?: boolean;
}

export function DraggableCard({ change, isDragging }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: change.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const priorityColors = {
    ALTA: 'bg-red-100 text-red-800 border-red-300',
    MEDIA: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    BAJA: 'bg-green-100 text-green-800 border-green-300',
  };

  const priorityBorderColors = {
    ALTA: 'border-l-red-500',
    MEDIA: 'border-l-yellow-500',
    BAJA: 'border-l-green-500',
  };

  const changeTypeLabels: Record<string, string> = {
    'title_change': 'Cambio de Título',
    'headings_added': 'Nuevos Encabezados',
    'links_added': 'Nuevos Enlaces',
    'dates_changed': 'Fechas Actualizadas',
    'content_change': 'Contenido Modificado',
    'new_page': 'Página Nueva',
    'updated': 'Actualización',
  };

  const changeTypeIcons: Record<string, string> = {
    'title_change': '📝',
    'headings_added': '📋',
    'links_added': '🔗',
    'dates_changed': '📅',
    'content_change': '✏️',
    'new_page': '🆕',
    'updated': '🔄',
  };

  const sourceTypeEmojis = {
    'fundacion': '🏛️',
    'ente_publico': '🏢',
    'otra_fuente': '📰',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`border-l-4 ${priorityBorderColors[change.priority]} hover:shadow-lg transition-all bg-white cursor-grab active:cursor-grabbing`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-sm font-semibold line-clamp-2 flex-1 flex items-center gap-2">
              <span>{sourceTypeEmojis[change.source_type]}</span>
              {change.source_name}
            </CardTitle>
            <Badge className={`${priorityColors[change.priority]} text-xs shrink-0`}>
              {change.priority}
            </Badge>
          </div>

          {change.is_new_convocatoria && (
            <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-300">
              <Sparkles className="h-3 w-3 mr-1" />
              Nueva Convocatoria
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Tipo de cambio */}
          {change.change_type && (
            <div className="flex items-center gap-2">
              <span className="text-lg">{changeTypeIcons[change.change_type] || '📄'}</span>
              <Badge variant="secondary" className="text-xs">
                {changeTypeLabels[change.change_type] || change.change_type}
              </Badge>
            </div>
          )}

          {/* Resumen */}
          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
            {change.ai_summary || change.changes_description}
          </p>

          {/* Keywords */}
          {change.ai_keywords && change.ai_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {change.ai_keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Fecha límite */}
          {change.deadline_date && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1.5 rounded-md">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="font-medium">
                Plazo: {new Date(change.deadline_date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(change.detected_at), {
                  addSuffix: true,
                  locale: es
                })}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(change.url, '_blank');
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver más <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
