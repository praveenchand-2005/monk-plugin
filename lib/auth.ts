import { NextRequest } from 'next/server';

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'ANALYST' | 'REVIEWER' | 'VIEWER';
};

/**
 * Development-safe auth boundary. Production deployments must replace this
 * adapter with the organization's OIDC/SSO session verifier.
 */
export function getAuthContext(request: NextRequest): AuthContext {
  const userId = request.headers.get('x-eip-user-id')?.trim() || process.env.DEV_USER_ID || 'dev-user';
  const organizationId = request.headers.get('x-eip-org-id')?.trim() || process.env.DEV_ORG_ID || 'dev-org';
  const role = (request.headers.get('x-eip-role')?.trim() || process.env.DEV_ROLE || 'ADMIN') as AuthContext['role'];

  if (!['OWNER', 'ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER'].includes(role)) {
    throw new Error('Invalid role');
  }

  return { userId, organizationId, role };
}

export function requireRole(ctx: AuthContext, roles: AuthContext['role'][]) {
  if (!roles.includes(ctx.role)) throw new Error('Insufficient permissions');
}
