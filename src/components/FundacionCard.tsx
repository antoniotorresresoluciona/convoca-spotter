import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Fundacion } from "@/types/fundacion";

interface FundacionCardProps {
  fundacion: Fundacion;
  onEdit: (fundacion: Fundacion) => void;
  onDelete: (id: string) => void;
  onViewDetails: (fundacion: Fundacion) => void;
}

export function FundacionCard({ fundacion, onEdit, onDelete, onViewDetails }: FundacionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    updated: {
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
      label: "Actualizada",
    },
    unchanged: {
      icon: AlertCircle,
      color: "text-muted-foreground",
      bg: "bg-muted",
      label: "Sin cambios",
    },
    pending: {
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      label: "Pendiente",
    },
  };

  const config = statusConfig[fundacion.status];
  const StatusIcon = config.icon;

  const updatedSublinks = fundacion.sublinks?.filter(s => s.enabled && s.status === 'updated').length || 0;

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 animate-fade-in border-l-4" style={{
      borderLeftColor: fundacion.status === 'updated' ? 'hsl(var(--success))' : 'hsl(var(--border))'
    }}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">{fundacion.name}</h3>
              <Badge variant="outline" className="text-xs">
                {fundacion.category}
              </Badge>
              {updatedSublinks > 0 && (
                <Badge className="bg-success text-success-foreground">
                  {updatedSublinks} {updatedSublinks === 1 ? 'actualización' : 'actualizaciones'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
              {fundacion.last_checked && (
                <span className="text-xs text-muted-foreground">
                  • Revisado: {new Date(fundacion.last_checked).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(fundacion.url, '_blank')}
              title="Abrir URL"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(fundacion)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(fundacion.id)}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* URL Principal */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{fundacion.url}</span>
        </div>

        {/* Sublinks Section */}
        {fundacion.sublinks && fundacion.sublinks.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between"
            >
              <span className="text-sm font-medium">
                Subenlaces monitorizados ({fundacion.sublinks.filter(s => s.enabled).length})
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {isExpanded && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                {fundacion.sublinks.filter(s => s.enabled).map((sublink) => (
                  <div
                    key={sublink.id}
                    className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {sublink.status === 'updated' ? (
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 text-foreground">{sublink.url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => window.open(sublink.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(fundacion)}
            className="flex-1"
          >
            Ver detalles
          </Button>
        </div>
      </div>
    </Card>
  );
}
