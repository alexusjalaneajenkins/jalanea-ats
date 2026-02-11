/**
 * Account Deletion API
 *
 * Handles full account deletion including:
 * - Canceling any active Stripe subscriptions
 * - Deleting user data from database
 * - Deleting the auth user
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function DELETE() {
  try {
    // Create Supabase server client for auth
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

    const adminSupabase = createServiceRoleClient();

    // Get user's profile with Stripe customer ID
    const { data: profile, error: profileLookupError } = await adminSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('Error looking up profile for deletion:', profileLookupError);
    }

    // Cancel any active Stripe subscriptions
    if (profile?.stripe_customer_id) {
      try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      } catch (stripeError) {
        console.error('Error canceling Stripe subscriptions:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Delete user data from database tables
    // RLS policies should handle cascade, but we explicitly delete for safety
    const { error: subscriptionDeleteError } = await adminSupabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (subscriptionDeleteError) {
      console.error('Error deleting subscriptions:', subscriptionDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete account data' },
        { status: 500 }
      );
    }

    const { error: profileDeleteError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete account data' },
        { status: 500 }
      );
    }

    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
