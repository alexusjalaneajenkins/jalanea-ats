import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { generateATSAnalysis } from '@/lib/ai/gemini';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { parseATSAnalysisResponse } from '@/lib/ai/parseATSAnalysis';
import {
  createFreeTierIdentityHash,
  consumeDurableFreeTierQuota,
  FreeTierQuotaUnavailableError,
  hasRequiredFreeTierIdentitySalt,
} from '@/lib/ai/freeTierQuota';

// Increase function timeout ceiling for slower model responses on long inputs.
export const maxDuration = 60;

/**
 * Free tier daily usage tracking.
 *
 * Uses Supabase `free_tier_usage` for persistence across deploys. Quota
 * failures fail closed; process memory is never a production fallback.
 *
 * The GEMINI_API_KEY environment variable should be set in Vercel (not in code).
 */

const FREE_TIER_DAILY_LIMIT = 3;
const MAX_RESUME_CHARS = 30000;
const MAX_JOB_DESCRIPTION_CHARS = 20000;
const IDENTITY_VERSION = 'v3';
type StorageMode = 'supabase' | 'unknown';

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

interface PreparedInput {
  text: string;
  originalLength: number;
  truncated: boolean;
}

function prepareInput(raw: string, maxChars: number): PreparedInput {
  const normalized = raw.trim();
  const originalLength = normalized.length;

  if (originalLength <= maxChars) {
    return { text: normalized, originalLength, truncated: false };
  }

  const marker = '\n\n[... truncated for demo analysis ...]\n\n';
  const available = Math.max(0, maxChars - marker.length);
  const headSize = Math.floor(available * 0.7);
  const tailSize = available - headSize;
  const text = `${normalized.slice(0, headSize)}${marker}${normalized.slice(-tailSize)}`;

  return { text, originalLength, truncated: true };
}

function buildFreeTierHeaders(params?: {
  remaining?: number;
  resetAt?: string;
  storageMode?: StorageMode;
  inputTruncated?: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-FreeTier-Limit': FREE_TIER_DAILY_LIMIT.toString(),
    'X-FreeTier-Storage': params?.storageMode ?? 'unknown',
  };

  if (params?.remaining !== undefined) {
    headers['X-FreeTier-Remaining'] = params.remaining.toString();
  }

  if (params?.resetAt) {
    headers['X-FreeTier-Reset'] = params.resetAt;
  }

  if (params?.inputTruncated !== undefined) {
    headers['X-FreeTier-Input-Truncated'] = params.inputTruncated ? '1' : '0';
  }

  return headers;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (realIp?.trim() || 'unknown');
  return ip;
}

/**
 * Build a stable server-side identity seed for free-tier quotas.
 * This avoids quota resets from clearing browser cache/localStorage.
 */
function getIdentitySeed(request: NextRequest): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const secChUa = request.headers.get('sec-ch-ua') || 'unknown';
  const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || 'unknown';
  const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || 'unknown';

  return [
    IDENTITY_VERSION,
    ip,
    userAgent,
    acceptLanguage,
    secChUa,
    secChUaPlatform,
    secChUaMobile,
  ].join('|');
}

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

function getResetAt(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/** Key the request fingerprint so raw request signals are never stored. */
function hashIdentity(seed: string): string {
  return createFreeTierIdentityHash(
    seed,
    process.env.FREE_TIER_IDENTITY_SALT ?? ''
  );
}

/** Check if Supabase is configured for free tier tracking */
function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hasDurableFreeTierQuotaConfig(): boolean {
  return (
    hasSupabaseConfig()
    && hasRequiredFreeTierIdentitySalt(
      process.env.FREE_TIER_IDENTITY_SALT
    )
  );
}

function hasAuthCookieConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function createRequestSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // This route only needs read access to auth cookies.
      },
    },
  });
}

async function hasServerEntitlement(request: NextRequest): Promise<boolean> {
  if (!hasAuthCookieConfig()) return false;

  try {
    const supabase = createRequestSupabaseClient(request);
    if (!supabase) return false;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn('Free-tier entitlement auth lookup failed', {
        code: error.code,
      });
      return false;
    }

    if (!user || !hasSupabaseConfig()) return false;

    const adminSupabase = createServiceRoleClient();
    const { data: hasAccess, error: entitlementError } =
      await adminSupabase.rpc('has_active_access', {
        check_user_id: user.id,
      });

    if (entitlementError) {
      console.warn('Free-tier entitlement lookup failed', {
        code: entitlementError.code,
      });
      return false;
    }

    return hasAccess === true;
  } catch (error) {
    console.warn('Free-tier entitlement lookup failed', {
      errorType: errorName(error),
    });
    return false;
  }
}

