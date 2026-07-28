import type { AuthResponse, User } from '@camtraffic/types';
import { create } from 'zustand/react';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  saveAuthUser,
} from './authStorage';

function hasBrowserStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined'
      && typeof localStorage !== 'undefined'
      && localStorage != null
    );
  } catch {
    return false;
  }
}

function readInitialAuthState(): Pick<AuthState, 'user' | 'token' | 'isLoading' | 'hydrated'> {
  if (!hasBrowserStorage()) {
    return { user: null, token: null, isLoading: true, hydrated: false };
  }
  try {
    const session = loadAuthSession();
    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      isLoading: false,
      hydrated: true,
    };
  } catch {
    return { user: null, token: null, isLoading: false, hydrated: true };
  }
}

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

const initialAuth = readInitialAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isLoading: initialAuth.isLoading,
  hydrated: initialAuth.hydrated,

  hydrate: () => {
    if (useAuthStore.getState().hydrated) return;
    if (!hasBrowserStorage()) {
      set({ isLoading: false, hydrated: true });
      return;
    }
    try {
      const session = loadAuthSession();
      set({
        user: session?.user ?? null,
        token: session?.token ?? null,
        isLoading: false,
        hydrated: true,
      });
    } catch {
      set({ user: null, token: null, isLoading: false, hydrated: true });
    }
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
