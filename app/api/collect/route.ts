import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getConnector } from '@/lib/connectors';
import type { TargetKind } from '@/lib/connector-sdk';

const schema = z.object({
  caseId: z.string().min(1),
  connectorId: z.string().min(1),
  target: z.object({ kind: z.string(), value: z.string().min(1).max(500) }),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const investigationCase = await db.investigationCase.findUnique({ where: { id: body.caseId } });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    const connector = getConnector(body.connectorId);
    if (!connector.supports(body.target.kind as TargetKind)) {
      return NextResponse.json({ ok: false, error: 'Connector does not support this target type' }, { status: 400 });
    }

    const result = await connector.collect({
      caseId: body.caseId,
      target: { kind: body.target.kind as TargetKind, value: body.target.value },
    });

    const evidence = await db.$transaction(
      result.records.map((record) => db.evidence.create({
        data: {
          caseId: body.caseId,
          sourceType: record.sourceType,
          sourceUrl: record.sourceUrl,
          sourceRef: record.sourceRef,
          title: record.title,
          content: record.content,
          metadata: record.metadata as any,
        },
      })),
    );

    await db.auditEvent.create({
      data: {
        organizationId: investigationCase.organizationId,
        caseId: body.caseId,
        action: 'evidence.collected',
        metadata: { connectorId: body.connectorId, count: evidence.length, warnings: result.warnings },
      },
    });

    return NextResponse.json({ ok: true, connector: connector.id, evidence, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Collection failed' }, { status: 400 });
  }
}
