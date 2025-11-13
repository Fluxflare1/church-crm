// types/users.ts

import type { UserRole } from './auth';

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  roles: UserRole[];
  password: string;
}

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  roles?: UserRole[];
  isActive?: boolean;
  password?: string;
}
