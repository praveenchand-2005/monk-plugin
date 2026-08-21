import { NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';

export async function GET() {
  const aiConfigured = Boolean(process.env.NVIDIA_API_KEY);
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const ready = aiConfigured && databaseConfigured;

  return NextResponse.json({
    ok: ready,
    service: 'enterprise-intelligence-platform',
    ai: { provider: AI_CONFIG.provider, model: AI_CONFIG.model, configured: aiConfigured },
    database: { provider: 'postgresql', configured: databaseConfigured },
    timestamp: new Date().toISOString(),
  }, { status: ready ? 200 : 503 });
}
