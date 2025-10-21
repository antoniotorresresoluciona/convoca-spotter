-- Script para crear el usuario admin en Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase

-- Crear la tabla admin_users si no existe
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Service role can read admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;

-- Crear políticas para service role
CREATE POLICY "Service role can read admin users"
ON public.admin_users
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can manage admin users"
ON public.admin_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Eliminar usuario admin si existe
DELETE FROM public.admin_users WHERE username = 'admin';

-- Insertar usuario admin
-- Usuario: admin
-- Contraseña: admin123
-- Hash bcrypt generado: $2a$10$rX8P9qW7yF3nYZGvK5YJyOqKp5Q8xV1XqU2.nHzYvL8FGhE6YVMCK
INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', '$2a$10$rX8P9qW7yF3nYZGvK5YJyOqKp5Q8xV1XqU2.nHzYvL8FGhE6YVMCK');

-- Verificar que se creó correctamente
SELECT id, username, created_at FROM public.admin_users WHERE username = 'admin';
