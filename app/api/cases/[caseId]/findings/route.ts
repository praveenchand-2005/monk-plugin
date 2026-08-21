import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const decisionSchema = z.object({
  findingId: z.string().min(1),
  status: z.enum(['VERIFIED', 'REJECTED', 'CANDIDATE']),
});

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const findings = await db.finding.findMany({
    where: { caseId },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ ok: true, findings });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  try {
    const body = decisionSchema.parse(await request.json());
    const finding = await db.finding.findFirst({ where: { id: body.findingId, caseId } });
    if (!finding) return NextResponse.json({ ok: false, error: 'Finding not found for case' }, { status: 404 });

    const updated = await db.finding.update({
      where: { id: finding.id },
      data: { status: body.status },
    });

    const investigationCase = await db.investigationCase.findUnique({ where: { id: caseId }, select: { organizationId: true } });
    if (investigationCase) {
      await db.auditEvent.create({
        data: {
          organizationId: investigationCase.organizationId,
          caseId,
          action: 'finding.status.changed',
          metadata: { findingId: finding.id, from: finding.status, to: body.status },
        },
      });
    }

    return NextResponse.json({ ok: true, finding: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Finding update failed' }, { status: 400 });
  }
}
