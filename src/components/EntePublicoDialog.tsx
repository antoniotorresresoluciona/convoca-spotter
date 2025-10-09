import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntePublico } from "@/types/fundacion";

interface EntePublicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<EntePublico>) => void;
  ente: EntePublico | null;
}

export const EntePublicoDialog = ({
  open,
  onOpenChange,
  onSave,
  ente,
}: EntePublicoDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    category: "",
    entity: "",
  });

  useEffect(() => {
    if (ente) {
      setFormData({
        name: ente.name,
        url: ente.url,
        category: ente.category,
        entity: ente.entity,
      });
    } else {
      setFormData({
        name: "",
        url: "",
        category: "",
        entity: "",
      });
    }
  }, [ente, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {ente ? "Editar Ente Público" : "Nuevo Ente Público"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ministerio de Cultura"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="Ministerio, Autonómico, Local..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity">Entidad</Label>
            <Input
              id="entity"
              value={formData.entity}
              onChange={(e) =>
                setFormData({ ...formData, entity: e.target.value })
              }
              placeholder="Gobierno de España, Xunta de Galicia..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {ente ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
