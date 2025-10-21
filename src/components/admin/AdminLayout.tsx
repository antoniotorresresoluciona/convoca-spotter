import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Landmark, Search, LogOut, LayoutDashboard, Eye, KanbanSquare, Link2 } from 'lucide-react';
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
    { path: '/admin/kanban', label: 'Kanban', icon: KanbanSquare },
    { path: '/admin/fundaciones', label: 'Fundaciones', icon: Heart },
    { path: '/admin/entes-publicos', label: 'Entes Públicos', icon: Landmark },
    { path: '/admin/otras-fuentes', label: 'Otras Fuentes', icon: Search },
    { path: '/admin/sublinks', label: 'Subenlaces', icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-semibold text-black">
                Monitor de Convocatorias
              </h1>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-black border-b-2 border-black'
                            : 'text-neutral-600 hover:text-black'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-600 hover:text-black hover:bg-neutral-100"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Pública
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-neutral-600 hover:text-black hover:bg-neutral-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="lg:hidden bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-black bg-neutral-100'
                        : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
