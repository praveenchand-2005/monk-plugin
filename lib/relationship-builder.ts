export type RelationshipCandidate = {
  fromCanonical: string;
  toCanonical: string;
  type: string;
  confidence: number;
  evidenceIds: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildRelationshipCandidates(
  entities: Array<{ id: string; canonical: string; type: string }>,
  evidence: Array<{ id: string; content: string | null }>,
): Array<RelationshipCandidate & { fromEntityId: string; toEntityId: string }> {
  const output: Array<RelationshipCandidate & { fromEntityId: string; toEntityId: string }> = [];
  for (const item of evidence) {
    const content = normalize(item.content || '');
    const mentioned = entities.filter((entity) => content.includes(normalize(entity.canonical)));
    if (mentioned.length < 2) continue;

    for (let i = 0; i < mentioned.length; i += 1) {
      for (let j = i + 1; j < mentioned.length; j += 1) {
        const a = mentioned[i];
        const b = mentioned[j];
        let type = 'associated_with';
        if (a.type === 'person' && b.type === 'company') type = 'works_at_or_affiliated_with';
        else if (a.type === 'company' && b.type === 'person') type = 'has_person_association';
        else if (a.type === 'company' && b.type === 'domain') type = 'has_domain_association';
        else if (a.type === 'domain' && b.type === 'company') type = 'domain_of_company';
        else if (a.type === 'email' && b.type === 'domain') type = 'email_domain_match';
        else if (a.type === 'person' && b.type === 'email') type = 'person_email_match';

        output.push({
          fromEntityId: a.id,
          toEntityId: b.id,
          fromCanonical: a.canonical,
          toCanonical: b.canonical,
          type,
          confidence: 70,
          evidenceIds: [item.id],
        });
      }
    }
  }

  const unique = new Map<string, RelationshipCandidate & { fromEntityId: string; toEntityId: string }>();
  for (const relationship of output) {
    const key = `${relationship.fromEntityId}:${relationship.toEntityId}:${relationship.type}`;
    const current = unique.get(key);
    if (!current) unique.set(key, relationship);
    else {
      current.confidence = Math.min(99, current.confidence + 10);
      current.evidenceIds = Array.from(new Set([...current.evidenceIds, ...relationship.evidenceIds]));
    }
  }
  return Array.from(unique.values());
}
