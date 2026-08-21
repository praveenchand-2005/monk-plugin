import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';
import { assertCaseAccess } from '@/lib/authorization';
import { buildCaseReport, renderCaseReportHtml } from '@/lib/reporting';

export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const ctx = getAuthContext(request);
    const { caseId } = await params;
    await assertCaseAccess(ctx, caseId);
    const investigationCase = await db.investigationCase.findUnique({
      where: { id: caseId },
      include: {
        targets: true,
        findings: true,
        entities: true,
        relationships: { include: { fromEntity: true, toEntity: true } },
        evidence: true,
      },
    });
    if (!investigationCase) return NextResponse.json({ ok: false, error: 'Case not found' }, { status: 404 });

    const report = buildCaseReport({
      caseId,
      caseName: investigationCase.name,
      status: investigationCase.status,
      targets: investigationCase.targets.map(t => ({ kind: t.kind, value: t.value })),
      findings: investigationCase.findings.map(f => ({ id: f.id, title: f.title, claim: f.claim, confidence: f.confidence, status: f.status, evidenceIds: f.evidenceIds })),
      entities: investigationCase.entities.map(e => ({ id: e.id, type: e.type, canonical: e.canonical, confidence: e.confidence, verified: e.verified })),
      relationships: investigationCase.relationships.map(r => ({ id: r.id, type: r.type, confidence: r.confidence, evidenceIds: r.evidenceIds, from: r.fromEntity.canonical, to: r.toEntity.canonical })),
      evidence: investigationCase.evidence.map(e => ({ id: e.id, sourceType: e.sourceType, sourceUrl: e.sourceUrl, title: e.title, sourceRef: e.sourceRef, retrievedAt: e.retrievedAt, contentHash: e.contentHash })),
    });

    await db.auditEvent.create({
      data: { organizationId: ctx.organizationId, caseId, userId: ctx.userId, action: 'report.generated', metadata: { format: 'html', integritySha256: report.integritySha256 } },
    });

    const format = new URL(request.url).searchParams.get('format') || 'json';
    if (format === 'html') {
      return new NextResponse(renderCaseReportHtml(report), { headers: { 'content-type': 'text/html; charset=utf-8', 'content-disposition': `inline; filename="case-${caseId}.html"` } });
    }
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Report access denied' }, { status: 403 });
  }
}
