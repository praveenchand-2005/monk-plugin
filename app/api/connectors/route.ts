import { NextResponse } from 'next/server';
import { getConnectors } from '@/lib/connectors';

export async function GET() {
  return NextResponse.json({
    connectors: getConnectors().map(({ id, name }) => ({ id, name })),
  });
}
