import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginOptions } from '../types';
import { authAPI } from '../services/api';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  saveAuthUser,
} from '@shared/utils/authStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, options?: LoginOptions, remember?: boolean) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = loadAuthSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
    options?: LoginOptions,
    remember = false,
  ) => {
    const response = await authAPI.login(email, password, options);
    setToken(response.access);
    setUser(response.user);
    saveAuthSession(response, remember);
    return response.user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    clearAuthSession();
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    saveAuthUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
