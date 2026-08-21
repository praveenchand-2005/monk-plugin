import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { scoreIdentityCandidates } from '@/lib/identity-resolution';
import type { TargetKind } from '@/lib/connectors/types';

const schema = z.object({
  caseId: z.string().min(1),
  target: z.string().trim().min(1).max(500),
  targetKind: z.enum(['person', 'company', 'email', 'phone', 'username', 'domain', 'url', 'ip', 'address', 'custom']).default('person'),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const investigationCase = await db.investigationCase.findUnique({ where: { id: body.caseId } });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    const [entities, evidence] = await Promise.all([
      db.entity.findMany({ where: { caseId: body.caseId }, select: { id: true, canonical: true, type: true } }),
      db.evidence.findMany({ where: { caseId: body.caseId }, select: { content: true, sourceType: true, sourceUrl: true } }),
    ]);

    const candidates = scoreIdentityCandidates(body.target, body.targetKind as TargetKind, entities, evidence);

    await db.auditEvent.create({
      data: {
        organizationId: investigationCase.organizationId,
        caseId: body.caseId,
        action: 'identity.resolution.completed',
        metadata: { target: body.target, targetKind: body.targetKind, candidateCount: candidates.length },
      },
    });

    return NextResponse.json({ ok: true, target: body.target, targetKind: body.targetKind, candidates });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Identity resolution failed' }, { status: 400 });
  }
}
