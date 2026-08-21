import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { getConnector } from '@/lib/connectors';
import { emitWatchAlert } from '@/lib/notifications';
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

  const results: Array<{ watchId: string; changed: boolean; warning?: string; alertDelivered?: boolean }> = [];

  for (const watch of watches) {
    let changed = false;
    let warning: string | undefined;
    let alertDelivered = false;
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
        const event = await db.watchEvent.create({
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
        const alert = await emitWatchAlert({
          organizationId: watch.organizationId,
          caseId: watch.caseId,
          watchId: watch.id,
          eventId: event.id,
          eventType: event.eventType,
          severity: event.severity,
          message: `Watch "${watch.name}" detected a source change for ${entity.canonical}.`,
          createdAt: event.createdAt.toISOString(),
        });
        alertDelivered = alert.delivered;
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Watch execution failed';
      const event = await db.watchEvent.create({
        data: {
          organizationId: watch.organizationId,
          caseId: watch.caseId,
          watchId: watch.id,
          eventType: 'EXECUTION_ERROR',
          severity: 'HIGH',
        },
      });
      try {
        const alert = await emitWatchAlert({
          organizationId: watch.organizationId,
          caseId: watch.caseId,
          watchId: watch.id,
          eventId: event.id,
          eventType: event.eventType,
          severity: event.severity,
          message: `Watch "${watch.name}" failed: ${warning}`,
          createdAt: event.createdAt.toISOString(),
        });
        alertDelivered = alert.delivered;
      } catch {
        // Preserve the watch execution result even when an external alert sink is unavailable.
      }
    }

    await db.watch.update({ where: { id: watch.id }, data: { lastRunAt: now, nextRunAt: nextRun(watch.frequency, now) } });
    await db.auditEvent.create({
      data: {
        organizationId: watch.organizationId,
        caseId: watch.caseId,
        action: 'watch.executed',
        metadata: { watchId: watch.id, changed, warning, alertDelivered },
      },
    });
    results.push({ watchId: watch.id, changed, warning, alertDelivered });
  }

  return NextResponse.json({ ok: true, executed: results.length, results });
}
