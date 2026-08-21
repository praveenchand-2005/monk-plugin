import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    const caseId = new URL(request.url).searchParams.get('caseId');
    if (!caseId) return NextResponse.json({ ok: false, error: 'caseId is required' }, { status: 400 });
    const events = await db.watchEvent.findMany({
      where: { organizationId: ctx.organizationId, caseId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { watch: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Watch events access denied' }, { status: 403 });
  }
}
