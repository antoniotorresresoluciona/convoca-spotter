import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser, isAuthenticated, getCurrentUser, logoutAdmin } from '@/lib/authApi';

interface AuthContextType {
  user: AdminUser | null;
  isAuth: boolean;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  const checkAuth = () => {
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);
    if (authenticated) {
      setUser(getCurrentUser());
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = () => {
    logoutAdmin();
    setUser(null);
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuth, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
