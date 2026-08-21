import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    if (!['OWNER', 'ADMIN', 'REVIEWER'].includes(ctx.role)) {
      return NextResponse.json({ ok: false, error: 'Insufficient permissions' }, { status: 403 });
    }
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') || 100), 1), 500);
    const events = await db.auditEvent.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Audit access denied' }, { status: 403 });
  }
}
