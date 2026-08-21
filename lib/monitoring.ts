import crypto from 'node:crypto';
import { db } from '@/lib/db';

export type WatchFrequency = 'HOURLY' | 'DAILY' | 'WEEKLY';

export type WatchDefinition = {
  caseId: string;
  targetEntityId?: string;
  name: string;
  frequency: WatchFrequency;
  connectorIds: string[];
  enabled: boolean;
};

export function hashEvidence(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function createWatch(orgId: string, watch: WatchDefinition) {
  const existing = await db.watch.findFirst({
    where: { organizationId: orgId, caseId: watch.caseId, name: watch.name },
  });
  if (existing) return existing;

  return db.watch.create({
    data: {
      organizationId: orgId,
      caseId: watch.caseId,
      targetEntityId: watch.targetEntityId,
      name: watch.name,
      frequency: watch.frequency,
      connectorIds: watch.connectorIds,
      enabled: watch.enabled,
      nextRunAt: new Date(),
    },
  });
}

export async function diffWatchEvidence(orgId: string, caseId: string, watchId: string, content: string) {
  const hash = hashEvidence(content);
  const previous = await db.watchSnapshot.findFirst({
    where: { organizationId: orgId, caseId, watchId },
    orderBy: { capturedAt: 'desc' },
  });

  const changed = !previous || previous.contentHash !== hash;

  const snapshot = await db.watchSnapshot.create({
    data: { organizationId: orgId, caseId, watchId, contentHash: hash, content },
  });

  if (changed && previous) {
    await db.watchEvent.create({
      data: {
        organizationId: orgId,
        caseId,
        watchId,
        eventType: 'CONTENT_CHANGED',
        severity: 'MEDIUM',
        previousHash: previous.contentHash,
        currentHash: hash,
      },
    });
  }

  return { changed, snapshotId: snapshot.id };
}
