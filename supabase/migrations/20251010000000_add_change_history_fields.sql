-- Agregar campos adicionales necesarios para el sistema Kanban
-- Solo se agregan si no existen para evitar errores en migraciones repetidas

-- Agregar change_type si no existe
ALTER TABLE public.change_history
ADD COLUMN IF NOT EXISTS change_type TEXT DEFAULT 'content_change';

-- Agregar old_value y new_value si no existen
ALTER TABLE public.change_history
ADD COLUMN IF NOT EXISTS old_value TEXT,
ADD COLUMN IF NOT EXISTS new_value TEXT;

-- Agregar referencias a entes públicos y otras fuentes si no existen
ALTER TABLE public.change_history
ADD COLUMN IF NOT EXISTS ente_publico_id UUID REFERENCES public.entes_publicos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS otra_fuente_id UUID REFERENCES public.otras_fuentes(id) ON DELETE CASCADE;

-- Modificar fundacion_id para que sea nullable (ya que ahora puede venir de otras fuentes)
ALTER TABLE public.change_history
ALTER COLUMN fundacion_id DROP NOT NULL;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_change_history_ente_publico ON public.change_history(ente_publico_id);
CREATE INDEX IF NOT EXISTS idx_change_history_otra_fuente ON public.change_history(otra_fuente_id);
CREATE INDEX IF NOT EXISTS idx_change_history_change_type ON public.change_history(change_type);

-- Actualizar valores source_type para registros existentes
UPDATE public.change_history
SET source_type = CASE
  WHEN ente_publico_id IS NOT NULL THEN 'ente_publico'
  WHEN otra_fuente_id IS NOT NULL THEN 'otra_fuente'
  WHEN fundacion_id IS NOT NULL THEN 'fundacion'
  ELSE source_type
END
WHERE source_type IS NULL;
