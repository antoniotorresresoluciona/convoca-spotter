-- Crear tabla de fundaciones
CREATE TABLE public.fundaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de subenlaces
CREATE TABLE public.sublinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundacion_id UUID NOT NULL REFERENCES public.fundaciones(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fundacion_id, url)
);

-- Crear tabla de historial de cambios
CREATE TABLE public.change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundacion_id UUID NOT NULL REFERENCES public.fundaciones(id) ON DELETE CASCADE,
  sublink_id UUID REFERENCES public.sublinks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed BOOLEAN NOT NULL DEFAULT false,
  changes_description TEXT
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_fundaciones_status ON public.fundaciones(status);
CREATE INDEX idx_fundaciones_last_checked ON public.fundaciones(last_checked);
CREATE INDEX idx_sublinks_fundacion ON public.sublinks(fundacion_id);
CREATE INDEX idx_sublinks_enabled ON public.sublinks(enabled);
CREATE INDEX idx_change_history_fundacion ON public.change_history(fundacion_id);
CREATE INDEX idx_change_history_reviewed ON public.change_history(reviewed);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fundaciones_updated_at
  BEFORE UPDATE ON public.fundaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Habilitar RLS en todas las tablas
ALTER TABLE public.fundaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sublinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: permitir lectura y escritura a todos (es un sistema público de monitoreo)
CREATE POLICY "Permitir lectura pública de fundaciones"
  ON public.fundaciones FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Permitir escritura pública de fundaciones"
  ON public.fundaciones FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir lectura pública de sublinks"
  ON public.sublinks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Permitir escritura pública de sublinks"
  ON public.sublinks FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir lectura pública de historial"
  ON public.change_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Permitir escritura pública de historial"
  ON public.change_history FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insertar fundaciones iniciales
INSERT INTO public.fundaciones (name, url, category) VALUES
  ('FP Diverse', 'https://fpdiverse.org/', 'Diversidad'),
  ('FP Diverse DGrow', 'https://fpdiverse.org/dgrow/', 'Diversidad'),
  ('Fundación Inocente', 'https://fundacioninocente.org/convocatoria-de-ayudas/', 'Infancia'),
  ('Fundación Bidafarma', 'https://www.bidafarma.es/web/bidafarma/inicio/', 'Salud'),
  ('Fundación Pelayo', 'https://www.grupopelayo.com/compromiso-social/fundacion-pelayo', 'General'),
  ('Fundación Ibercaja', 'https://www.fundacionibercaja.es/convocatorias/', 'Financiera'),
  ('Fondation Carasso', 'https://www.fondationcarasso.org/es/convocatorias/', 'Internacional'),
  ('Fundación Carrefour', 'https://www.carrefour.es/grupo-carrefour/fundacion/convocatoria-de-ayudas/', 'Retail'),
  ('Fundación Iberdrola', 'https://www.fundacioniberdrolaespana.org/accion-social/programa-social', 'Energía'),
  ('Fundación Mapfre', 'https://www.fundacionmapfre.org/premios-ayudas/convocatorias/', 'Seguros'),
  ('Fundación Mutua Madrileña', 'https://www.fundacionmutua.es/accion-social/ayudas-proyectos-sociales/', 'Seguros'),
  ('Fundación Banco Sabadell', 'https://www.fundacionbancosabadell.com/convocatorias/', 'Financiera'),
  ('Fundación Tellus', 'https://fundaciontellus.org/convocatoria-horizonte-ods/', 'ODS'),
  ('Fundación Banco Santander', 'https://www.fundacionbancosantander.com/es/accion-social/santander-ayuda', 'Financiera'),
  ('Reale Foundation', 'https://realefoundation.org/es/proyectos/enviar-un-proyecto.html', 'Seguros'),
  ('Fundación Michelin', 'https://www.fundacionmichelin.es/contacto/', 'Automoción'),
  ('Fundación Familia Torres', 'https://fundacionfamiliatorres.org/presenta-tu-proyecto/', 'Alimentación'),
  ('Fundación Nemesio Diez', 'https://www.fundacionnemesiodiez.es/que-hacemos/', 'General'),
  ('Fundación ADEY', 'https://fundacionadey.org/formulario-entidades/', 'General'),
  ('Fundación GMP', 'https://www.fundaciongmp.org/contacto/', 'General'),
  ('Fundación EDP', 'https://www.fundacionedp.es/es/apoyos-y-colaboraciones/', 'Energía'),
  ('Fundación AON', 'https://fundacionaon.es/', 'Seguros'),
  ('Fundación ACS', 'https://www.fundacionacs.com/', 'Construcción'),
  ('Fundación GCO', 'https://fundaciongco.com/', 'General');

-- Habilitar la extensión pg_cron para tareas programadas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar la extensión pg_net para hacer peticiones HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;