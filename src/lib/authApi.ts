// Usar la URL del navegador si estamos en el cliente, sino usar la variable de entorno
const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (import.meta.env.VITE_SUPABASE_URL || 'http://localhost:3000');

export interface AdminUser {
  id: string;
  username: string;
  created_at: string;
}

const AUTH_TOKEN_KEY = 'admin_auth_token';
const AUTH_USER_KEY = 'admin_user';

export async function loginAdmin(username: string, password: string): Promise<AdminUser> {
  try {
    const response = await fetch(`${API_URL}/rest/v1/rpc/login_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || 'Usuario o contraseña incorrectos');
    }

    const user = result.data;

    // Create session
    const token = btoa(JSON.stringify({ id: user.id, username: user.username, timestamp: Date.now() }));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: user.id, username: user.username, created_at: user.created_at }));

    return user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error al iniciar sesión');
  }
}

export async function registerAdmin(username: string, password: string): Promise<AdminUser> {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al registrar usuario');
    }

    return result.user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error al registrar usuario');
  }
}

export function logoutAdmin(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getCurrentUser(): AdminUser | null {
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  const user = getCurrentUser();
  return !!(token && user);
}
