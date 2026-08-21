import { NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'enterprise-intelligence-platform',
    ai: {
      provider: AI_CONFIG.provider,
      model: AI_CONFIG.model,
      configured: Boolean(process.env.NVIDIA_API_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
