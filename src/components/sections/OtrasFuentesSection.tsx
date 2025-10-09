import { Search } from "lucide-react";

const OtrasFuentesSection = () => {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center py-12 bg-card rounded-xl border">
        <Search className="h-16 w-16 mx-auto text-warning mb-4" />
        <h3 className="text-2xl font-bold mb-2">Otras Fuentes / Buscadores</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Monitoreo de agregadores, buscadores y portales especializados. Próximamente disponible.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-warning rounded-full" />
          <span>12 fuentes pre-cargadas en la base de datos</span>
        </div>
      </div>
    </main>
  );
};

export default OtrasFuentesSection;
