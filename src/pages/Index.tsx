import { Building2, Landmark, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import FundacionesSection from "@/components/sections/FundacionesSection";
import EntesPublicosSection from "@/components/sections/EntesPublicosSection";
import OtrasFuentesSection from "@/components/sections/OtrasFuentesSection";

const Index = () => {
  const [activeTab, setActiveTab] = useState("fundaciones");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Monitor de Convocatorias
              </h1>
              <p className="text-sm text-muted-foreground">
                Sistema automático de monitoreo
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b bg-card/30">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-3 h-auto p-1">
              <TabsTrigger 
                value="fundaciones" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Fundaciones</span>
                <span className="sm:hidden">Fund.</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="entes-publicos"
                className="flex items-center gap-2 data-[state=active]:bg-success data-[state=active]:text-success-foreground py-3"
              >
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline">Entes Públicos</span>
                <span className="sm:hidden">Entes</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="otras-fuentes"
                className="flex items-center gap-2 data-[state=active]:bg-warning data-[state=active]:text-warning-foreground py-3"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Otras Fuentes</span>
                <span className="sm:hidden">Otras</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fundaciones" className="mt-0">
              <FundacionesSection />
            </TabsContent>

            <TabsContent value="entes-publicos" className="mt-0">
              <EntesPublicosSection />
            </TabsContent>

            <TabsContent value="otras-fuentes" className="mt-0">
              <OtrasFuentesSection />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
