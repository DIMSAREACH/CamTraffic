/** Fired when API client clears JWT storage (expired / invalid session). */
export const AUTH_SESSION_EXPIRED = 'camtraffic:auth-session-expired';

export function notifyAuthSessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
  }
}
