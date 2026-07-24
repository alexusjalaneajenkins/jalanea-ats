import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe, STRIPE_PRICES } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { classifyCheckoutStatus } from '@/lib/billing/checkoutStatus';
import { identifyAtsCheckoutSession } from '@/lib/billing/stripeObjectScope';

const CHECKOUT_SESSION_ID = /^cs_(?:test_|live_)?[A-Za-z0-9_]+$/;
async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { state: 'invalid', error: 'Not authenticated' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim() ?? '';
  if (
    !sessionId ||
    sessionId.length > 255 ||
    !CHECKOUT_SESSION_ID.test(sessionId)
  ) {
    return NextResponse.json(
      { state: 'invalid', error: 'A valid checkout session is required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    });
    const price = session.line_items?.data[0]?.price;
    const actualPriceId =
      typeof price === 'string' ? price : price?.id ?? null;
    const identity = identifyAtsCheckoutSession({
      metadata: session.metadata,
      mode: session.mode,
      actualPriceId,
      actualCurrency:
        typeof price === 'string'
          ? session.currency
          : price?.currency ?? session.currency,
      actualUnitAmount:
        typeof price === 'string'
          ? session.amount_total
          : price?.unit_amount ?? session.amount_total,
      actualQuantity: session.line_items?.data[0]?.quantity ?? null,
      expectedLifetimePriceId: STRIPE_PRICES.LIFETIME,
      expectedMonthlyPriceId: STRIPE_PRICES.MONTHLY,
    });
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? '';

    if (
      !identity ||
      !customerId
    ) {
      return NextResponse.json(
        { state: 'invalid', error: 'This is not a Jalanea ATS checkout session.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const supabase = createServiceRoleClient();
    const [entitlementResult, attemptResult, customerResult] = await Promise.all([
      supabase.rpc('has_active_access', {
        check_user_id: userId,
      }),
      supabase
        .from('stripe_checkout_attempts')
        .select('id, plan_type, stripe_session_id, stripe_customer_id')
        .eq('id', identity.attemptId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .eq('customer_id', customerId)
        .maybeSingle(),
    ]);

    if (
      entitlementResult.error ||
      attemptResult.error ||
      customerResult.error
    ) {
      throw new Error('checkout_binding_lookup_failed');
    }

    const atsSessionVerified =
      attemptResult.data?.id === identity.attemptId &&
      attemptResult.data.plan_type === identity.planType &&
      attemptResult.data.stripe_session_id === session.id &&
      attemptResult.data.stripe_customer_id === customerId &&
      customerResult.data?.customer_id === customerId &&
      identity.userId === userId;

    const state = classifyCheckoutStatus({
      authenticatedUserId: userId,
      clientReferenceId: session.client_reference_id,
      metadataUserId: session.metadata?.user_id ?? null,
      atsSessionVerified,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      hasEntitlement: entitlementResult.data === true,
    });

    const responseStatus = state === 'invalid' ? 404 : 200;
    return NextResponse.json(
      {
        state,
        paymentStatus: state === 'invalid' ? undefined : session.payment_status,
        sessionStatus: state === 'invalid' ? undefined : session.status,
      },
      {
        status: responseStatus,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch {
    console.error('Checkout status verification failed');
    return NextResponse.json(
      {
        state: 'invalid',
        error: 'This checkout session could not be verified.',
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
