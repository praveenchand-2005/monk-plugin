import type { TargetKind } from '@/lib/connectors/types';

export type IdentityCandidate = {
  entityId: string;
  canonical: string;
  type: string;
  confidence: number;
  signals: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9@._ -]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / new Set([...a, ...b]).size;
}

export function scoreIdentityCandidates(target: string, kind: TargetKind, entities: Array<{ id: string; canonical: string; type: string }>, evidence: Array<{ content: string | null; sourceType: string; sourceUrl: string | null }>): IdentityCandidate[] {
  const targetTokens = tokenSet(target);
  return entities
    .filter((entity) => entity.type.toLowerCase() === kind || kind === 'custom')
    .map((entity) => {
      const signals: string[] = [];
      const similarity = jaccard(targetTokens, tokenSet(entity.canonical));
      let score = Math.round(similarity * 70);
      if (normalize(entity.canonical) === normalize(target)) {
        score = 90;
        signals.push('Exact normalized target match');
      } else if (similarity > 0.6) {
        score += 12;
        signals.push('Strong token overlap');
      } else if (similarity > 0.3) {
        score += 6;
        signals.push('Partial token overlap');
      }

      const supportingEvidence = evidence.filter((item) => normalize(item.content || '').includes(normalize(entity.canonical)));
      if (supportingEvidence.length >= 2) {
        score += 8;
        signals.push('Corroborated by multiple evidence records');
      } else if (supportingEvidence.length === 1) {
        score += 4;
        signals.push('Supported by one evidence record');
      }

      const highValueSource = supportingEvidence.some((item) => /company|corporate|registry|official|public-record/i.test(`${item.sourceType} ${item.sourceUrl || ''}`));
      if (highValueSource) {
        score += 5;
        signals.push('Supported by a higher-confidence source type');
      }

      return {
        entityId: entity.id,
        canonical: entity.canonical,
        type: entity.type,
        confidence: Math.min(99, score),
        signals,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}
