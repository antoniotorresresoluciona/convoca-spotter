-- Crear tabla de entes públicos
CREATE TABLE public.entes_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  entity TEXT NOT NULL,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de otras fuentes
CREATE TABLE public.otras_fuentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de subenlaces para entes públicos
CREATE TABLE public.entes_publicos_sublinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ente_id UUID NOT NULL REFERENCES public.entes_publicos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ente_id, url)
);

-- Crear tabla de subenlaces para otras fuentes
CREATE TABLE public.otras_fuentes_sublinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id UUID NOT NULL REFERENCES public.otras_fuentes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('updated', 'unchanged', 'pending')),
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fuente_id, url)
);

-- Añadir columna enabled a fundaciones
ALTER TABLE public.fundaciones ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;

-- Índices
CREATE INDEX idx_entes_publicos_status ON public.entes_publicos(status);
CREATE INDEX idx_entes_publicos_enabled ON public.entes_publicos(enabled);
CREATE INDEX idx_otras_fuentes_status ON public.otras_fuentes(status);
CREATE INDEX idx_otras_fuentes_enabled ON public.otras_fuentes(enabled);
CREATE INDEX idx_entes_sublinks_ente ON public.entes_publicos_sublinks(ente_id);
CREATE INDEX idx_otras_sublinks_fuente ON public.otras_fuentes_sublinks(fuente_id);

-- Triggers para updated_at
CREATE TRIGGER update_entes_publicos_updated_at
  BEFORE UPDATE ON public.entes_publicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_otras_fuentes_updated_at
  BEFORE UPDATE ON public.otras_fuentes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies
ALTER TABLE public.entes_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otras_fuentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entes_publicos_sublinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otras_fuentes_sublinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de entes públicos"
  ON public.entes_publicos FOR SELECT
  TO public USING (true);

CREATE POLICY "Permitir escritura pública de entes públicos"
  ON public.entes_publicos FOR ALL
  TO public USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura pública de otras fuentes"
  ON public.otras_fuentes FOR SELECT
  TO public USING (true);

CREATE POLICY "Permitir escritura pública de otras fuentes"
  ON public.otras_fuentes FOR ALL
  TO public USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura pública de sublinks entes"
  ON public.entes_publicos_sublinks FOR SELECT
  TO public USING (true);

CREATE POLICY "Permitir escritura pública de sublinks entes"
  ON public.entes_publicos_sublinks FOR ALL
  TO public USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura pública de sublinks otras"
  ON public.otras_fuentes_sublinks FOR SELECT
  TO public USING (true);

CREATE POLICY "Permitir escritura pública de sublinks otras"
  ON public.otras_fuentes_sublinks FOR ALL
  TO public USING (true) WITH CHECK (true);

-- Insertar datos de entes públicos
INSERT INTO public.entes_publicos (name, url, category, entity) VALUES
  ('Ministerio de Cultura - Industrias Culturales', 'https://www.cultura.gob.es/servicios-al-ciudadano/catalogo/becas-ayudas-y-subvenciones/ayudas-y-subvenciones/industrias.html', 'Ministerio', 'Gobierno de España'),
  ('Cultura Galicia - Ayudas y Subvenciones', 'https://www.cultura.gal/es/axudas-subvencions-bolsas?field_asb_area_tematica_tid=85', 'Autonómico', 'Xunta de Galicia');

-- Insertar datos de otras fuentes
INSERT INTO public.otras_fuentes (name, url, category, type) VALUES
  ('Diagram Consultores', 'https://www.diagramconsultores.com/convocatorias-subvenciones-y-financiaciones-publicas-y-privadas/', 'Consultora', 'Agregador'),
  ('Las Fundaciones - Convocatorias', 'https://lasfundaciones.com/category/convocatorias/', 'Portal Especializado', 'Agregador'),
  ('Dilu Consultores - Boletines', 'https://diluconsultores.com/boletines-informativos/', 'Consultora', 'Boletín'),
  ('Algalia', 'https://algalia.com/es/axudas/', 'Buscador', 'Buscador Especializado'),
  ('Axudas.gal', 'https://axudas.gal/es/buscar', 'Buscador Oficial', 'Buscador Galicia'),
  ('Administración General del Estado', 'https://administracion.gob.es/pag_Home/atencionCiudadana/Actualidad-por-Ministerios.html', 'Portal Oficial', 'Actualidad Ministerios'),
  ('BOE - Buscador de Ayudas', 'https://www.boe.es/buscar/ayudas.php', 'Boletín Oficial', 'Buscador Oficial'),
  ('Xunta de Galicia - Consejos de Gobierno', 'https://www.xunta.gal/consellos-de-goberno', 'Portal Oficial', 'Acuerdos Gobierno'),
  ('Compromiso RSE', 'https://www.compromisorse.com/', 'Portal RSE', 'Responsabilidad Social'),
  ('Xunta de Galicia - Notas de Prensa', 'https://www.xunta.gal/es/notas-de-prensa', 'Portal Oficial', 'Comunicación'),
  ('Iberley Subvenciones', 'https://www.iberley.es/subvenciones', 'Portal Jurídico', 'Base de Datos'),
  ('Fundaciones.org - Convocatorias', 'https://www.fundaciones.org/es/sector-fundacional/convocatorias-y-ayudas', 'Asociación', 'Sector Fundacional');