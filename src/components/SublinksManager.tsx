import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sublink } from "@/types/fundacion";

interface SublinksManagerProps {
  sublinks: Sublink[];
  onSublinksChange: (sublinks: Sublink[]) => void;
  readOnly?: boolean;
}

export function SublinksManager({ sublinks, onSublinksChange, readOnly = false }: SublinksManagerProps) {
  const [newSublink, setNewSublink] = useState({ url: "", link_text: "" });

  const handleAddSublink = () => {
    if (!newSublink.url.trim()) return;

    const sublink: Sublink = {
      id: `temp-${Date.now()}`,
      url: newSublink.url,
      link_text: newSublink.link_text || newSublink.url,
      enabled: true,
      status: 'pending',
    };

    onSublinksChange([...sublinks, sublink]);
    setNewSublink({ url: "", link_text: "" });
  };

  const handleRemoveSublink = (id: string) => {
    onSublinksChange(sublinks.filter(s => s.id !== id));
  };

  const handleToggleSublink = (id: string) => {
    onSublinksChange(
      sublinks.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Subenlaces ({sublinks.length})</Label>
        <p className="text-xs text-neutral-500">
          Añade URLs adicionales para monitorear dentro de esta entrada
        </p>
      </div>

      {/* Lista de sublinks */}
      {sublinks.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-200 rounded-md p-3">
          {sublinks.map((sublink) => (
            <div
              key={sublink.id}
              className={`flex items-center gap-2 p-2 border border-neutral-200 rounded-md ${
                !sublink.enabled ? 'opacity-50 bg-neutral-50' : 'bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black truncate">
                  {sublink.link_text || 'Sin título'}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                  {sublink.url}
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(sublink.url, '_blank')}
                    title="Abrir URL"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleSublink(sublink.id)}
                    title={sublink.enabled ? 'Desactivar' : 'Activar'}
                  >
                    <span className="text-xs">{sublink.enabled ? '✓' : '✗'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveSublink(sublink.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario para añadir nuevo sublink */}
      {!readOnly && (
        <div className="space-y-3 p-3 border border-dashed border-neutral-300 rounded-md bg-neutral-50">
          <div className="space-y-2">
            <Label htmlFor="sublink-url" className="text-xs">URL del subenlace</Label>
            <Input
              id="sublink-url"
              type="url"
              placeholder="https://..."
              value={newSublink.url}
              onChange={(e) => setNewSublink({ ...newSublink, url: e.target.value })}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sublink-text" className="text-xs">Texto del enlace (opcional)</Label>
            <Input
              id="sublink-text"
              placeholder="Convocatorias 2024, Licitaciones..."
              value={newSublink.link_text}
              onChange={(e) => setNewSublink({ ...newSublink, link_text: e.target.value })}
              className="text-sm"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSublink}
            disabled={!newSublink.url.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir subenlace
          </Button>
        </div>
      )}
    </div>
  );
}
