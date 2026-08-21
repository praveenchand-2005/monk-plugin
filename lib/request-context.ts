import { headers } from 'next/headers';

export async function getRequestContext() {
  const h = await headers();
  return {
    organizationId: h.get('x-organization-id') || process.env.DEFAULT_ORGANIZATION_ID || null,
    userId: h.get('x-user-id') || 'system',
    role: h.get('x-user-role') || 'ADMIN',
  };
}

export function requireOrganization(organizationId: string | null): string {
  if (!organizationId) throw new Error('Organization context is required');
  return organizationId;
}
