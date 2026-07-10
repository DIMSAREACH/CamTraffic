import type { ApiClient } from '../client';
import type { ApiResponse, User } from '@camtraffic/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LogoutPayload {
  refresh: string;
}

export interface ForgotPasswordPayload {
  email: string;
  portal: 'admin' | 'user';
}

export interface ResetPasswordPayload {
  uid: string;
  token: string;
  new_password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface SendVerificationEmailPayload {
  portal: 'admin' | 'user';
}

export interface VerifyEmailPayload {
  uid: string;
  token: string;
}

export interface LoginData {
  user: User;
  tokens: AuthTokens;
}

/** @deprecated Use LoginData via ApiResponse */
export type LoginResponse = LoginData;

export function createAuthEndpoints(client: ApiClient) {
  return {
    login: (payload: LoginPayload) =>
      client.post<LoginData>('/api/v1/auth/login/', payload),
    refresh: (refresh: string) =>
      client.post<AuthTokens>('/api/v1/auth/refresh/', { refresh }),
    me: () => client.get<User>('/api/v1/auth/me/'),
    logout: (payload: LogoutPayload) => client.post<void>('/api/v1/auth/logout/', payload),
    forgotPassword: (payload: ForgotPasswordPayload) =>
      client.post<void>('/api/v1/auth/forgot-password/', payload),
    resetPassword: (payload: ResetPasswordPayload) =>
      client.post<void>('/api/v1/auth/reset-password/', payload),
    changePassword: (payload: ChangePasswordPayload) =>
      client.post<void>('/api/v1/auth/change-password/', payload),
    sendVerificationEmail: (payload: SendVerificationEmailPayload) =>
      client.post<void>('/api/v1/auth/verify-email/send/', payload),
    verifyEmail: (payload: VerifyEmailPayload) =>
      client.post<User>('/api/v1/auth/verify-email/', payload),
  };
}

export type AuthLoginResponse = ApiResponse<LoginData>;
export type AuthMeResponse = ApiResponse<User>;
export type AuthRefreshResponse = ApiResponse<AuthTokens>;
