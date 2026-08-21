import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCaseAccess } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  try {
    await requireCaseAccess(request, caseId);
    const [entities, relationships] = await Promise.all([
      db.entity.findMany({ where: { caseId }, orderBy: { confidence: 'desc' } }),
      db.relationship.findMany({
        where: { caseId },
        include: { fromEntity: true, toEntity: true },
        orderBy: { confidence: 'desc' },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      graph: {
        nodes: entities.map((entity) => ({ id: entity.id, type: entity.type, label: entity.canonical, confidence: entity.confidence, verified: entity.verified })),
        edges: relationships.map((relationship) => ({ id: relationship.id, source: relationship.fromEntityId, target: relationship.toEntityId, type: relationship.type, confidence: relationship.confidence, evidenceIds: relationship.evidenceIds })),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Graph access failed' }, { status: 403 });
  }
}
