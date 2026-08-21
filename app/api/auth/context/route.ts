import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ ok: true, context: getAuthContext(request) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Authentication context unavailable' }, { status: 401 });
  }
}
