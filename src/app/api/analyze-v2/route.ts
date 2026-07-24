import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { runV2Analysis } from '@/lib/v2';
import { handleV2AnalysisRequest } from '@/lib/v2/request';

export const maxDuration = 60;

const MAX_REQUESTS_PER_MINUTE = 5;
const V2_MODEL = 'gemini-2.5-flash';

interface AuthorizedUser {
  id: string;
}

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
        // This endpoint only reads the authenticated session.
      },
    },
  });
}

async function getAuthorizedUser(request: NextRequest): Promise<AuthorizedUser | null> {
  const supabase = createRequestSupabaseClient(request);
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const adminSupabase = createServiceRoleClient();
  const { data: hasAccess, error: subscriptionError } = await adminSupabase
    .rpc('has_active_access', {
      check_user_id: user.id,
    });

  if (subscriptionError) {
    console.error('V2 subscription lookup failed', {
      code: subscriptionError.code,
    });
    throw new Error('Subscription lookup failed');
  }

  return hasAccess === true ? { id: user.id } : null;
}

function getCurrentMinuteWindow(): string {
  const now = new Date();
  now.setUTCSeconds(0, 0);
  return now.toISOString();
}

async function consumeRateLimit(userId: string): Promise<boolean> {
  const adminSupabase = createServiceRoleClient();
  const { data, error } = await adminSupabase.rpc('consume_user_ai_rate_limit', {
    p_bucket: `analyze-v2:${userId}`,
    p_window_start: getCurrentMinuteWindow(),
    p_limit: MAX_REQUESTS_PER_MINUTE,
    p_user_id: userId,
  });

  if (error) {
    console.error('V2 rate-limit check failed', { code: error.code });
    throw new Error('Rate-limit lookup failed');
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result?.allowed === true;
}

export async function POST(request: NextRequest) {
  return handleV2AnalysisRequest(request, {
    isProviderConfigured: () =>
      Boolean(process.env.GEMINI_API_KEY || process.env.DEMO_GEMINI_API_KEY),
    authorize: (incomingRequest) =>
      getAuthorizedUser(incomingRequest as NextRequest),
    consumeQuota: consumeRateLimit,
    analyze: (resume, jobDescription, signal) => {
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.DEMO_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Provider unavailable');
      }
      return runV2Analysis(
        resume,
        jobDescription,
        apiKey,
        V2_MODEL,
        signal
      );
    },
  });
}
