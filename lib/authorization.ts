import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/auth';

export async function assertCaseAccess(ctx: AuthContext, caseId: string) {
  const investigationCase = await db.investigationCase.findFirst({
    where: { id: caseId, organizationId: ctx.organizationId },
    select: { id: true, organizationId: true, status: true },
  });
  if (!investigationCase) throw new Error('Case not found');
  return investigationCase;
}

export function canWriteCase(role: AuthContext['role']) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST' || role === 'REVIEWER';
}

export function canReviewFindings(role: AuthContext['role']) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'REVIEWER';
}
