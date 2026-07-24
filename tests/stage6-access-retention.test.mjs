import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isAuthorizedCronRequest,
} from '../src/lib/retention/cronAuthorization.ts';

async function read(relativePath) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    'utf8'
  );
}

test('the former owner email cannot grant access in canonical application code', async () => {
  const sources = await Promise.all([
    read('src/lib/supabase-browser.ts'),
    read('src/app/api/analyze-free/route.ts'),
    read('src/app/api/analyze-v2/route.ts'),
  ]);
  const combined = sources.join('\n');

  assert.equal(combined.includes('alexxusjenkins91@gmail.com'), false);
  assert.doesNotMatch(combined, /OWNER_UNLIMITED|ownerUnlimited|isOwner/);
});

test('browser entitlement is server-derived and fails away from direct table reads', async () => {
  const browserSource = await read('src/lib/supabase-browser.ts');
  const routeSource = await read('src/app/api/entitlement/route.ts');
  const hookSource = await read('src/hooks/useAuth.ts');
  const accountSource = await read('src/app/account/page.tsx');
  const pricingSource = await read('src/app/pricing/page.tsx');

  assert.match(browserSource, /fetch\('\/api\/entitlement'/);
  assert.doesNotMatch(browserSource, /\.from\(['"]subscriptions['"]\)/);
  assert.match(routeSource, /auth\.getUser\(\)/);
  assert.match(routeSource, /createServiceRoleClient\(\)/);
  assert.match(routeSource, /\.rpc\(['"]has_active_access['"]/);
  assert.match(routeSource, /Cache-Control['"]:\s*['"]private, no-store/);
  assert.match(routeSource, /accessSource/);
  assert.match(
    routeSource,
    /isLifetime:\s*entitledSubscription\?\.is_lifetime === true/
  );
  assert.doesNotMatch(
    routeSource,
    /isLifetime:[\s\S]{0,120}accessSource === 'grant'/
  );
  assert.match(browserSource, /export type AtsAccessSource/);
  assert.match(hookSource, /accessSource: AtsAccessSource/);
  assert.match(accountSource, /Complimentary access/);
  assert.match(pricingSource, /accessSource === 'grant'/);
});

test('access-grant migration is UUID keyed, service only, expiring, and tombstone aware', async () => {
  const migration = await read(
    'supabase/migrations/20260724131313_ats_access_grants_and_retention.sql'
  );

  assert.match(
    migration,
    /user_id UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/
  );
  assert.match(
    migration,
    /ALTER TABLE public\.ats_access_grants ENABLE ROW LEVEL SECURITY/
  );
  assert.match(
    migration,
    /ALTER TABLE public\.ats_access_grants FORCE ROW LEVEL SECURITY/
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.ats_access_grants\s+FROM PUBLIC, anon, authenticated, service_role/
  );
  assert.match(
    migration,
    /GRANT SELECT, INSERT, UPDATE, DELETE\s+ON TABLE public\.ats_access_grants TO service_role/
  );
  assert.match(migration, /access_grant\.status = 'active'/);
  assert.match(migration, /access_grant\.expires_at > NOW\(\)/);
  assert.match(migration, /membership\.status <> 'active'/);
  assert.match(migration, /guard_ats_access_grant_mutation/);
  assert.match(migration, /:ats-billing-lifecycle/);
  assert.match(
    migration,
    /DELETE FROM public\.ats_access_grants AS access_grant/
  );
  assert.match(migration, /deleted_access_grants INTEGER/);
  assert.match(
    migration,
    /ATS access grants require an active ATS membership/
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.has_valid_ats_access_grant\(UUID\)\s+FROM PUBLIC, anon, authenticated/
  );
  assert.doesNotMatch(migration, /CREATE POLICY/i);
  assert.doesNotMatch(
    migration,
    /\bemail\s*=|\.email\b|raw_user_meta_data/i
  );
});

test('retention migration deletes only records older than guarded cutoffs', async () => {
  const migration = await read(
    'supabase/migrations/20260724131313_ats_access_grants_and_retention.sql'
  );

  assert.match(migration, /CURRENT_DATE - 7/);
  assert.match(migration, /NOW\(\) - INTERVAL '48 hours'/);
  assert.match(
    migration,
    /usage\.usage_date < p_free_tier_before/
  );
  assert.match(
    migration,
    /limits\.window_start < p_ai_rate_limit_before/
  );
  assert.match(migration, /p_batch_size INTEGER DEFAULT 1000/);
  assert.match(migration, /LIMIT p_batch_size/g);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/g);
  assert.match(migration, /free_tier_has_more BOOLEAN/);
  assert.match(migration, /ai_rate_limits_has_more BOOLEAN/);
  assert.match(
    migration,
    /CREATE INDEX IF NOT EXISTS ai_rate_limits_window_start_idx/
  );
  assert.match(migration, /must retain the current day/);
  assert.match(migration, /must retain the current hour/);
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.prune_ats_retention\(\s*DATE, TIMESTAMPTZ, INTEGER\s*\)\s+TO service_role/
  );
  assert.match(
    migration,
    /GRANT SELECT, DELETE ON TABLE public\.free_tier_usage TO service_role/
  );
  assert.match(
    migration,
    /GRANT SELECT, DELETE ON TABLE public\.ai_rate_limits TO service_role/
  );

  const verifier = await read(
    'supabase/tests/ats_access_grants_and_retention.sql'
  );
  assert.match(verifier, /SET LOCAL ROLE service_role/);
  assert.match(verifier, /v_deleted_free <> 2/);
  assert.match(verifier, /v_deleted_free <> 1/);
  assert.match(verifier, /v_deleted_free <> 0/);
  assert.match(verifier, /INTERVAL '30 seconds'/);
  assert.match(verifier, /deleted membership regained grant access/);
});

test('cron authorization fails closed and requires the exact bearer secret', () => {
  assert.equal(isAuthorizedCronRequest(null, undefined), false);
  assert.equal(isAuthorizedCronRequest('Bearer ', ''), false);
  assert.equal(isAuthorizedCronRequest('Bearer wrong', 'correct'), false);
  assert.equal(isAuthorizedCronRequest('correct', 'correct'), false);
  assert.equal(
    isAuthorizedCronRequest('Bearer correct', 'correct'),
    true
  );
});

test('retention cron is a daily API route protected by CRON_SECRET', async () => {
  const config = JSON.parse(await read('vercel.json'));
  const routeSource = await read('src/app/api/cron/retention/route.ts');

  assert.deepEqual(config.crons, [
    {
      path: '/api/cron/retention',
      schedule: '17 3 * * *',
    },
  ]);
  assert.match(routeSource, /process\.env\.CRON_SECRET/);
  assert.match(routeSource, /\.rpc\(['"]prune_ats_retention['"]\)/);
  assert.match(routeSource, /free_tier_has_more/);
  assert.match(routeSource, /ai_rate_limits_has_more/);
  assert.match(routeSource, /status:\s*401/);
});

test('verified-access callers cannot bypass the V2 user quota through the free route', async () => {
  const routeSource = await read('src/app/api/analyze-free/route.ts');
  const entitlementCheck = routeSource.indexOf(
    'const hasPaidAccess = await hasServerEntitlement(request)'
  );
  const rejection = routeSource.indexOf("'USE_ANALYZE_V2'");
  const freeQuota = routeSource.indexOf(
    'checkAndIncrementUsage(getIdentitySeed(request))',
    entitlementCheck
  );
  const provider = routeSource.indexOf(
    'generateATSAnalysis(',
    entitlementCheck
  );

  assert.ok(entitlementCheck >= 0);
  assert.ok(rejection > entitlementCheck);
  assert.ok(freeQuota > rejection);
  assert.ok(provider > rejection);
  assert.match(
    routeSource,
    /if \(hasPaidAccess\) \{[\s\S]{0,500}status: 409/
  );
});
