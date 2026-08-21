import { db } from '@/lib/db';

export const investigatorTools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_case_evidence',
      description: 'Retrieve evidence records for an investigation case. Use this before making claims about case data.',
      parameters: { type: 'object', properties: { caseId: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 25 } }, required: ['caseId'], additionalProperties: false },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_case_graph',
      description: 'Retrieve entities and evidence-backed relationships for a case.',
      parameters: { type: 'object', properties: { caseId: { type: 'string' } }, required: ['caseId'], additionalProperties: false },
    },
  },
] as const;

export async function executeInvestigatorTool(name: string, rawArgs: string) {
  const args = JSON.parse(rawArgs) as { caseId?: string; limit?: number };
  if (!args.caseId) throw new Error('caseId is required');

  if (name === 'get_case_evidence') {
    return db.evidence.findMany({
      where: { caseId: args.caseId },
      orderBy: { retrievedAt: 'desc' },
      take: Math.min(Math.max(args.limit ?? 15, 1), 25),
      select: { id: true, title: true, sourceType: true, sourceUrl: true, sourceRef: true, retrievedAt: true, content: true, metadata: true },
    });
  }

  if (name === 'get_case_graph') {
    const [entities, relationships] = await Promise.all([
      db.entity.findMany({ where: { caseId: args.caseId }, orderBy: { createdAt: 'asc' } }),
      db.relationship.findMany({ where: { caseId: args.caseId }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { entities, relationships };
  }

  throw new Error(`Unknown investigator tool: ${name}`);
}
