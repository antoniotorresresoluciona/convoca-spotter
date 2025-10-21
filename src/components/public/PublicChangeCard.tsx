import { useState } from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
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

interface PublicChangeCardProps {
  change: PublicChange;
}

export function PublicChangeCard({ change }: PublicChangeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const priorityStyles = {
    ALTA: 'bg-black text-white',
    MEDIA: 'bg-neutral-600 text-white',
    BAJA: 'bg-neutral-300 text-neutral-900',
  };

  const handleCardClick = () => {
    window.open(change.url, '_blank');
  };

  return (
    <div
      className="bg-white border border-neutral-200 hover:border-neutral-400 transition-all duration-200 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-neutral-100">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-base font-semibold text-black leading-snug flex-1">
            {change.source_name}
          </h3>
          <span className={`text-xs font-medium px-2.5 py-1 ${priorityStyles[change.priority]} shrink-0`}>
            {change.priority}
          </span>
        </div>

        {change.is_new_convocatoria && (
          <span className="inline-block text-xs font-medium px-2.5 py-1 bg-neutral-100 text-neutral-900 border border-neutral-300">
            Nueva Convocatoria
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-4 space-y-4">
        {/* Description */}
        <p className="text-sm text-neutral-700 leading-relaxed">
          {change.ai_summary || change.changes_description}
        </p>

        {/* Keywords */}
        {change.ai_keywords && change.ai_keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {change.ai_keywords.slice(0, 4).map((keyword, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 bg-neutral-50 text-neutral-600 border border-neutral-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Deadline */}
        {change.deadline_date && (
          <div className="pt-3 border-t border-neutral-100">
            <div className="text-xs text-neutral-600">
              <span className="font-medium text-black">Plazo:</span>{' '}
              {new Date(change.deadline_date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(change.detected_at), {
                addSuffix: true,
                locale: es
              })}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isHovered ? 'text-black' : 'text-neutral-600'
          }`}>
            Ver detalles
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
