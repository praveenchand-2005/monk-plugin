import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';

export async function GET() {
  try {
    const { organizationId } = await getRequestContext();
    if (!organizationId) return NextResponse.json({ ok: false, error: 'Organization context is required' }, { status: 401 });
    const cases = await db.investigationCase.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { targets: true },
    });
    return NextResponse.json({ ok: true, cases });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Case lookup failed' }, { status: 400 });
  }
}
