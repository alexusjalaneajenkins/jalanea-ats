import { NextResponse } from 'next/server';

import { isAuthorizedCronRequest } from '@/lib/retention/cronAuthorization';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get('authorization'),
      process.env.CRON_SECRET
    )
  ) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('prune_ats_retention');

    if (error) {
      console.error('ATS retention cleanup failed', { code: error.code });
      return NextResponse.json(
        { error: 'Retention cleanup failed.' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(
      {
        ok: true,
        deleted: {
          freeTierUsage:
            typeof result?.deleted_free_tier_usage === 'number'
              ? result.deleted_free_tier_usage
              : 0,
          aiRateLimits:
            typeof result?.deleted_ai_rate_limits === 'number'
              ? result.deleted_ai_rate_limits
              : 0,
        },
        backlog: {
          freeTierUsage: result?.free_tier_has_more === true,
          aiRateLimits: result?.ai_rate_limits_has_more === true,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    console.error('ATS retention cleanup failed');
    return NextResponse.json(
      { error: 'Retention cleanup failed.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
