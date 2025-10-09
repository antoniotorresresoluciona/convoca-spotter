-- Primero eliminar el trigger que depende de la función
DROP TRIGGER IF EXISTS update_fundaciones_updated_at ON public.fundaciones;

-- Ahora eliminar la función anterior
DROP FUNCTION IF EXISTS public.update_updated_at();

-- Crear la función corregida con search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER update_fundaciones_updated_at
  BEFORE UPDATE ON public.fundaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- No podemos mover las extensiones pg_cron y pg_net ya que requieren permisos especiales
-- Las dejamos en public ya que son necesarias para el funcionamiento del sistema