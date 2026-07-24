import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

import { subscriptionGrantsAccess } from '@/lib/billing/subscriptionAccess';
import { createServiceRoleClient } from '@/lib/supabase-server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

function createRequestSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Session refresh is handled by the application proxy.
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const requestSupabase = createRequestSupabaseClient(request);
  if (!requestSupabase) {
    return NextResponse.json(
      { error: 'Entitlement service is unavailable.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await requestSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated.' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const adminSupabase = createServiceRoleClient();
    const [accessResult, subscriptionsResult] = await Promise.all([
      adminSupabase.rpc('has_active_access', {
        check_user_id: user.id,
      }),
      adminSupabase
        .from('subscriptions')
        .select('status, is_lifetime, payment_status, current_period_end, created')
        .eq('user_id', user.id)
        .order('created', { ascending: false })
        .limit(20),
    ]);

    if (accessResult.error || subscriptionsResult.error) {
      console.error('Entitlement lookup failed', {
        accessCode: accessResult.error?.code,
        subscriptionCode: subscriptionsResult.error?.code,
      });
      return NextResponse.json(
        { error: 'Entitlement status is temporarily unavailable.' },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const subscriptions = subscriptionsResult.data ?? [];
    const entitledSubscription =
      subscriptions.find(subscriptionGrantsAccess) ?? null;
    const billingRelationship =
      subscriptions.find(
        (record) =>
          record.is_lifetime !== true &&
          record.status !== 'canceled' &&
          record.status !== 'incomplete_expired'
      ) ?? null;
    const subscription = entitledSubscription ?? billingRelationship;
    const hasAccess = accessResult.data === true;
    const accessSource = entitledSubscription
      ? (entitledSubscription.is_lifetime === true
          ? 'lifetime'
          : 'subscription')
      : (hasAccess ? 'grant' : null);

    return NextResponse.json(
      {
        hasAccess,
        accessSource,
        // Administrative grants are complimentary access, not paid lifetime
        // purchases. Keep those concepts separate in account and pricing UI.
        isLifetime: entitledSubscription?.is_lifetime === true,
        subscription: subscription
          ? {
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
            }
          : null,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    console.error('Entitlement service failed');
    return NextResponse.json(
      { error: 'Entitlement status is temporarily unavailable.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
