export type UserRole = 'admin' | 'broker' | 'agent' | 'system';

export interface UserPayload {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
}

export interface TokenPayload extends UserPayload {
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type Permission = 
  | 'read:leads' | 'write:leads' | 'delete:leads'
  | 'read:policies' | 'write:policies'
  | 'read:reports' | 'write:reports'
  | 'admin:all';

export const RoleHierarchy: Record<UserRole, number> = {
  admin: 100,
  system: 90,
  broker: 50,
  agent: 10,
};

export const RolePermissions: Record<UserRole, Permission[]> = {
  admin: ['admin:all'],
  system: ['admin:all'],
  broker: ['read:leads', 'write:leads', 'read:policies', 'write:policies', 'read:reports'],
  agent: ['read:leads', 'write:leads', 'read:policies'],
};
