import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_BOOTSTRAP !== 'true') {
    return NextResponse.json({ ok: false, error: 'Demo bootstrap is disabled in production' }, { status: 403 });
  }

  const organization = await db.organization.upsert({
    where: { id: process.env.DEFAULT_ORGANIZATION_ID || 'demo-org' },
    update: {},
    create: { id: process.env.DEFAULT_ORGANIZATION_ID || 'demo-org', name: 'Enterprise Intelligence Demo' },
  });

  await db.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: 'local-analyst' } },
    update: { role: 'ADMIN' },
    create: { organizationId: organization.id, userId: 'local-analyst', role: 'ADMIN' },
  });

  return NextResponse.json({ ok: true, organizationId: organization.id, name: organization.name });
}
