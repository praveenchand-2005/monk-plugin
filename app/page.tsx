'use client';

import { useEffect, useMemo, useState } from 'react';

type Evidence = { id: string; title: string | null; sourceType: string; sourceUrl: string | null; retrievedAt: string; content: string | null };
type Entity = { id: string; type: string; canonical: string; confidence: number; verified: boolean };
type Relationship = { id: string; fromEntityId: string; toEntityId: string; type: string; confidence: number; evidenceIds: string[] };
type Finding = { id: string; title: string; claim: string; confidence: number; status: string; evidenceIds: string[] };

const entityKinds = ['person', 'company', 'email', 'phone', 'username', 'domain', 'url', 'ip', 'address', 'custom'];

export default function Home() {
  const [organizationId, setOrganizationId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [caseName, setCaseName] = useState('New investigation');
  const [query, setQuery] = useState('Alex Morgan');
  const [targetKind, setTargetKind] = useState('person');
  const [activeTab, setActiveTab] = useState('Overview');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState('');

  const metrics = useMemo(() => [
    ['Entities', String(entities.length), `${entities.filter(e => e.verified).length} verified`],
    ['Evidence', String(evidence.length), `${new Set(evidence.map(e => e.sourceType)).size} source types`],
    ['Relationships', String(relationships.length), `${relationships.filter(r => r.confidence < 80).length} low-confidence`],
    ['Findings', String(findings.length), `${findings.filter(f => f.status === 'VERIFIED').length} verified`],
  ], [entities, evidence, relationships, findings]);

  async function refreshCase(id: string) {
    const [graphRes, evidenceRes, findingsRes] = await Promise.all([
      fetch(`/api/cases/${id}/graph`),
      fetch(`/api/cases/${id}/evidence`),
      fetch(`/api/cases/${id}/findings`),
    ]);
    if (graphRes.ok) {
      const data = await graphRes.json();
      setEntities(data.entities || []); setRelationships(data.relationships || []);
    }
    if (evidenceRes.ok) setEvidence((await evidenceRes.json()).evidence || []);
    if (findingsRes.ok) setFindings((await findingsRes.json()).findings || []);
  }

  async function bootstrap() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/bootstrap', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bootstrap failed');
      setOrganizationId(data.organizationId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Bootstrap failed'); }
    finally { setLoading(false); }
  }

  async function createCase() {
    if (!organizationId) return;
    setError('');
    const res = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, name: caseName || `Investigation: ${query}`, target: { kind: targetKind, value: query } }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Could not create case'); return; }
    setCaseId(data.case.id);
    await refreshCase(data.case.id);
  }

  async function runInvestigation() {
    if (!caseId) await createCase();
    const id = caseId;
    if (!id) return;
    setRunning(true); setError(''); setAnalysis('');
    try {
      const res = await fetch('/api/investigate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: id, target: query, targetKind, collect: targetKind === 'url' || targetKind === 'domain', question: 'Build an evidence-grounded investigation assessment. Identify verified evidence, candidate entities, relationships, contradictions, and next collection steps.' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Investigation failed');
      setAnalysis(data.analysis || '');
      await refreshCase(id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Investigation failed'); }
    finally { setRunning(false); }
  }

  async function askAI(question: string) {
    if (!caseId || !question.trim()) return;
    setRunning(true); setError('');
    try {
      const res = await fetch('/api/investigate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId, target: query, targetKind, question }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAnalysis(data.analysis || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'AI request failed'); }
    finally { setRunning(false); }
  }

  async function reviewFinding(findingId: string, status: 'VERIFIED' | 'REJECTED') {
    const res = await fetch(`/api/cases/${caseId}/findings/${findingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (res.ok) await refreshCase(caseId);
  }

  useEffect(() => { bootstrap(); }, []);

  if (loading) return <main className="shell"><section className="content"><div className="panel"><h1>Initializing enterprise workspace…</h1><p>Preparing the development tenant.</p></div></section></main>;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">EI</span><div><strong>Enterprise Intelligence</strong><small>Investigation Workbench</small></div></div>
        <div className="navGroup">{['Overview', 'Investigations', 'Entities', 'Evidence', 'Monitoring', 'Reports', 'Connectors', 'Audit'].map(item => <button key={item} className={activeTab === item ? 'navItem active' : 'navItem'} onClick={() => setActiveTab(item)}>{item}</button>)}</div>
        <div className="sidebarBottom"><div className="tenant">DEVELOPMENT ORGANIZATION</div><div className="userRow"><span className="avatar">P</span><div><strong>Analyst</strong><small>Administrator</small></div></div></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">ENTERPRISE INVESTIGATION</span><h1>Investigation Workbench</h1></div>
          <div className="topActions"><span className={running ? 'status live' : 'status'}>{running ? 'Investigation running…' : caseId ? 'Case ready' : 'New case'}</span><button className="button secondary" onClick={() => setActiveTab('Reports')}>Export</button><button className="button primary" disabled={running} onClick={runInvestigation}>{running ? 'Running…' : 'Run investigation'}</button></div>
        </header>

        {error && <div className="panel" style={{ marginBottom: 16 }}><strong>Request error</strong><p>{error}</p></div>}

        <div className="targetBar">
          <div><span className="label">Target</span><input value={query} onChange={e => setQuery(e.target.value)} aria-label="investigation target" /></div>
          <div><span className="label">Type</span><select value={targetKind} onChange={e => setTargetKind(e.target.value)}>{entityKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></div>
          <div><span className="label">Case</span><input value={caseName} onChange={e => setCaseName(e.target.value)} /></div>
          <div className="targetMeta"><span>{caseId ? `Case ${caseId.slice(0, 10)}` : 'Not created'}</span><span>AI: NVIDIA NIM</span></div>
        </div>

        <div className="tabs">{['Overview', 'Graph', 'Evidence', 'Timeline', 'AI Investigator'].map(tab => <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>

        {activeTab === 'Graph' ? <section className="panel graphPanel"><div className="panelHeader"><div><h2>Relationship graph</h2><p>Persisted entities and evidence-backed relationships</p></div></div><div className="graphCanvas"><div className="nodeList">{entities.map(e => <div className="node" key={e.id}><div className="nodeType">{e.type}</div><strong>{e.canonical}</strong><span>{e.confidence}% confidence {e.verified ? '· verified' : '· candidate'}</span></div>)}</div><div className="graphLegend"><span>{relationships.length} persisted relationships</span></div></div></section>
          : activeTab === 'Evidence' ? <section className="panel"><div className="panelHeader"><div><h2>Evidence</h2><p>Every record is retained with provenance and retrieval metadata.</p></div></div><div className="tableWrap"><table><thead><tr><th>Source</th><th>Type</th><th>Retrieved</th></tr></thead><tbody>{evidence.map(item => <tr key={item.id}><td>{item.title || item.sourceUrl || item.id}</td><td>{item.sourceType}</td><td>{new Date(item.retrievedAt).toLocaleString()}</td></tr>)}</tbody></table></div></section>
          : activeTab === 'AI Investigator' ? <section className="panel aiPanel"><div className="panelHeader"><div><h2>AI Investigator</h2><p>Questions are grounded against the current case evidence and graph.</p></div></div><div className="chat"><div className="message assistant"><strong>NVIDIA Investigator</strong><p>{analysis || 'Run an investigation or ask a case question. The AI will cite evidence IDs when it makes factual claims.'}</p></div></div><div className="chatInput"><input placeholder="Ask: What evidence supports the strongest identity match?" onKeyDown={e => { if (e.key === 'Enter') askAI(e.currentTarget.value); }} /><button className="button primary" onClick={() => { const el = document.querySelector<HTMLInputElement>('.chatInput input'); if (el) askAI(el.value); }}>Send</button></div></section>
          : <>
            <section className="metrics">{metrics.map(([a,b,c]) => <div className="metric" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</section>
            <div className="grid two"><section className="panel"><div className="panelHeader"><div><h2>Findings</h2><p>Candidate findings requiring analyst decision</p></div></div>{findings.length === 0 ? <p>No findings yet. Run the investigation.</p> : findings.map(f => <div className="finding" key={f.id}><div className="findingBadge">{f.status === 'VERIFIED' ? '✓' : '?'}</div><div className="findingBody"><strong>{f.title}</strong><p>{f.claim}</p><div className="findingFooter"><span className={f.status === 'VERIFIED' ? 'pill verified' : 'pill candidate'}>{f.status}</span><span>{f.confidence}% confidence</span>{f.status === 'CANDIDATE' && <><button className="textButton" onClick={() => reviewFinding(f.id, 'VERIFIED')}>Verify</button><button className="textButton" onClick={() => reviewFinding(f.id, 'REJECTED')}>Reject</button></>}</div></div></div>)}</section><section className="panel"><div className="panelHeader"><div><h2>Pipeline</h2><p>Current case execution state</p></div></div><div className="pipeline">{['Target intake','Collection','Normalization','Entity resolution','AI analysis','Analyst review'].map((s,i)=><div className="step" key={s}><span className={caseId && (i < 4 || (i === 4 && analysis)) ? 'stepDot done' : 'stepDot'}>{caseId && (i < 4 || (i === 4 && analysis)) ? '✓' : i+1}</span><div><strong>{s}</strong><small>{caseId && (i < 4 || (i === 4 && analysis)) ? 'Completed' : 'Waiting'}</small></div></div>)}</div></section></div>
            <section className="panel"><div className="panelHeader"><div><h2>Case facts</h2><p>Live database totals for this investigation</p></div></div><div className="tableWrap"><table><thead><tr><th>Entity type</th><th>Count</th><th>Verified</th></tr></thead><tbody>{['person','company','email','phone','username','domain','url'].map(type => { const rows = entities.filter(e => e.type === type); return <tr key={type}><td>{type}</td><td>{rows.length}</td><td>{rows.filter(e => e.verified).length}</td></tr>; })}</tbody></table></div></section>
          </>}

        <footer className="footer"><span>Evidence integrity: enabled</span><span>Tenant isolation primitives: enabled</span><span>Audit logging: enabled</span><span>AI provider: NVIDIA NIM</span></footer>
      </section>
    </main>
  );
}