// --- Supabase-backed tracking ---

async function getUsageFromDB(ipHash: string, today: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('free_tier_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('usage_date', today)
    .single();

  // PGRST116 = no rows returned (expected when no usage record yet).
  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data?.count ?? 0;
}

// --- Durable atomic quota tracking ---

async function checkAndIncrementUsage(identitySeed: string): Promise<{
  identityHash: string;
  allowed: boolean;
  remaining: number;
  resetAt: string;
  storageMode: StorageMode;
}> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (!hasSupabaseConfig()) {
    throw new FreeTierQuotaUnavailableError();
  }

  const quota = await consumeDurableFreeTierQuota({
    identitySeed,
    identitySalt: process.env.FREE_TIER_IDENTITY_SALT,
    limit: FREE_TIER_DAILY_LIMIT,
    async consume(identityHash) {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase.rpc(
        'consume_free_tier_usage',
        {
          p_identity_hash: identityHash,
          p_usage_date: today,
          p_limit: FREE_TIER_DAILY_LIMIT,
        }
      );

      if (error) {
        console.error('Atomic free-tier tracking failed', {
          code: error.code,
        });
        throw new FreeTierQuotaUnavailableError();
      }

      const result = Array.isArray(data) ? data[0] : data;
      return result ?? null;
    },
  });

  return {
    identityHash: quota.identityHash,
    allowed: quota.allowed,
    remaining: Math.max(
      0,
      FREE_TIER_DAILY_LIMIT - quota.currentCount
    ),
    resetAt,
    storageMode: 'supabase',
  };
}

async function getUsageStatus(identityHash: string): Promise<{ used: number; remaining: number; resetAt: string; storageMode: StorageMode }> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (!hasSupabaseConfig()) {
    throw new FreeTierQuotaUnavailableError();
  }

  const count = await getUsageFromDB(identityHash, today);
  return {
    used: count,
    remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - count),
    resetAt,
    storageMode: 'supabase',
  };
}

async function refundUsage(identityHash: string): Promise<void> {
  const today = getTodayUTC();

  if (!hasSupabaseConfig()) {
    throw new FreeTierQuotaUnavailableError();
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc('refund_free_tier_usage', {
    p_identity_hash: identityHash,
    p_usage_date: today,
  });

  if (error) throw new FreeTierQuotaUnavailableError();
}

// GET: Check remaining free tier usage
export async function GET(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Free tier not available', enabled: false },
      {
        status: 503,
        headers: buildFreeTierHeaders({ storageMode: 'unknown' }),
      }
    );
  }

  if (await hasServerEntitlement(request)) {
    return NextResponse.json(
      {
        enabled: false,
        dailyLimit: 0,
        used: 0,
        remaining: 0,
        resetAt: getResetAt(),
        paidAccess: true,
      },
      {
        headers: buildFreeTierHeaders({ storageMode: 'unknown' }),
      }
    );
  }

  if (!hasDurableFreeTierQuotaConfig()) {
    return NextResponse.json(
      { error: 'Free tier not available', enabled: false },
      {
        status: 503,
        headers: buildFreeTierHeaders({ storageMode: 'unknown' }),
      }
    );
  }

  let status: Awaited<ReturnType<typeof getUsageStatus>>;
  try {
    const identityHash = hashIdentity(getIdentitySeed(request));
    status = await getUsageStatus(identityHash);
  } catch (error) {
    console.error('Free-tier status unavailable', {
      errorType: errorName(error),
    });
    return NextResponse.json(
      { error: 'Free tier not available', enabled: false },
      {
        status: 503,
        headers: buildFreeTierHeaders({ storageMode: 'unknown' }),
      }
    );
  }

  return NextResponse.json(
    {
      enabled: true,
      dailyLimit: FREE_TIER_DAILY_LIMIT,
      used: status.used,
      remaining: status.remaining,
      resetAt: status.resetAt,
    },
    {
      headers: buildFreeTierHeaders({
        remaining: status.remaining,
        resetAt: status.resetAt,
        storageMode: status.storageMode,
      }),
    }
  );
}

