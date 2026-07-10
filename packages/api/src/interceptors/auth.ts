import type { ApiClientConfig } from '../client';

export function withAuthToken(getAccessToken: () => string | null): Pick<ApiClientConfig, 'getAccessToken'> {
  return { getAccessToken };
}

export function withUnauthorizedHandler(onUnauthorized: () => void): Pick<ApiClientConfig, 'onUnauthorized'> {
  return { onUnauthorized };
}
