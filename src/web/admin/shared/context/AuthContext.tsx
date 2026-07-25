import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
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

  const login = useCallback(async (
    email: string,
    password: string,
    options?: LoginOptions,
    remember = false,
  ) => {
    const response = await authAPI.login(email, password, options);
    setSession(response, remember);
    return response.user;
  }, [setSession]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, setSession, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Prefer React context from AuthProvider.
 * Fall back to the Zustand auth store when context is missing (common during Vite HMR
 * when AuthContext.tsx remounts with a new createContext identity).
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const updateUser = useAuthStore((s) => s.updateUser);

  const login = useCallback(async (
    email: string,
    password: string,
    options?: LoginOptions,
    remember = false,
  ) => {
    const response = await authAPI.login(email, password, options);
    setSession(response, remember);
    return response.user;
  }, [setSession]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    clearSession();
  }, [clearSession]);

  if (ctx) return ctx;

  return {
    user,
    token,
    isLoading,
    login,
    setSession,
    logout,
    updateUser,
  };
}

export { useAuthStore };
