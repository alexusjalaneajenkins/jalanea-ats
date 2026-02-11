/**
 * Server-side Supabase Client
 *
 * Uses service role key to bypass RLS for admin operations.
 * ONLY use in API routes and webhooks, never expose to client.
 */

import { createClient } from '@supabase/supabase-js';

// Service role client - bypasses RLS
// Use for webhook handlers and admin operations
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Type definitions for our database tables
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  billing_address: Record<string, unknown> | null;
  payment_method: Record<string, unknown> | null;
  stripe_customer_id: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid';
  metadata: Record<string, unknown> | null;
  price_id: string | null;
  quantity: number | null;
  cancel_at_period_end: boolean | null;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_lifetime: boolean;
}

export interface Product {
  id: string;
  active: boolean | null;
  name: string | null;
  description: string | null;
  image: string | null;
  metadata: Record<string, unknown> | null;
}

export interface Price {
  id: string;
  product_id: string | null;
  active: boolean | null;
  description: string | null;
  unit_amount: number | null;
  currency: string | null;
  type: 'one_time' | 'recurring' | null;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  interval_count: number | null;
  metadata: Record<string, unknown> | null;
}
