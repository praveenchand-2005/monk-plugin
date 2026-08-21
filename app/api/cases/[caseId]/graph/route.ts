import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
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
      nodes: entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        label: entity.canonical,
        confidence: entity.confidence,
        verified: entity.verified,
      })),
      edges: relationships.map((relationship) => ({
        id: relationship.id,
        source: relationship.fromEntityId,
        target: relationship.toEntityId,
        type: relationship.type,
        confidence: relationship.confidence,
        evidenceIds: relationship.evidenceIds,
      })),
    },
  });
}
