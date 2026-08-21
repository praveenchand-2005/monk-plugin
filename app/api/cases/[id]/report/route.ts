import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const investigationCase = await db.investigationCase.findUnique({
      where: { id },
      include: {
        targets: true,
        evidence: { orderBy: { retrievedAt: 'asc' } },
        entities: { orderBy: { createdAt: 'asc' } },
        relationships: { orderBy: { createdAt: 'asc' } },
        findings: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      report: {
        generatedAt: new Date().toISOString(),
        case: { id: investigationCase.id, name: investigationCase.name, status: investigationCase.status, createdAt: investigationCase.createdAt, updatedAt: investigationCase.updatedAt },
        targets: investigationCase.targets,
        summary: {
          evidenceCount: investigationCase.evidence.length,
          entityCount: investigationCase.entities.length,
          relationshipCount: investigationCase.relationships.length,
          findingCount: investigationCase.findings.length,
          verifiedFindings: investigationCase.findings.filter((f) => f.status === 'VERIFIED').length,
        },
        findings: investigationCase.findings,
        entities: investigationCase.entities,
        relationships: investigationCase.relationships,
        evidence: investigationCase.evidence.map((item) => ({ id: item.id, title: item.title, sourceType: item.sourceType, sourceUrl: item.sourceUrl, sourceRef: item.sourceRef, retrievedAt: item.retrievedAt, metadata: item.metadata })),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Report generation failed' }, { status: 500 });
  }
}
