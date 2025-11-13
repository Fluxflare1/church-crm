// types/auth.ts

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'RM' | 'MEMBER' | 'GUEST';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  isActive: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;             // JWT or opaque token
  expiresAt: string;         // ISO string
}

export interface LoginCredentials {
  identifier: string;        // email or username
  password: string;
}

export interface LoginResponse {
  session: AuthSession;
}

export interface PasswordResetRequest {
  identifier: string;        // email/username/phone
}

export interface PasswordResetPayload {
  token: string;
  newPassword: string;
}
