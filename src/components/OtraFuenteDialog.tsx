import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OtraFuente, Sublink } from "@/types/fundacion";
import { SublinksManager } from "./SublinksManager";

interface OtraFuenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<OtraFuente>) => void;
  fuente: OtraFuente | null;
}

export const OtraFuenteDialog = ({
  open,
  onOpenChange,
  onSave,
  fuente,
}: OtraFuenteDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    category: "",
    type: "",
  });
  const [sublinks, setSublinks] = useState<Sublink[]>([]);

  useEffect(() => {
    if (fuente) {
      setFormData({
        name: fuente.name,
        url: fuente.url,
        category: fuente.category,
        type: fuente.type,
      });
      setSublinks(fuente.sublinks || []);
    } else {
      setFormData({
        name: "",
        url: "",
        category: "",
        type: "",
      });
      setSublinks([]);
    }
  }, [fuente, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, sublinks });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fuente ? "Editar Fuente" : "Nueva Fuente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Información General</TabsTrigger>
              <TabsTrigger value="sublinks">
                Subenlaces ({sublinks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Las Fundaciones"
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
                  placeholder="Portal, Consultora, Buscador..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  placeholder="Agregador, Boletín, Base de Datos..."
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="sublinks" className="mt-4">
              <SublinksManager
                sublinks={sublinks}
                onSublinksChange={setSublinks}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {fuente ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
