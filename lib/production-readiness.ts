export type ReadinessCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export function getReadinessChecks(): ReadinessCheck[] {
  const production = process.env.NODE_ENV === 'production';
  return [
    { name: 'NVIDIA_API_KEY', ok: Boolean(process.env.NVIDIA_API_KEY), detail: 'Server-side NVIDIA credential is configured.' },
    { name: 'DATABASE_URL', ok: Boolean(process.env.DATABASE_URL), detail: 'PostgreSQL connection string is configured.' },
    { name: 'CRON_SECRET', ok: !production || Boolean(process.env.CRON_SECRET), detail: 'WatchDog scheduler authentication is configured for production.' },
    { name: 'AUTH_ISSUER_URL', ok: !production || Boolean(process.env.AUTH_ISSUER_URL), detail: 'Production OIDC issuer is configured.' },
    { name: 'DISCOVERY_SEARCH_URL', ok: Boolean(process.env.DISCOVERY_SEARCH_URL), detail: 'Approved discovery provider is configured.' },
    { name: 'ALERT_WEBHOOK_URL', ok: !production || Boolean(process.env.ALERT_WEBHOOK_URL), detail: 'Production alert sink is configured.' },
  ];
}

export function isProductionReady() {
  return getReadinessChecks().every((check) => check.ok);
}
