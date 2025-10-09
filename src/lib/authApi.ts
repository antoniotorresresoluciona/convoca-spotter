import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";

export interface AdminUser {
  id: string;
  username: string;
  created_at: string;
}

const AUTH_TOKEN_KEY = 'admin_auth_token';
const AUTH_USER_KEY = 'admin_user';

export async function loginAdmin(username: string, password: string): Promise<AdminUser> {
  // Get admin user
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, data.password_hash);
  
  if (!isValid) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  // Create session
  const token = btoa(JSON.stringify({ id: data.id, username: data.username, timestamp: Date.now() }));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: data.id, username: data.username }));

  return { id: data.id, username: data.username, created_at: data.created_at };
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
