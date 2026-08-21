export interface CandidateEntity {
  type: string;
  canonical: string;
  confidence: number;
  reason: string;
}

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOMAIN = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi;
const PHONE = /\b(?:\+?\d[\d .()\-]{7,}\d)\b/g;

export function extractCandidates(text: string): CandidateEntity[] {
  const candidates: CandidateEntity[] = [];
  for (const match of text.matchAll(EMAIL)) {
    candidates.push({ type: 'email', canonical: match[0].toLowerCase(), confidence: 99, reason: 'Exact email pattern detected in source content.' });
  }
  for (const match of text.matchAll(DOMAIN)) {
    const value = match[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
    if (!value.includes('@')) candidates.push({ type: 'domain', canonical: value, confidence: 94, reason: 'Domain-shaped identifier detected in source content.' });
  }
  for (const match of text.matchAll(PHONE)) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length >= 8) candidates.push({ type: 'phone', canonical: digits, confidence: 90, reason: 'Phone-shaped identifier detected in source content.' });
  }
  return Array.from(new Map(candidates.map((candidate) => [`${candidate.type}:${candidate.canonical}`, candidate])).values());
}
