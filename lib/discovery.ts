import type { TargetKind } from '@/lib/connectors/types';

export type DiscoveryQuery = {
  query: string;
  purpose: string;
  targetKind: TargetKind;
};

export type DiscoveryResult = {
  title: string;
  url: string;
  snippet: string;
  provider: string;
  retrievedAt: string;
};

export function buildDiscoveryQueries(target: string, kind: TargetKind): DiscoveryQuery[] {
  const clean = target.trim();
  const base: DiscoveryQuery[] = [
    { query: `"${clean}"`, purpose: 'exact-identity', targetKind: kind },
    { query: `"${clean}" company`, purpose: 'company-affiliation', targetKind: kind },
    { query: `"${clean}" profile`, purpose: 'professional-public-profile', targetKind: kind },
    { query: `"${clean}" news`, purpose: 'public-mentions', targetKind: kind },
  ];

  if (kind === 'person') {
    base.push(
      { query: `"${clean}" director OR executive`, purpose: 'corporate-role', targetKind: kind },
      { query: `"${clean}" site:linkedin.com/in`, purpose: 'professional-profile', targetKind: kind },
    );
  }

  if (kind === 'company') {
    base.push(
      { query: `"${clean}" website`, purpose: 'official-site', targetKind: kind },
      { query: `"${clean}" founders OR executives`, purpose: 'leadership', targetKind: kind },
    );
  }

  return base;
}

function env(name: string) {
  return process.env[name]?.trim();
}

/**
 * Optional enterprise discovery provider adapter.
 * The application posts { queries } to the configured endpoint and expects:
 * { results: [{ title, url, snippet }] }.
 * This keeps the core investigation engine independent from a particular search vendor.
 */
export async function runDiscoveryQueries(queries: DiscoveryQuery[], signal?: AbortSignal): Promise<DiscoveryResult[]> {
  const endpoint = env('DISCOVERY_SEARCH_URL');
  if (!endpoint) return [];

  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries: queries.map(({ query, purpose, targetKind }) => ({ query, purpose, targetKind })) }),
  });

  if (!response.ok) throw new Error(`Discovery provider returned HTTP ${response.status}`);

  const payload = await response.json() as { results?: Array<{ title?: string; url?: string; snippet?: string }> };
  const retrievedAt = new Date().toISOString();

  return (payload.results || [])
    .filter((item) => typeof item.url === 'string' && /^https?:\/\//i.test(item.url))
    .slice(0, 100)
    .map((item) => ({
      title: item.title || item.url || 'Untitled result',
      url: item.url!,
      snippet: item.snippet || '',
      provider: endpoint,
      retrievedAt,
    }));
}
