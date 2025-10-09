import { Landmark } from "lucide-react";

const EntesPublicosSection = () => {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center py-12 bg-card rounded-xl border">
        <Landmark className="h-16 w-16 mx-auto text-success mb-4" />
        <h3 className="text-2xl font-bold mb-2">Entes Públicos</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Monitoreo de organismos públicos y administraciones. Próximamente disponible.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-success rounded-full" />
          <span>2 entes públicos pre-cargados en la base de datos</span>
        </div>
      </div>
    </main>
  );
};

export default EntesPublicosSection;
