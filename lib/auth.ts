import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'ANALYST' | 'REVIEWER' | 'VIEWER';
};

const ROLES: AuthContext['role'][] = ['OWNER', 'ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER'];

/**
 * Identity boundary for the application.
 *
 * Development: x-eip-user-id / x-eip-org-id / x-eip-role or DEV_* values.
 * Production: the app must sit behind a trusted identity proxy/SSO layer that
 * strips client-supplied x-eip-* headers and injects verified identity values.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const production = process.env.NODE_ENV === 'production';
  const trustedProxy = process.env.EIP_TRUSTED_IDENTITY_PROXY === 'true';

  if (production && !trustedProxy) {
    throw new Error('Production authentication is not configured: enable the trusted identity proxy/SSO adapter');
  }

  const userId = request.headers.get('x-eip-user-id')?.trim() || process.env.DEV_USER_ID || 'dev-user';
  const organizationId = request.headers.get('x-eip-org-id')?.trim() || process.env.DEV_ORG_ID || 'dev-org';
  const requestedRole = request.headers.get('x-eip-role')?.trim() || process.env.DEV_ROLE || 'ADMIN';

  if (!ROLES.includes(requestedRole as AuthContext['role'])) throw new Error('Invalid role');
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });

  if (!membership) throw new Error('User is not a member of the organization');

  return { userId, organizationId, role: membership.role };
}

export function requireRole(ctx: AuthContext, roles: AuthContext['role'][]) {
  if (!roles.includes(ctx.role)) throw new Error('Insufficient permissions');
}

export async function requireCaseAccess(request: NextRequest, caseId: string, roles?: AuthContext['role'][]) {
  const ctx = await getAuthContext(request);
  const investigationCase = await db.investigationCase.findFirst({
    where: { id: caseId, organizationId: ctx.organizationId },
    select: { id: true, organizationId: true },
  });
  if (!investigationCase) throw new Error('Case not found');
  if (roles) requireRole(ctx, roles);
  return ctx;
}
