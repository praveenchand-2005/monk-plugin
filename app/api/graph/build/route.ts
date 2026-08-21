import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildRelationshipCandidates } from '@/lib/relationship-builder';

const schema = z.object({ caseId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { caseId } = schema.parse(await request.json());
    const investigationCase = await db.investigationCase.findUnique({ where: { id: caseId } });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    const [entities, evidence] = await Promise.all([
      db.entity.findMany({ where: { caseId }, select: { id: true, canonical: true, type: true } }),
      db.evidence.findMany({ where: { caseId }, select: { id: true, content: true } }),
    ]);

    const candidates = buildRelationshipCandidates(entities, evidence);
    let created = 0;
    for (const relationship of candidates) {
      const exists = await db.relationship.findFirst({
        where: {
          caseId,
          fromEntityId: relationship.fromEntityId,
          toEntityId: relationship.toEntityId,
          type: relationship.type,
        },
      });
      if (exists) {
        await db.relationship.update({
          where: { id: exists.id },
          data: { confidence: relationship.confidence, evidenceIds: relationship.evidenceIds },
        });
        continue;
      }
      await db.relationship.create({
        data: {
          caseId,
          fromEntityId: relationship.fromEntityId,
          toEntityId: relationship.toEntityId,
          type: relationship.type,
          confidence: relationship.confidence,
          evidenceIds: relationship.evidenceIds,
        },
      });
      created += 1;
    }

    await db.auditEvent.create({
      data: {
        organizationId: investigationCase.organizationId,
        caseId,
        action: 'graph.relationships.built',
        metadata: { candidates: candidates.length, created },
      },
    });

    return NextResponse.json({ ok: true, candidates: candidates.length, created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Graph build failed' }, { status: 400 });
  }
}
