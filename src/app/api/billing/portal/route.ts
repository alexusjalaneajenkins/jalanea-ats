/**
 * Stripe Customer Portal API
 *
 * Uses the ATS-dedicated customer mapping and verifies its provider metadata
 * before creating a portal session.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getBillingReturnUrls,
  getCanonicalAppOrigin,
} from '@/lib/billing/appUrl';
import { isAtsDedicatedCustomer } from '@/lib/billing/stripeObjectScope';

export async function POST() {
  try {
    // Create Supabase server client
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: mapping, error: mappingError } =
      await createServiceRoleClient()
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
    if (mappingError || !mapping?.customer_id) {
      return NextResponse.json(
        { error: 'No Jalanea ATS billing account was found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(mapping.customer_id);
    if (
      customer.deleted ||
      !isAtsDedicatedCustomer({
        metadata: customer.metadata,
        authenticatedUserId: user.id,
      })
    ) {
      return NextResponse.json(
        { error: 'The Jalanea ATS billing account could not be verified.' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: getBillingReturnUrls(getCanonicalAppOrigin()).portalReturn,
    });

    return NextResponse.json(
      { url: session.url },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    console.error('Billing portal request failed');
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
