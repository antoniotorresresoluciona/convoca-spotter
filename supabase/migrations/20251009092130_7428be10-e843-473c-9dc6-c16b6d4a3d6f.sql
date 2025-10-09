-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Update existing tables to use admin check
ALTER TABLE public.fundaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fundaciones"
ON public.fundaciones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage fundaciones"
ON public.fundaciones
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update entes_publicos
ALTER TABLE public.entes_publicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entes_publicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entes_publicos"
ON public.entes_publicos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage entes_publicos"
ON public.entes_publicos
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update otras_fuentes
ALTER TABLE public.otras_fuentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otras_fuentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view otras_fuentes"
ON public.otras_fuentes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage otras_fuentes"
ON public.otras_fuentes
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update change_history
ALTER TABLE public.change_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view change_history"
ON public.change_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage change_history"
ON public.change_history
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());