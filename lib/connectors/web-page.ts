import crypto from 'node:crypto';
import type { Connector, ConnectorContext, ConnectorResult, TargetKind } from './types';

const SUPPORTED: TargetKind[] = ['url', 'domain'];

function normalizeUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export const webPageConnector: Connector = {
  id: 'web-page',
  name: 'Public Web Page',
  supports: (kind) => SUPPORTED.includes(kind),
  async collect({ target, signal }: ConnectorContext): Promise<ConnectorResult> {
    const url = normalizeUrl(target.value);
    const response = await fetch(url, {
      signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Enterprise-Intelligence/0.1 (+public-web-research)' },
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const clipped = text.slice(0, 100_000);
    const hash = crypto.createHash('sha256').update(clipped).digest('hex');

    return {
      connectorId: 'web-page',
      records: [{
        sourceType: 'public-web',
        sourceUrl: response.url,
        sourceRef: hash,
        title: response.url,
        content: clipped,
        metadata: {
          status: response.status,
          contentType,
          contentLength: clipped.length,
        },
      }],
      warnings: response.ok ? [] : [`Source returned HTTP ${response.status}`],
    };
  },
};
