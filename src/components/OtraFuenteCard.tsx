import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle2, AlertCircle, Clock, Link2, Power } from "lucide-react";
import { Button } from "./ui/button";
import { OtraFuente } from "@/types/fundacion";

interface OtraFuenteCardProps {
  fuente: OtraFuente;
  onEdit: (fuente: OtraFuente) => void;
  onDelete: (id: string) => void;
  onViewDetails: (fuente: OtraFuente) => void;
}

export function OtraFuenteCard({ fuente, onEdit, onDelete, onViewDetails }: OtraFuenteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState(fuente.url);

  const statusConfig = {
    updated: {
      icon: CheckCircle2,
      color: "text-black",
      label: "Actualizada",
    },
    unchanged: {
      icon: AlertCircle,
      color: "text-neutral-500",
      label: "Sin cambios",
    },
    pending: {
      icon: Clock,
      color: "text-neutral-500",
      label: "Pendiente",
    },
  };

  const config = statusConfig[fuente.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const updatedSublinks = fuente.sublinks?.filter(s => s.enabled && s.status === 'updated').length || 0;

  return (
    <div className="bg-white border border-neutral-200 hover:border-neutral-400 transition-colors" style={{
      borderLeftWidth: '4px',
      borderLeftColor: fuente.status === 'updated' ? '#000' : '#d4d4d4'
    }}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-black">{fuente.name}</h3>
              <span className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200">
                {fuente.category}
              </span>
              <span className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200">
                {fuente.type}
              </span>
              {updatedSublinks > 0 && (
                <span className="text-xs px-2.5 py-1 bg-black text-white">
                  {updatedSublinks} {updatedSublinks === 1 ? 'actualización' : 'actualizaciones'}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 ${fuente.enabled !== false ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}
                onClick={async () => {
                  try {
                    const response = await fetch(`http://localhost:3000/rest/v1/otras_fuentes?id=eq.${fuente.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled: fuente.enabled === false ? true : false })
                    });
                    if (response.ok) {
                      fuente.enabled = fuente.enabled === false ? true : false;
                      window.location.reload();
                    }
                  } catch (err) {
                    console.error('Error toggling fuente:', err);
                  }
                }}
                title={fuente.enabled !== false ? 'Desactivar monitoreo de la fuente' : 'Activar monitoreo de la fuente'}
              >
                <Power className="h-4 w-4 mr-1" />
                {fuente.enabled !== false ? 'Activo' : 'Inactivo'}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm flex-wrap">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              {fuente.last_checked && (
                <span className="text-neutral-500">
                  • {new Date(fuente.last_checked).toLocaleString('es-ES', {
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
              onClick={() => window.open(fuente.url, '_blank')}
              title="Abrir URL"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(fuente)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(fuente.id)}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* URL Principal */}
        <div className="space-y-2 border-t border-neutral-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-black">URL Principal:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingUrl(!isEditingUrl)}
              title="Editar URL"
              className="h-6"
            >
              <Link2 className="h-3 w-3" />
            </Button>
          </div>

          {isEditingUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                className="flex-1 text-sm px-3 py-2 border border-neutral-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="https://..."
              />
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(`http://localhost:3000/rest/v1/otras_fuentes?id=eq.${fuente.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: editedUrl })
                    });
                    if (response.ok) {
                      fuente.url = editedUrl;
                      setIsEditingUrl(false);
                    }
                  } catch (err) {
                    console.error('Error updating URL:', err);
                  }
                }}
              >
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedUrl(fuente.url);
                  setIsEditingUrl(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="truncate flex-1">{fuente.url}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => window.open(fuente.url, '_blank')}
                title="Abrir URL"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Sublinks Section */}
        {fuente.sublinks && fuente.sublinks.length > 0 && (
          <div className="space-y-2 border-t border-neutral-100 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between hover:bg-neutral-50"
            >
              <span className="text-sm font-medium text-black">
                Subenlaces monitorizados ({fuente.sublinks.filter(s => s.enabled).length})
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {isExpanded && (
              <div className="space-y-2 pl-4 border-l-2 border-neutral-200">
                {fuente.sublinks.map((sublink) => (
                  <div
                    key={sublink.id}
                    className={`flex items-center gap-2 text-sm p-2 hover:bg-neutral-50 transition-colors ${
                      !sublink.enabled ? 'opacity-50' : ''
                    }`}
                  >
                    {sublink.status === 'updated' ? (
                      <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-black">{sublink.link_text || 'Sin título'}</div>
                      <div className="truncate text-xs text-neutral-500">{sublink.url}</div>
                      {sublink.last_checked && (
                        <div className="text-xs text-neutral-500">
                          Revisado: {new Date(sublink.last_checked).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 flex-shrink-0 ${sublink.enabled ? 'text-black' : 'text-neutral-400'}`}
                      onClick={async () => {
                        try {
                          const response = await fetch(`http://localhost:3000/rest/v1/sublinks?id=eq.${sublink.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled: sublink.enabled ? 0 : 1 })
                          });
                          if (response.ok) {
                            sublink.enabled = !sublink.enabled;
                            window.location.reload();
                          }
                        } catch (err) {
                          console.error('Error toggling sublink:', err);
                        }
                      }}
                      title={sublink.enabled ? 'Desactivar monitoreo' : 'Activar monitoreo'}
                    >
                      <Power className="h-3 w-3" />
                    </Button>
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
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(fuente)}
            className="flex-1"
          >
            Ver detalles
          </Button>
        </div>
      </div>
    </div>
  );
}
