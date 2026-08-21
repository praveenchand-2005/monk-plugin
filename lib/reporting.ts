import crypto from 'node:crypto';

export type CaseReportInput = {
  caseId: string;
  caseName: string;
  status: string;
  targets: Array<{ kind: string; value: string }>;
  findings: Array<{ id: string; title: string; claim: string; confidence: number; status: string; evidenceIds: string[] }>;
  entities: Array<{ id: string; type: string; canonical: string; confidence: number; verified: boolean }>;
  relationships: Array<{ id: string; type: string; confidence: number; evidenceIds: string[]; from: string; to: string }>;
  evidence: Array<{ id: string; sourceType: string; sourceUrl: string | null; title: string | null; sourceRef: string | null; retrievedAt: Date; contentHash: string | null }>;
};

export function buildCaseReport(input: CaseReportInput) {
  const generatedAt = new Date().toISOString();
  const payload = {
    reportVersion: '1.0',
    generatedAt,
    integritySha256: '',
    ...input,
  };
  const canonical = JSON.stringify({ ...payload, integritySha256: '' });
  payload.integritySha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  return payload;
}

export function renderCaseReportHtml(report: ReturnType<typeof buildCaseReport>) {
  const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(report.caseName)} — Investigation Report</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;color:#18202a}h1{margin-bottom:4px}h2{margin-top:32px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #d7dde5;padding:8px;text-align:left;vertical-align:top}small,.muted{color:#64748b}.pill{display:inline-block;padding:2px 7px;border-radius:999px;background:#eef2ff}.claim{white-space:pre-wrap}</style></head><body><h1>${esc(report.caseName)}</h1><div class="muted">Case ${esc(report.caseId)} · Status ${esc(report.status)} · Generated ${esc(report.generatedAt)}</div><h2>Targets</h2><ul>${report.targets.map(t=>`<li><strong>${esc(t.kind)}</strong>: ${esc(t.value)}</li>`).join('')}</ul><h2>Findings</h2><table><thead><tr><th>Title</th><th>Confidence</th><th>Status</th><th>Claim</th><th>Evidence IDs</th></tr></thead><tbody>${report.findings.map(f=>`<tr><td>${esc(f.title)}</td><td>${esc(f.confidence)}%</td><td>${esc(f.status)}</td><td class="claim">${esc(f.claim)}</td><td>${f.evidenceIds.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table><h2>Entities</h2><table><thead><tr><th>Type</th><th>Canonical</th><th>Confidence</th><th>Verified</th></tr></thead><tbody>${report.entities.map(e=>`<tr><td>${esc(e.type)}</td><td>${esc(e.canonical)}</td><td>${esc(e.confidence)}%</td><td>${e.verified ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table><h2>Relationships</h2><table><thead><tr><th>From</th><th>Relationship</th><th>To</th><th>Confidence</th><th>Evidence IDs</th></tr></thead><tbody>${report.relationships.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.type)}</td><td>${esc(r.to)}</td><td>${esc(r.confidence)}%</td><td>${r.evidenceIds.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table><h2>Evidence Index</h2><table><thead><tr><th>ID</th><th>Title</th><th>Source</th><th>URL</th><th>Retrieved</th></tr></thead><tbody>${report.evidence.map(e=>`<tr><td>${esc(e.id)}</td><td>${esc(e.title || e.sourceType)}</td><td>${esc(e.sourceType)}</td><td>${esc(e.sourceUrl || '')}</td><td>${esc(e.retrievedAt.toISOString())}</td></tr>`).join('')}</tbody></table><p class="muted">Integrity SHA-256: ${esc(report.integritySha256)}</p></body></html>`;
}
