import type { AuthResponse, User } from '../types';
import { isAdminPortal } from './portal';

export type AuthPortal = 'admin' | 'user';

export function getAuthPortal(): AuthPortal {
  return isAdminPortal() ? 'admin' : 'user';
}

function storageKeys(portal: AuthPortal) {
  return {
    token: `traffic_token_${portal}`,
    refresh: `traffic_refresh_${portal}`,
    user: `traffic_user_${portal}`,
    remember: `traffic_remember_${portal}`,
    savedEmail: `traffic_remember_email_${portal}`,
  };
}

const LEGACY = {
  token: 'traffic_token',
  refresh: 'traffic_refresh',
  user: 'traffic_user',
};

function roleMatchesPortal(role: User['role'], portal: AuthPortal): boolean {
  if (portal === 'admin') return role === 'admin';
  return role === 'police' || role === 'driver';
}

export function isRememberMeEnabled(portal: AuthPortal = getAuthPortal()): boolean {
  return localStorage.getItem(storageKeys(portal).remember) === '1';
}

function getSessionStorage(portal: AuthPortal = getAuthPortal()): Storage {
  return isRememberMeEnabled(portal) ? localStorage : sessionStorage;
}

export function getSavedLoginEmail(portal: AuthPortal = getAuthPortal()): string {
  if (!isRememberMeEnabled(portal)) return '';
  return localStorage.getItem(storageKeys(portal).savedEmail) ?? '';
}

function persistRememberPreference(remember: boolean, email: string, portal: AuthPortal): void {
  const k = storageKeys(portal);
  localStorage.setItem(k.remember, remember ? '1' : '0');
  if (remember && email) {
    localStorage.setItem(k.savedEmail, email);
  } else {
    localStorage.removeItem(k.savedEmail);
  }
}

function readFromStorage(storage: Storage, portal: AuthPortal) {
  const k = storageKeys(portal);
  const token = storage.getItem(k.token);
  const refresh = storage.getItem(k.refresh);
  const userJson = storage.getItem(k.user);
  if (!token || !userJson) return null;
  try {
    return { token, refresh, user: JSON.parse(userJson) as User };
  } catch {
    return null;
  }
}

function writeToStorage(
  storage: Storage,
  response: AuthResponse,
  portal: AuthPortal,
): void {
  const k = storageKeys(portal);
  storage.setItem(k.token, response.access);
  if (response.refresh) storage.setItem(k.refresh, response.refresh);
  storage.setItem(k.user, JSON.stringify(response.user));
}

function clearStorageKeys(storage: Storage, portal: AuthPortal): void {
  const k = storageKeys(portal);
  storage.removeItem(k.token);
  storage.removeItem(k.refresh);
  storage.removeItem(k.user);
}

export function loadAuthSession(portal: AuthPortal = getAuthPortal()): {
  token: string;
  refresh: string | null;
  user: User;
} | null {
  const k = storageKeys(portal);

  if (localStorage.getItem(k.remember) === null) {
    const legacyToken = localStorage.getItem(LEGACY.token);
    const legacyUser = localStorage.getItem(LEGACY.user);
    if (legacyToken && legacyUser) {
      try {
        const user = JSON.parse(legacyUser) as User;
        if (roleMatchesPortal(user.role, portal)) {
          localStorage.setItem(k.remember, '1');
          return readFromStorage(localStorage, portal) ?? {
            token: legacyToken,
            refresh: localStorage.getItem(LEGACY.refresh),
            user,
          };
        }
      } catch {
        clearLegacyAuthStorage();
      }
    }
  }

  const primary = getSessionStorage(portal);
  let session = readFromStorage(primary, portal);
  if (session) return session;

  const fallback = primary === localStorage ? sessionStorage : localStorage;
  session = readFromStorage(fallback, portal);
  if (session) {
    writeToStorage(primary, {
      access: session.token,
      refresh: session.refresh ?? '',
      user: session.user,
    }, portal);
    clearStorageKeys(fallback, portal);
  }
  return session;
}

export function saveAuthSession(
  response: AuthResponse,
  remember = true,
  portal: AuthPortal = getAuthPortal(),
): void {
  const email = response.user.email;
  persistRememberPreference(remember, email, portal);

  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  writeToStorage(target, response, portal);
  clearStorageKeys(other, portal);
}

export function saveAuthUser(user: User, portal: AuthPortal = getAuthPortal()): void {
  getSessionStorage(portal).setItem(storageKeys(portal).user, JSON.stringify(user));
}

function readTokenFromStorages(portal: AuthPortal, key: 'token' | 'refresh'): string | null {
  const k = storageKeys(portal);
  const storageKey = key === 'token' ? k.token : k.refresh;
  const primary = getSessionStorage(portal);
  const fromPrimary = primary.getItem(storageKey);
  if (fromPrimary) return fromPrimary;
  const fallback = primary === localStorage ? sessionStorage : localStorage;
  return fallback.getItem(storageKey);
}

export function getAccessToken(portal: AuthPortal = getAuthPortal()): string | null {
  return readTokenFromStorages(portal, 'token');
}

export function isAuthenticated(portal: AuthPortal = getAuthPortal()): boolean {
  return Boolean(getAccessToken(portal));
}

export function getRefreshToken(portal: AuthPortal = getAuthPortal()): string | null {
  return readTokenFromStorages(portal, 'refresh');
}

export function setAccessToken(token: string, portal: AuthPortal = getAuthPortal()): void {
  getSessionStorage(portal).setItem(storageKeys(portal).token, token);
}

export function clearAuthSession(portal: AuthPortal = getAuthPortal()): void {
  clearStorageKeys(localStorage, portal);
  clearStorageKeys(sessionStorage, portal);
  const k = storageKeys(portal);
  localStorage.removeItem(k.remember);
  localStorage.removeItem(k.savedEmail);
}

export function clearLegacyAuthStorage(): void {
  localStorage.removeItem(LEGACY.token);
  localStorage.removeItem(LEGACY.refresh);
  localStorage.removeItem(LEGACY.user);
}
