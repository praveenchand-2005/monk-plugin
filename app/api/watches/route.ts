import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';
import { assertCaseAccess, canWriteCase } from '@/lib/authorization';

const schema = z.object({
  caseId: z.string().min(1),
  targetEntityId: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  frequency: z.enum(['HOURLY', 'DAILY', 'WEEKLY']).default('DAILY'),
  connectorIds: z.array(z.string().min(1)).min(1).max(20),
  enabled: z.boolean().default(true),
});

function nextRun(frequency: 'HOURLY' | 'DAILY' | 'WEEKLY') {
  const d = new Date();
  if (frequency === 'HOURLY') d.setHours(d.getHours() + 1);
  else if (frequency === 'DAILY') d.setDate(d.getDate() + 1);
  else d.setDate(d.getDate() + 7);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const caseId = new URL(request.url).searchParams.get('caseId');
    if (!caseId) return NextResponse.json({ ok: false, error: 'caseId is required' }, { status: 400 });
    await assertCaseAccess(ctx, caseId);
    const watches = await db.watch.findMany({ where: { organizationId: ctx.organizationId, caseId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ok: true, watches });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Watch access denied' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!canWriteCase(ctx.role)) return NextResponse.json({ ok: false, error: 'Insufficient permissions' }, { status: 403 });
    const body = schema.parse(await request.json());
    await assertCaseAccess(ctx, body.caseId);
    const watch = await db.watch.create({
      data: {
        organizationId: ctx.organizationId,
        caseId: body.caseId,
        targetEntityId: body.targetEntityId,
        name: body.name,
        frequency: body.frequency,
        connectorIds: body.connectorIds,
        enabled: body.enabled,
        nextRunAt: nextRun(body.frequency),
      },
    });
    await db.auditEvent.create({ data: { organizationId: ctx.organizationId, caseId: body.caseId, userId: ctx.userId, action: 'watch.created', metadata: { watchId: watch.id, frequency: body.frequency } } });
    return NextResponse.json({ ok: true, watch }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Watch creation failed' }, { status: 400 });
  }
}
