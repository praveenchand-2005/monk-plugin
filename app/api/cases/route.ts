import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';

const createCaseSchema = z.object({
  name: z.string().min(1).max(200),
  target: z.object({ kind: z.string().min(1).max(40), value: z.string().trim().min(1).max(500) }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!['OWNER', 'ADMIN', 'ANALYST'].includes(ctx.role)) throw new Error('Insufficient permissions');
    const body = createCaseSchema.parse(await request.json());
    const investigationCase = await db.investigationCase.create({
      data: {
        organizationId: ctx.organizationId,
        name: body.name,
        targets: body.target ? { create: [body.target] } : undefined,
      },
      include: { targets: true },
    });

    if (body.target) {
      await db.entity.create({
        data: {
          caseId: investigationCase.id,
          type: body.target.kind,
          canonical: body.target.value.toLowerCase(),
          confidence: 100,
          verified: false,
        },
      });
    }

    await db.auditEvent.create({
      data: {
        organizationId: ctx.organizationId,
        caseId: investigationCase.id,
        userId: ctx.userId,
        action: 'case.created',
        metadata: { targetKind: body.target?.kind, targetProvided: Boolean(body.target) },
      },
    });

    return NextResponse.json({ ok: true, case: investigationCase }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Case creation failed' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const cases = await db.investigationCase.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { targets: true },
    });
    return NextResponse.json({ ok: true, cases });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Case listing failed' }, { status: 400 });
  }
}
