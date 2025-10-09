import { Fundacion } from "@/types/fundacion";

export const initialFundaciones: Omit<Fundacion, 'id' | 'createdAt' | 'status'>[] = [
  { name: "FP Diverse", url: "https://fpdiverse.org/", category: "Diversidad" },
  { name: "FP Diverse DGrow", url: "https://fpdiverse.org/dgrow/", category: "Diversidad" },
  { name: "Fundación Inocente", url: "https://fundacioninocente.org/convocatoria-de-ayudas/", category: "Infancia" },
  { name: "Fundación Bidafarma", url: "https://www.bidafarma.es/web/bidafarma/inicio/", category: "Salud" },
  { name: "Fundación Pelayo", url: "https://www.grupopelayo.com/compromiso-social/fundacion-pelayo", category: "General" },
  { name: "Fundación Ibercaja", url: "https://www.fundacionibercaja.es/convocatorias/", category: "Financiera" },
  { name: "Fondation Carasso", url: "https://www.fondationcarasso.org/es/convocatorias/", category: "Internacional" },
  { name: "Fundación Carrefour", url: "https://www.carrefour.es/grupo-carrefour/fundacion/convocatoria-de-ayudas/", category: "Retail" },
  { name: "Fundación Iberdrola", url: "https://www.fundacioniberdrolaespana.org/accion-social/programa-social", category: "Energía" },
  { name: "Fundación Mapfre", url: "https://www.fundacionmapfre.org/premios-ayudas/convocatorias/", category: "Seguros" },
  { name: "Fundación Mutua Madrileña", url: "https://www.fundacionmutua.es/accion-social/ayudas-proyectos-sociales/", category: "Seguros" },
  { name: "Fundación Banco Sabadell", url: "https://www.fundacionbancosabadell.com/convocatorias/", category: "Financiera" },
  { name: "Fundación Tellus", url: "https://fundaciontellus.org/convocatoria-horizonte-ods/", category: "ODS" },
  { name: "Fundación Banco Santander", url: "https://www.fundacionbancosantander.com/es/accion-social/santander-ayuda", category: "Financiera" },
  { name: "Reale Foundation", url: "https://realefoundation.org/es/proyectos/enviar-un-proyecto.html", category: "Seguros" },
  { name: "Fundación Michelin", url: "https://www.fundacionmichelin.es/contacto/", category: "Automoción" },
  { name: "Fundación Familia Torres", url: "https://fundacionfamiliatorres.org/presenta-tu-proyecto/", category: "Alimentación" },
  { name: "Fundación Nemesio Diez", url: "https://www.fundacionnemesiodiez.es/que-hacemos/", category: "General" },
  { name: "Fundación ADEY", url: "https://fundacionadey.org/formulario-entidades/", category: "General" },
  { name: "Fundación GMP", url: "https://www.fundaciongmp.org/contacto/", category: "General" },
  { name: "Fundación EDP", url: "https://www.fundacionedp.es/es/apoyos-y-colaboraciones/", category: "Energía" },
  { name: "Fundación AON", url: "https://fundacionaon.es/", category: "Seguros" },
  { name: "Fundación ACS", url: "https://www.fundacionacs.com/", category: "Construcción" },
  { name: "Fundación GCO", url: "https://fundaciongco.com/", category: "General" }
];
