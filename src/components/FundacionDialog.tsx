import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Fundacion, Sublink } from "@/types/fundacion";
import { SublinksManager } from "./SublinksManager";

interface FundacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fundacion: Partial<Fundacion>) => void;
  fundacion?: Fundacion | null;
}

const categories = [
  "Diversidad",
  "Infancia",
  "Salud",
  "General",
  "Financiera",
  "Internacional",
  "Retail",
  "Energía",
  "Seguros",
  "ODS",
  "Automoción",
  "Alimentación",
  "Construcción"
];

export function FundacionDialog({ open, onOpenChange, onSave, fundacion }: FundacionDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    category: "",
  });
  const [sublinks, setSublinks] = useState<Sublink[]>([]);

  useEffect(() => {
    if (fundacion) {
      setFormData({
        name: fundacion.name,
        url: fundacion.url,
        category: fundacion.category,
      });
      setSublinks(fundacion.sublinks || []);
    } else {
      setFormData({ name: "", url: "", category: "" });
      setSublinks([]);
    }
  }, [fundacion, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, sublinks });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{fundacion ? 'Editar Fundación' : 'Nueva Fundación'}</DialogTitle>
            <DialogDescription>
              {fundacion ? 'Modifica los datos de la fundación' : 'Añade una nueva fundación para monitorear'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Información General</TabsTrigger>
              <TabsTrigger value="sublinks">
                Subenlaces ({sublinks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Fundación Ejemplo"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://ejemplo.org/convocatorias"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="sublinks" className="mt-4">
              <SublinksManager
                sublinks={sublinks}
                onSublinksChange={setSublinks}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {fundacion ? 'Guardar cambios' : 'Añadir fundación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
