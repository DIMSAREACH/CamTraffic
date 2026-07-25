import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@camtraffic/store';
import { AUTH_SESSION_EXPIRED } from '@camtraffic/store';
import type { User, AuthResponse, LoginOptions } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, options?: LoginOptions, remember?: boolean) => Promise<User>;
  setSession: (response: AuthResponse, remember?: boolean) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    const onSessionExpired = () => clearSession();
    window.addEventListener(AUTH_SESSION_EXPIRED, onSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED, onSessionExpired);
  }, [clearSession]);

  const login = async (
    email: string,
    password: string,
    options?: LoginOptions,
    remember = false,
  ) => {
    const response = await authAPI.login(email, password, options);
    setSession(response, remember);
    return response.user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, setSession, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { useAuthStore };
