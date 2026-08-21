export type CaseSummary = {
  id: string;
  name: string;
  status: string;
  targets: Array<{ id: string; kind: string; value: string }>;
  createdAt: string;
  updatedAt: string;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

export async function listCases(organizationId: string) {
  return api<{ ok: true; cases: CaseSummary[] }>(`/api/cases?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function createCase(organizationId: string, name: string, target: { kind: string; value: string }) {
  return api<{ ok: true; case: CaseSummary }>(`/api/cases`, { method: 'POST', body: JSON.stringify({ organizationId, name, target }) });
}

export async function runInvestigation(input: { caseId?: string; target: string; targetKind: string; collect: boolean }) {
  return api<{ ok: true; caseId: string; analysis: string; evidenceCount: number; newEntities: number; model: string }>(`/api/investigate`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getGraph(caseId: string) {
  const result = await api<{ ok: true; graph: { nodes: any[]; edges: any[] } }>(`/api/cases/${encodeURIComponent(caseId)}/graph`);
  return { ok: result.ok, ...result.graph };
}

export async function getEvidence(caseId: string) {
  return api<{ ok: true; evidence: any[] }>(`/api/cases/${encodeURIComponent(caseId)}/evidence`);
}

export async function getFindings(caseId: string) {
  return api<{ ok: true; findings: any[] }>(`/api/cases/${encodeURIComponent(caseId)}/findings`);
}
