import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Landmark, Search, LogOut, LayoutDashboard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/fundaciones', label: 'Fundaciones', icon: Heart },
    { path: '/admin/entes-publicos', label: 'Entes Públicos', icon: Landmark },
    { path: '/admin/otras-fuentes', label: 'Otras Fuentes', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">Admin - Monitor de Convocatorias</h1>
            <nav className="hidden md:flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={isActive ? 'bg-gradient-primary' : ''}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Ver Kanban
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden border-b bg-card">
        <div className="container mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={`whitespace-nowrap ${isActive ? 'bg-gradient-primary' : ''}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
