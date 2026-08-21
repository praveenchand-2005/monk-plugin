import { NextResponse } from 'next/server';
import { getReadinessChecks, isProductionReady } from '@/lib/production-readiness';

export async function GET() {
  const checks = getReadinessChecks();
  const ready = isProductionReady();
  return NextResponse.json({
    ok: ready,
    service: 'enterprise-intelligence-platform',
    environment: process.env.NODE_ENV || 'development',
    ready,
    checks,
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 });
}
