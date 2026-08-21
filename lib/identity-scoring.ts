export type IdentityCandidate = {
  entityId?: string;
  name?: string;
  location?: string;
  employer?: string;
  title?: string;
  domain?: string;
  sourceReliability?: number;
};

export type IdentityScore = IdentityCandidate & {
  score: number;
  reasons: string[];
};

function normalize(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
}

function tokenSet(value?: string) {
  return new Set(normalize(value).split(/[^a-z0-9@.]+/).filter(Boolean));
}

function overlap(a?: string, b?: string) {
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const token of aa) if (bb.has(token)) common += 1;
  return common / Math.max(aa.size, bb.size);
}

export function scoreIdentityMatch(target: IdentityCandidate, candidate: IdentityCandidate): IdentityScore {
  let score = 0;
  const reasons: string[] = [];

  const name = overlap(target.name, candidate.name);
  score += Math.round(name * 45);
  if (name >= 0.99) reasons.push('Exact normalized name match.');
  else if (name >= 0.5) reasons.push('Partial name/token overlap.');

  const location = overlap(target.location, candidate.location);
  score += Math.round(location * 15);
  if (location >= 0.99) reasons.push('Location corroboration.');

  const employer = overlap(target.employer, candidate.employer);
  score += Math.round(employer * 15);
  if (employer >= 0.99) reasons.push('Employer/company corroboration.');

  const title = overlap(target.title, candidate.title);
  score += Math.round(title * 8);
  if (title >= 0.6) reasons.push('Professional-title consistency.');

  const domain = overlap(target.domain, candidate.domain);
  score += Math.round(domain * 10);
  if (domain >= 0.99) reasons.push('Domain relationship corroboration.');

  const reliability = Math.max(0, Math.min(1, candidate.sourceReliability ?? 0.5));
  score += Math.round(reliability * 7);
  if (reliability >= 0.85) reasons.push('High-reliability source.');

  return { ...candidate, score: Math.min(100, score), reasons };
}

export function rankIdentityCandidates(target: IdentityCandidate, candidates: IdentityCandidate[]): IdentityScore[] {
  return candidates
    .map((candidate) => scoreIdentityMatch(target, candidate))
    .sort((a, b) => b.score - a.score);
}
