import { NextResponse } from 'next/server';
import { listConnectors } from '@/lib/connectors';

export async function GET() {
  return NextResponse.json({
    connectors: listConnectors(),
  });
}
