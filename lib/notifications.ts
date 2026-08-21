export type AlertPayload = {
  organizationId: string;
  caseId: string;
  watchId: string;
  eventId: string;
  eventType: string;
  severity: string;
  message: string;
  createdAt: string;
};

export async function emitWatchAlert(payload: AlertPayload) {
  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return { delivered: false, reason: 'ALERT_WEBHOOK_URL is not configured' };

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'enterprise-intelligence-platform',
      type: 'watch.event',
      payload,
    }),
  });

  if (!response.ok) throw new Error(`Alert webhook returned HTTP ${response.status}`);
  return { delivered: true };
}
