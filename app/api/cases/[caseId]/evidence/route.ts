import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
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
}
