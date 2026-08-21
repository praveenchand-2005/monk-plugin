import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { extractCandidates } from '@/lib/entity-resolution';

const schema = z.object({ caseId: z.string().min(1), evidenceId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const evidence = await db.evidence.findUnique({ where: { id: body.evidenceId } });
    if (!evidence || evidence.caseId !== body.caseId) return NextResponse.json({ ok: false, error: 'Evidence not found for case' }, { status: 404 });

    const candidates = extractCandidates(evidence.content || '');
    const created = [];
    for (const candidate of candidates) {
      const existing = await db.entity.findFirst({ where: { caseId: body.caseId, type: candidate.type, canonical: candidate.canonical } });
      if (existing) continue;
      created.push(await db.entity.create({
        data: {
          caseId: body.caseId,
          type: candidate.type,
          canonical: candidate.canonical,
          confidence: candidate.confidence,
          verified: false,
        },
      }));
    }

    await db.auditEvent.create({
      data: {
        organizationId: evidence.caseId,
        caseId: body.caseId,
        action: 'entity.candidates.extracted',
        metadata: { evidenceId: body.evidenceId, created: created.length },
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, candidates, created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Resolution failed' }, { status: 400 });
  }
}
