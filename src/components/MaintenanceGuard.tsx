import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Maintenance from "@/pages/Maintenance";
import { MAINTENANCE_MODE } from "@/App";

interface MaintenanceGuardProps {
  children: ReactNode;
}

export const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const { user, loading } = useAuth();

  // Si no está en modo mantenimiento, mostrar contenido normal
  if (!MAINTENANCE_MODE) {
    return <>{children}</>;
  }

  // Si está cargando el estado de auth, no mostrar nada todavía
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  // Si hay usuario logueado (admin), permitir acceso
  if (user) {
    return <>{children}</>;
  }

  // Si no hay usuario logueado, mostrar página de mantenimiento
  return <Maintenance />;
};
