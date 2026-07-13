import type { AuthResponse, User } from '@camtraffic/types';
import { create } from 'zustand';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  saveAuthUser,
} from './authStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (response: AuthResponse, remember?: boolean) => void;
  clearSession: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  hydrated: false,

  hydrate: () => {
    const session = loadAuthSession();
    set({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isLoading: false,
      hydrated: true,
    });
  },

  setSession: (response, remember = true) => {
    saveAuthSession(response, remember);
    set({ user: response.user, token: response.access, isLoading: false });
  },

  clearSession: () => {
    clearAuthSession();
    set({ user: null, token: null, isLoading: false });
  },

  updateUser: (user) => {
    saveAuthUser(user);
    set({ user });
  },
}));