// POST: Analyze using free tier
export async function POST(request: NextRequest) {
  let identityHash: string | null = null;
  let usageCounted = false;
  let storageMode: StorageMode = 'unknown';
  let inputTruncated = false;

  const safeRefund = async () => {
    if (!usageCounted || !identityHash) return;
    try {
      await refundUsage(identityHash);
      usageCounted = false;
    } catch (refundError) {
      console.error('Failed to refund free-tier usage', {
        errorType: errorName(refundError),
      });
    }
  };

  try {
    if (request.headers.get('x-ai-consent') !== 'acknowledged') {
      return NextResponse.json(
        { error: 'AI data-sharing consent is required' },
        {
          status: 428,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Free tier not available. Please configure your own API key.' },
        {
          status: 503,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    const hasPaidAccess = await hasServerEntitlement(request);
    if (hasPaidAccess) {
      return NextResponse.json(
        {
          error:
            'Verified-access accounts must use the advanced analysis route.',
          code: 'USE_ANALYZE_V2',
        },
        {
          status: 409,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    if (!hasDurableFreeTierQuotaConfig()) {
      return NextResponse.json(
        {
          error: 'Free-tier request limiting is temporarily unavailable.',
          code: 'FREE_TIER_QUOTA_UNAVAILABLE',
        },
        {
          status: 503,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    let remaining = 0;
    let resetAt = getResetAt();

    const usage = await checkAndIncrementUsage(getIdentitySeed(request));
    identityHash = usage.identityHash;
    remaining = usage.remaining;
    resetAt = usage.resetAt;
    storageMode = usage.storageMode;
    usageCounted = usage.allowed;

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'Daily free tier limit reached',
          message: `You've used all ${FREE_TIER_DAILY_LIMIT} free analyses for today. Add your own API key for unlimited use, or try again tomorrow.`,
          resetAt,
          remaining: 0,
        },
        {
          status: 429,
          headers: buildFreeTierHeaders({
            remaining: 0,
            resetAt,
            storageMode,
          }),
        }
      );
    }

    const body = await request.json();
    const rawResume = typeof body?.resume === 'string' ? body.resume : '';
    const rawJobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : '';
    const model = body?.model;

    if (!rawResume.trim() || !rawJobDescription.trim()) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        {
          status: 400,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    if (rawResume.trim().length < 50) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Resume seems too short. Please paste your full resume.' },
        {
          status: 400,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    if (rawJobDescription.trim().length < 50) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Job description seems too short. Please paste the full job posting.' },
        {
          status: 400,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    const preparedResume = prepareInput(rawResume, MAX_RESUME_CHARS);
    const preparedJobDescription = prepareInput(rawJobDescription, MAX_JOB_DESCRIPTION_CHARS);
    inputTruncated = preparedResume.truncated || preparedJobDescription.truncated;

    if (inputTruncated) {
      console.warn('Free tier input truncated for model request', {
        resumeChars: preparedResume.originalLength,
        jobDescriptionChars: preparedJobDescription.originalLength,
      });
    }

    let result;
    try {
      const response = await generateATSAnalysis(
        preparedResume.text,
        preparedJobDescription.text,
        model
      );
      result = parseATSAnalysisResponse(response);
    } catch (firstError) {
      // Retry once to smooth over occasional malformed model wrappers.
      console.error('Primary analysis parse failed; retrying once', {
        errorType: errorName(firstError),
      });
      const retryResponse = await generateATSAnalysis(
        preparedResume.text,
        preparedJobDescription.text,
        model
      );
      try {
        result = parseATSAnalysisResponse(retryResponse);
      } catch (retryError) {
        console.error('Analysis parse retry failed', {
          errorType: errorName(retryError),
        });

        await safeRefund();

        return NextResponse.json(
          {
            error: 'Analysis response could not be processed. Please try again.',
            code: 'ANALYSIS_PARSE_FAILED',
          },
          {
            status: 500,
            headers: buildFreeTierHeaders({
              storageMode,
              inputTruncated,
            }),
          }
        );
      }
    }

    return NextResponse.json(
      {
        ...result,
        _freeTier: {
          remaining,
          resetAt,
        },
        _input: {
          resumeChars: preparedResume.originalLength,
          jobDescriptionChars: preparedJobDescription.originalLength,
          resumeTruncated: preparedResume.truncated,
          jobDescriptionTruncated: preparedJobDescription.truncated,
        },
      },
      {
        headers: buildFreeTierHeaders({
          remaining,
          resetAt,
          storageMode,
          inputTruncated,
        }),
      }
    );
  } catch (error) {
    await safeRefund();
    console.error('Free tier analysis failed', {
      errorType: errorName(error),
    });
    return NextResponse.json(
      {
        error: 'Analysis is temporarily unavailable. Please try again.',
        code:
          error instanceof FreeTierQuotaUnavailableError
            ? 'FREE_TIER_QUOTA_UNAVAILABLE'
            : 'ANALYSIS_FAILED',
      },
      {
        status:
          error instanceof FreeTierQuotaUnavailableError ? 503 : 500,
        headers: buildFreeTierHeaders({
          storageMode,
          inputTruncated,
        }),
      }
    );
  }
}
