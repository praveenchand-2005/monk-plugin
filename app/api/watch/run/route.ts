import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { getConnector } from '@/lib/connectors';
import type { TargetKind } from '@/lib/connectors/types';

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function nextRun(frequency: 'HOURLY' | 'DAILY' | 'WEEKLY', from = new Date()) {
  const value = new Date(from);
  if (frequency === 'HOURLY') value.setHours(value.getHours() + 1);
  else if (frequency === 'DAILY') value.setDate(value.getDate() + 1);
  else value.setDate(value.getDate() + 7);
  return value;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const watches = await db.watch.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    include: { targetEntity: true, case: { select: { organizationId: true } } },
    orderBy: { nextRunAt: 'asc' },
    take: 25,
  });

  const results: Array<{ watchId: string; changed: boolean; warning?: string }> = [];

  for (const watch of watches) {
    let changed = false;
    let warning: string | undefined;
    try {
      const entity = watch.targetEntity;
      if (!entity) throw new Error('Watch target entity not configured');
      const connectorId = watch.connectorIds[0] || 'web-page';
      const connector = getConnector(connectorId);
      if (!connector || !connector.supports(entity.type as TargetKind)) {
        throw new Error(`Connector ${connectorId} does not support target type ${entity.type}`);
      }

      const result = await connector.collect({
        caseId: watch.caseId,
        target: { kind: entity.type as TargetKind, value: entity.canonical },
      });
      const content = JSON.stringify(result.records.map((record) => ({ sourceUrl: record.sourceUrl, content: record.content, metadata: record.metadata })));
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const previous = await db.watchSnapshot.findFirst({ where: { watchId: watch.id }, orderBy: { capturedAt: 'desc' } });
      changed = Boolean(previous && previous.contentHash !== hash);

      await db.watchSnapshot.create({
        data: {
          organizationId: watch.organizationId,
          caseId: watch.caseId,
          watchId: watch.id,
          contentHash: hash,
          content: content.slice(0, 200_000),
        },
      });

      if (changed) {
        await db.watchEvent.create({
          data: {
            organizationId: watch.organizationId,
            caseId: watch.caseId,
            watchId: watch.id,
            eventType: 'CONTENT_CHANGED',
            severity: 'MEDIUM',
            previousHash: previous?.contentHash,
            currentHash: hash,
          },
        });
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Watch execution failed';
      await db.watchEvent.create({
        data: {
          organizationId: watch.organizationId,
          caseId: watch.caseId,
          watchId: watch.id,
          eventType: 'EXECUTION_ERROR',
          severity: 'HIGH',
        },
      });
    }

    await db.watch.update({ where: { id: watch.id }, data: { lastRunAt: now, nextRunAt: nextRun(watch.frequency, now) } });
    await db.auditEvent.create({
      data: {
        organizationId: watch.organizationId,
        caseId: watch.caseId,
        action: 'watch.executed',
        metadata: { watchId: watch.id, changed, warning },
      },
    });
    results.push({ watchId: watch.id, changed, warning });
  }

  return NextResponse.json({ ok: true, executed: results.length, results });
}
