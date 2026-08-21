const required = ['DATABASE_URL', 'NVIDIA_API_KEY'];
const recommended = ['CRON_SECRET', 'OIDC_ISSUER_URL', 'DISCOVERY_SEARCH_URL', 'ALERT_WEBHOOK_URL'];

const missing = required.filter((name) => !process.env[name]);
const optionalMissing = recommended.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing required production environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (optionalMissing.length) {
  console.warn(`Optional integrations not configured: ${optionalMissing.join(', ')}`);
}

console.log('Production environment check passed.');
