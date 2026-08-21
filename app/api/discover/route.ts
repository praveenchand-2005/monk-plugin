import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildDiscoveryQueries, runDiscoveryQueries } from '@/lib/discovery';
import type { TargetKind } from '@/lib/connectors/types';

const schema = z.object({
  caseId: z.string().min(1),
  target: z.string().trim().min(1).max(500),
  targetKind: z.enum(['person', 'company', 'email', 'phone', 'username', 'domain', 'url', 'ip', 'address', 'custom']).default('person'),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const investigationCase = await db.investigationCase.findUnique({ where: { id: body.caseId } });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    const queries = buildDiscoveryQueries(body.target, body.targetKind as TargetKind);
    const results = await runDiscoveryQueries(queries);

    const evidence = await db.$transaction(results.map((result) => db.evidence.create({
      data: {
        caseId: body.caseId,
        sourceType: 'discovery-result',
        sourceUrl: result.url,
        sourceRef: result.provider,
        title: result.title,
        content: result.snippet,
        metadata: { provider: result.provider, retrievedAt: result.retrievedAt },
      },
    })));

    await db.auditEvent.create({
      data: {
        organizationId: investigationCase.organizationId,
        caseId: body.caseId,
        action: 'discovery.completed',
        metadata: { target: body.target, targetKind: body.targetKind, queryCount: queries.length, resultCount: results.length },
      },
    });

    return NextResponse.json({ ok: true, target: body.target, targetKind: body.targetKind, queries, results, evidenceCount: evidence.length, providerConfigured: Boolean(process.env.DISCOVERY_SEARCH_URL) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Discovery failed' }, { status: 400 });
  }
}
