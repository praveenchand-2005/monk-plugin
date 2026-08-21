'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCase, getEvidence, getFindings, getGraph, listCases, runInvestigation, type CaseSummary } from '@/lib/workbench-api';

type Tab = 'Overview' | 'Graph' | 'Evidence' | 'Timeline' | 'AI Investigator';

export default function Home() {
  const [organizationId, setOrganizationId] = useState('');
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selected, setSelected] = useState<CaseSummary | null>(null);
  const [target, setTarget] = useState('John Smith');
  const [targetKind, setTargetKind] = useState('person');
  const [caseName, setCaseName] = useState('New investigation');
  const [tab, setTab] = useState<Tab>('Overview');
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [evidence, setEvidence] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('ei.organizationId') || '';
    setOrganizationId(saved);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    window.localStorage.setItem('ei.organizationId', organizationId);
    listCases(organizationId).then((r) => setCases(r.cases)).catch((e) => setError(e.message));
  }, [organizationId]);

  async function refreshCase(caseId: string) {
    const [g, e, f] = await Promise.all([getGraph(caseId), getEvidence(caseId), getFindings(caseId)]);
    setGraph(g.graph);
    setEvidence(e.evidence);
    setFindings(f.findings);
  }

  async function start() {
    if (!organizationId) return setError('Enter the organization ID first.');
    if (!target.trim()) return setError('Enter an investigation target.');
    setError(''); setRunning(true);
    try {
      let active = selected;
      if (!active) {
        const created = await createCase(organizationId, caseName || `Investigation: ${target}`, { kind: targetKind, value: target });
        active = created.case;
        setSelected(active);
        setCases((prev) => [active!, ...prev]);
      }
      const result = await runInvestigation({ caseId: active.id, target, targetKind, collect: true });
      setAnalysis(result.analysis);
      await refreshCase(active.id);
      setTab('AI Investigator');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Investigation failed');
    } finally {
      setRunning(false);
    }
  }

  const counts = useMemo(() => ({ entities: graph.nodes.length, relationships: graph.edges.length, evidence: evidence.length, findings: findings.length }), [graph, evidence, findings]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">EI</span><div><strong>Enterprise Intelligence</strong><small>Investigation Workbench</small></div></div>
        <div className="navGroup">
          {['Overview', 'Investigations', 'Entities', 'Evidence', 'Monitoring', 'Reports', 'Connectors', 'Audit'].map((item) => <button key={item} className={tab === item ? 'navItem active' : 'navItem'} onClick={() => { if (item === 'Evidence') setTab('Evidence'); if (item === 'Overview') setTab('Overview'); }}>{item}</button>)}
        </div>
        <div className="sidebarBottom"><div className="tenant">ENTERPRISE / TENANT-SCOPED</div><div className="userRow"><span className="avatar">A</span><div><strong>Analyst</strong><small>Enterprise role</small></div></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><span className="eyebrow">ENTERPRISE INVESTIGATION</span><h1>Investigation Workbench</h1></div><div className="topActions"><span className={running ? 'status live' : 'status'}>{running ? 'Investigation running…' : selected ? `Case ${selected.id.slice(-8)}` : 'No active case'}</span><button className="button secondary" onClick={() => refreshCase(selected!.id)} disabled={!selected}>Refresh</button><button className="button primary" onClick={start} disabled={running}>{running ? 'Running…' : 'Run investigation'}</button></div></header>

        <section className="targetBar"><div className="targetFields"><span className="label">Target</span><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Person, company, email, domain…"/><select value={targetKind} onChange={(e) => setTargetKind(e.target.value)}><option value="person">Person</option><option value="company">Company</option><option value="email">Email</option><option value="username">Username</option><option value="domain">Domain</option><option value="url">URL</option></select></div><div className="targetFields"><span className="label">Organization ID</span><input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} placeholder="Enterprise organization ID"/><span className="label">Case</span><input value={caseName} onChange={(e) => setCaseName(e.target.value)} /></div></section>

        {error && <div className="errorBanner">{error}</div>}

        <div className="tabs">{(['Overview', 'Graph', 'Evidence', 'Timeline', 'AI Investigator'] as Tab[]).map((t) => <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>)}</div>

        {tab === 'Overview' && <>
          <section className="metrics"><div className="metric"><span>Entities</span><strong>{counts.entities}</strong><small>resolved in case</small></div><div className="metric"><span>Evidence</span><strong>{counts.evidence}</strong><small>source records</small></div><div className="metric"><span>Relationships</span><strong>{counts.relationships}</strong><small>graph edges</small></div><div className="metric"><span>Findings</span><strong>{counts.findings}</strong><small>analyst review</small></div></section>
          <div className="grid two"><section className="panel"><div className="panelHeader"><div><h2>Cases</h2><p>Tenant-scoped investigations</p></div></div>{cases.length ? cases.map((c) => <button key={c.id} className={selected?.id === c.id ? 'caseRow selected' : 'caseRow'} onClick={async () => { setSelected(c); setTarget(c.targets[0]?.value || ''); setTargetKind(c.targets[0]?.kind || 'person'); await refreshCase(c.id); }}>{c.name}<span>{c.status}</span></button>) : <div className="empty">No cases yet. Enter an organization ID and run your first investigation.</div>}</section>
          <section className="panel"><div className="panelHeader"><div><h2>Pipeline</h2><p>Live system architecture</p></div></div><div className="pipeline">{['Target intake','Discovery','Evidence ingestion','Entity resolution','Graph construction','NVIDIA analysis'].map((s, i) => <div className="step" key={s}><span className="stepDot done">{i + 1}</span><div><strong>{s}</strong><small>{running && i === 1 ? 'Running' : selected ? 'Available' : 'Waiting for case'}</small></div></div>)}</div></section></div>
        </>}

        {tab === 'Graph' && <section className="panel graphPanel"><div className="panelHeader"><div><h2>Relationship graph</h2><p>Persisted entities and evidence-backed relationships</p></div></div><div className="graphCanvas"><div className="graphGrid">{graph.nodes.map((n) => <div className="nodeCard" key={n.id}><div className="nodeType">{n.type}</div><strong>{n.label}</strong><span>{n.confidence}% confidence</span></div>)}{!graph.nodes.length && <div className="empty">Run an investigation to populate the graph.</div>}</div></div></section>}

        {tab === 'Evidence' && <section className="panel"><div className="panelHeader"><div><h2>Evidence</h2><p>Every record retains source provenance and retrieval time.</p></div></div><div className="tableWrap"><table><thead><tr><th>Title</th><th>Source</th><th>Retrieved</th><th>Reference</th></tr></thead><tbody>{evidence.map((e) => <tr key={e.id}><td>{e.title || 'Untitled'}</td><td>{e.sourceUrl || e.sourceType}</td><td>{new Date(e.retrievedAt).toLocaleString()}</td><td>{e.sourceRef || '—'}</td></tr>)}</tbody></table>{!evidence.length && <div className="empty">No evidence for the selected case.</div>}</div></section>}

        {tab === 'AI Investigator' && <section className="panel aiPanel"><div className="panelHeader"><div><h2>NVIDIA Investigator</h2><p>Evidence-grounded analysis from the selected case.</p></div></div><div className="chat"><div className="message assistant"><strong>Investigator</strong><p>{analysis || 'Run an investigation to generate an evidence-grounded assessment.'}</p></div></div></section>}

        {tab === 'Timeline' && <section className="panel"><div className="panelHeader"><div><h2>Timeline</h2><p>Investigation events will appear here as collection, resolution and analysis complete.</p></div></div><div className="empty">Audit and investigation timeline UI is the next enterprise hardening pass.</div></section>}

        <footer className="footer"><span>Evidence provenance: enabled</span><span>AI provider: NVIDIA NIM</span><span>Tenant context: explicit</span><span>Audit trail: enabled</span></footer>
      </section>
    </main>
  );
}
