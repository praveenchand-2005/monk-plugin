'use client';

import { useMemo, useState } from 'react';

const entities = [
  { id: 'e1', type: 'Person', name: 'Alex Morgan', confidence: 96, x: 22, y: 30 },
  { id: 'e2', type: 'Company', name: 'Northstar Systems', confidence: 94, x: 52, y: 22 },
  { id: 'e3', type: 'Domain', name: 'northstar.example', confidence: 98, x: 75, y: 36 },
  { id: 'e4', type: 'Email', name: 'alex@northstar.example', confidence: 91, x: 25, y: 69 },
  { id: 'e5', type: 'Person', name: 'Jordan Lee', confidence: 72, x: 59, y: 70 },
];

const findings = [
  { title: 'Identity relationship', text: 'Alex Morgan is linked to Northstar Systems by 3 independent sources.', confidence: 96, tone: 'verified' },
  { title: 'Domain association', text: 'northstar.example matches the company domain with high confidence.', confidence: 98, tone: 'verified' },
  { title: 'Candidate relationship', text: 'Jordan Lee may be associated with the company; analyst verification is recommended.', confidence: 72, tone: 'candidate' },
];

export default function Home() {
  const [query, setQuery] = useState('Alex Morgan');
  const [activeTab, setActiveTab] = useState('Overview');
  const [running, setRunning] = useState(false);
  const [caseOpen, setCaseOpen] = useState(true);

  const status = useMemo(() => (running ? 'Investigation running…' : 'Ready'), [running]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">EI</span><div><strong>Enterprise Intelligence</strong><small>Investigation Workbench</small></div></div>
        <div className="navGroup">
          {['Overview', 'Investigations', 'Entities', 'Evidence', 'Monitoring', 'Reports', 'Connectors', 'Audit'].map(item => (
            <button key={item} className={activeTab === item ? 'navItem active' : 'navItem'} onClick={() => setActiveTab(item)}>{item}</button>
          ))}
        </div>
        <div className="sidebarBottom">
          <div className="tenant">PRAVEENCHAND / DEMO ORG</div>
          <div className="userRow"><span className="avatar">P</span><div><strong>Analyst</strong><small>Administrator</small></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">CASE / NORTHSTAR DUE DILIGENCE</span><h1>Investigation Workbench</h1></div>
          <div className="topActions"><span className={running ? 'status live' : 'status'}>{status}</span><button className="button secondary">Export</button><button className="button primary" onClick={() => setRunning(v => !v)}>{running ? 'Stop run' : 'Run investigation'}</button></div>
        </header>

        <div className="targetBar">
          <div><span className="label">Target</span><input value={query} onChange={e => setQuery(e.target.value)} aria-label="investigation target" /></div>
          <div className="targetMeta"><span>Person</span><span>Case: NS-2026-001</span><span>Updated 2m ago</span></div>
        </div>

        <div className="tabs">{['Overview', 'Graph', 'Evidence', 'Timeline', 'AI Investigator'].map(tab => <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>

        {activeTab === 'Graph' ? (
          <section className="panel graphPanel">
            <div className="panelHeader"><div><h2>Relationship graph</h2><p>Resolved entities and evidence-backed relationships</p></div><button className="button secondary">Fit graph</button></div>
            <div className="graphCanvas">
              <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[[22,30,52,22],[52,22,75,36],[22,30,25,69],[52,22,59,70]].map((e,i)=><line key={i} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} />)}
              </svg>
              {entities.map(e => <div key={e.id} className="node" style={{left:`${e.x}%`,top:`${e.y}%`}}><div className="nodeType">{e.type}</div><strong>{e.name}</strong><span>{e.confidence}% confidence</span></div>)}
              <div className="graphLegend"><span><i className="dot verifiedDot"/>Verified</span><span><i className="dot candidateDot"/>Candidate</span></div>
            </div>
          </section>
        ) : activeTab === 'AI Investigator' ? (
          <section className="panel aiPanel"><div className="panelHeader"><div><h2>AI Investigator</h2><p>Ask questions against the case evidence and graph.</p></div></div><div className="chat"><div className="message assistant"><strong>Investigator</strong><p>I have 18 evidence items, 5 resolved entities and 4 candidate relationships. Ask me to explain a finding, compare entities, or build an investigation plan.</p></div><div className="message user"><strong>You</strong><p>What is the strongest evidence linking Alex Morgan to Northstar Systems?</p></div><div className="message assistant"><strong>Investigator</strong><p>The strongest evidence is the convergence of the company record, corporate website identity, and the email-domain relationship. I would cite all three rather than relying on a single source.</p></div></div><div className="chatInput"><input placeholder="Ask a case question…"/><button className="button primary">Send</button></div></section>
        ) : (
          <>
            <section className="metrics">
              {[['Entities','5','3 verified'],['Evidence','18','6 sources'],['Relationships','7','1 candidate'],['Confidence','94%','case average']].map(([a,b,c])=><div className="metric" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}
            </section>
            <div className="grid two">
              <section className="panel"><div className="panelHeader"><div><h2>Key findings</h2><p>Evidence-backed claims requiring analyst attention</p></div><button className="button secondary">View all</button></div>{findings.map(f=><div className="finding" key={f.title}><div className="findingBadge">{f.tone === 'verified' ? '✓' : '?'}</div><div className="findingBody"><strong>{f.title}</strong><p>{f.text}</p><div className="findingFooter"><span className={f.tone === 'verified' ? 'pill verified' : 'pill candidate'}>{f.tone === 'verified' ? 'Verified' : 'Candidate'}</span><span>{f.confidence}% confidence</span><button className="textButton">Open evidence</button></div></div></div>)}</section>
              <section className="panel"><div className="panelHeader"><div><h2>Investigation status</h2><p>Collection and analysis pipeline</p></div></div><div className="pipeline">{['Target intake','Collection','Normalization','Entity resolution','AI analysis','Analyst review'].map((s,i)=><div className="step" key={s}><span className={i < 5 ? 'stepDot done' : 'stepDot'}>{i < 5 ? '✓' : i+1}</span><div><strong>{s}</strong><small>{i < 2 ? 'Completed' : i === 4 ? 'Ready for review' : 'Processed'}</small></div></div>)}</div></section>
            </div>
            <section className="panel"><div className="panelHeader"><div><h2>Recent evidence</h2><p>Every finding remains traceable to source records</p></div><button className="button secondary">Evidence viewer</button></div><div className="tableWrap"><table><thead><tr><th>Source</th><th>Type</th><th>Retrieved</th><th>Confidence</th><th>Status</th></tr></thead><tbody>{[['Northstar corporate site','Web page','2m ago','98%','Verified'],['Company registry record','Public record','7m ago','97%','Verified'],['alex@northstar.example','Organization data','9m ago','94%','Verified'],['Professional profile candidate','Public profile','12m ago','72%','Candidate']].map(r=><tr key={r[0]}>{r.map((x,j)=><td key={j}>{j===4?<span className={x==='Verified'?'pill verified':'pill candidate'}>{x}</span>:x}</td>)}</tr>)}</tbody></table></div></section>
          </>
        )}

        <footer className="footer"><span>Evidence integrity: enabled</span><span>Tenant isolation: enabled</span><span>Audit logging: enabled</span><span>OpenAI agent layer: server-side</span></footer>
      </section>
      {caseOpen && <button className="floating" onClick={() => setCaseOpen(false)}>×</button>}
    </main>
  );
}
