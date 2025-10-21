import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MaintenanceGuard } from "./components/MaintenanceGuard";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminDashboard from "./pages/AdminDashboard";
import AdminFundaciones from "./pages/AdminFundaciones";
import AdminEntes from "./pages/AdminEntes";
import AdminOtrasFuentes from "./pages/AdminOtrasFuentes";
import AdminKanban from "./pages/AdminKanban";
import AdminSublinks from "./pages/AdminSublinks";
import PublicKanban from "./pages/PublicKanban";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

// Flag de mantenimiento - Cambiar a false para volver a la app normal
// O usar variable de entorno: VITE_MAINTENANCE_MODE=false
// En modo mantenimiento, solo admins logueados pueden acceder
export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true' || true;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Login siempre accesible (necesario para que admins puedan entrar) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />

            {/* Todas las demás rutas protegidas por MaintenanceGuard */}
            <Route path="/" element={<MaintenanceGuard><Index /></MaintenanceGuard>} />
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin/dashboard"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            <Route
              path="/admin/fundaciones"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminFundaciones />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            <Route
              path="/admin/entes-publicos"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminEntes />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            <Route
              path="/admin/otras-fuentes"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminOtrasFuentes />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            <Route
              path="/admin/kanban"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminKanban />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            <Route
              path="/admin/sublinks"
              element={
                <MaintenanceGuard>
                  <ProtectedRoute>
                    <AdminSublinks />
                  </ProtectedRoute>
                </MaintenanceGuard>
              }
            />
            {/* Rutas públicas también protegidas en mantenimiento */}
            <Route path="/convocatorias" element={<MaintenanceGuard><PublicKanban /></MaintenanceGuard>} />
            <Route path="/tablero" element={<MaintenanceGuard><PublicKanban /></MaintenanceGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<MaintenanceGuard><NotFound /></MaintenanceGuard>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
