import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const createCaseSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  target: z.object({ kind: z.string().min(1).max(40), value: z.string().trim().min(1).max(500) }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = createCaseSchema.parse(await request.json());
    const investigationCase = await db.investigationCase.create({
      data: {
        organizationId: body.organizationId,
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
        organizationId: body.organizationId,
        caseId: investigationCase.id,
        action: 'case.created',
        metadata: { targetKind: body.target?.kind, targetProvided: Boolean(body.target) },
      },
    });

    return NextResponse.json({ ok: true, case: investigationCase }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Case creation failed' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return NextResponse.json({ ok: false, error: 'organizationId is required' }, { status: 400 });

  const cases = await db.investigationCase.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    include: { targets: true },
  });

  return NextResponse.json({ ok: true, cases });
}
