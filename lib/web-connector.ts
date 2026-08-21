import type { Connector, ConnectorContext, ConnectorResult } from '@/lib/connector-sdk';

export const webPageConnector: Connector = {
  id: 'public-web-page',
  name: 'Public Web Page',
  description: 'Fetches a user-supplied public HTTPS URL and preserves retrieval metadata.',
  supports: ['url'],
  async collect(ctx: ConnectorContext): Promise<ConnectorResult> {
    const value = ctx.target.trim();
    if (!/^https:\/\//i.test(value)) return { connector: 'public-web-page', items: [] };
    const response = await fetch(value, { signal: ctx.signal, headers: { 'user-agent': 'EnterpriseIntelligence/0.1' } });
    if (!response.ok) throw new Error(`Web connector returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'unknown';
    const text = (await response.text()).slice(0, 200_000);
    return { connector: 'public-web-page', items: [{ sourceType: 'public-web', sourceUrl: value, title: value, content: text, metadata: { contentType, httpStatus: response.status } }] };
  },
};
