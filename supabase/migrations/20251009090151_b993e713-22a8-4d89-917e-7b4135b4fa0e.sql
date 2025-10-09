-- Extender tabla change_history con nuevos campos
ALTER TABLE public.change_history
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Crear tabla para usuarios admin
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy para que solo service role pueda leer admin_users
CREATE POLICY "Service role can read admin users"
ON public.admin_users
FOR SELECT
TO service_role
USING (true);

-- Insertar usuario admin inicial (password: admin123)
-- Hash bcrypt de "admin123": $2a$10$rX8P9qW7yF3nYZGvK5YJyOqKp5Q8xV1XqU2.nHzYvL8FGhE6YVMCK
INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', '$2a$10$rX8P9qW7yF3nYZGvK5YJyOqKp5Q8xV1XqU2.nHzYvL8FGhE6YVMCK')
ON CONFLICT (username) DO NOTHING;

-- Crear índices para optimizar queries del Kanban
CREATE INDEX IF NOT EXISTS idx_change_history_status ON public.change_history(status);
CREATE INDEX IF NOT EXISTS idx_change_history_priority ON public.change_history(priority);
CREATE INDEX IF NOT EXISTS idx_change_history_detected_at ON public.change_history(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_source_type ON public.change_history(source_type);

-- Actualizar registros existentes con source_type basado en fundacion_id
UPDATE public.change_history
SET source_type = 'fundacion'
WHERE fundacion_id IS NOT NULL AND source_type IS NULL;