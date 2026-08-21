import type { Connector, ConnectorContext, ConnectorResult, TargetKind } from './types';

const SUPPORTED: TargetKind[] = ['person', 'company', 'email', 'phone', 'username', 'domain', 'url', 'custom'];

export const webSearchConnector: Connector = {
  id: 'public-web-search',
  name: 'Public Web Search',
  supports: (kind) => SUPPORTED.includes(kind),
  async collect({ target }: ConnectorContext): Promise<ConnectorResult> {
    // Provider-neutral search connector boundary. A real enterprise deployment should
    // inject an approved search provider rather than scraping search-result HTML.
    const endpoint = process.env.PUBLIC_SEARCH_ENDPOINT;
    if (!endpoint) {
      return {
        connectorId: 'public-web-search',
        records: [],
        warnings: ['PUBLIC_SEARCH_ENDPOINT is not configured; discovery connector is disabled.'],
      };
    }

    const url = new URL(endpoint);
    url.searchParams.set('q', target.value);
    url.searchParams.set('limit', '10');

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        ...(process.env.PUBLIC_SEARCH_API_KEY ? { authorization: `Bearer ${process.env.PUBLIC_SEARCH_API_KEY}` } : {}),
      },
    });

    if (!response.ok) throw new Error(`Search provider returned HTTP ${response.status}`);

    const payload = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; snippet?: string }>;
    };

    return {
      connectorId: 'public-web-search',
      records: (payload.results || []).map((result) => ({
        sourceType: 'public-web-search',
        sourceUrl: result.url,
        title: result.title,
        content: result.snippet || '',
        metadata: { provider: 'configured-search-provider' },
      })),
      warnings: [],
    };
  },
};
