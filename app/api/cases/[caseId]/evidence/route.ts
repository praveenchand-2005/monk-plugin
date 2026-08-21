import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';
import { assertCaseAccess } from '@/lib/authorization';

export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const ctx = getAuthContext(request);
    const { caseId } = await params;
    await assertCaseAccess(ctx, caseId);
    const evidence = await db.evidence.findMany({
      where: { caseId },
      orderBy: { retrievedAt: 'desc' },
      select: {
        id: true,
        sourceType: true,
        sourceUrl: true,
        sourceRef: true,
        title: true,
        contentHash: true,
        retrievedAt: true,
        metadata: true,
        content: true,
      },
    });
    return NextResponse.json({ ok: true, evidence });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Evidence access denied' }, { status: 403 });
  }
}
