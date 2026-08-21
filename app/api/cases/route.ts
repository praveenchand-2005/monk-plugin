import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthContext, requireRole } from '@/lib/auth';

const createCaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  target: z.object({ kind: z.string().min(1).max(40), value: z.string().trim().min(1).max(500) }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requireRole(ctx, ['OWNER', 'ADMIN', 'ANALYST']);
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
    const message = error instanceof Error ? error.message : 'Case creation failed';
    const status = /permissions|member|authentication|production/i.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    const cases = await db.investigationCase.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { targets: true },
    });
    return NextResponse.json({ ok: true, cases });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Case listing failed';
    const status = /member|authentication|production/i.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
