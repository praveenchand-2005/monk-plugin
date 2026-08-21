import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';

export async function GET() {
  try {
    const { organizationId, userId, role } = await getRequestContext();
    if (!organizationId) return NextResponse.json({ ok: false, error: 'Organization context is required' }, { status: 401 });
    const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } });
    if (!organization) return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 });
    return NextResponse.json({ ok: true, user: { id: userId, role }, organization });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Context lookup failed' }, { status: 400 });
  }
}
