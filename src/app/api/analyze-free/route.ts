import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { generateATSAnalysis } from '@/lib/ai/gemini';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { parseATSAnalysisResponse } from '@/lib/ai/parseATSAnalysis';

// Increase function timeout ceiling for slower model responses on long inputs.
export const maxDuration = 60;

/**
 * Free tier daily usage tracking.
 *
 * Uses Supabase `free_tier_usage` table for persistence across deploys.
 * Falls back to in-memory Map if Supabase is unavailable.
 *
 * The GEMINI_API_KEY environment variable should be set in Vercel (not in code).
 */

const FREE_TIER_DAILY_LIMIT = 3;
const MAX_RESUME_CHARS = 30000;
const MAX_JOB_DESCRIPTION_CHARS = 20000;
const IDENTITY_VERSION = 'v3';
const OWNER_UNLIMITED_EMAILS = new Set([
  'alexxusjenkins91@gmail.com',
]);
type StorageMode = 'supabase' | 'memory' | 'unknown';

// In-memory fallback (used only if Supabase is unavailable)
const fallbackMap = new Map<string, { date: string; count: number }>();

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

/** Hash identity seed with SHA-256 so we never store raw fingerprint values */
async function hashIdentity(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = process.env.FREE_TIER_IDENTITY_SALT || '_jalanea_salt';
  const data = encoder.encode(`${seed}${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Check if Supabase is configured for free tier tracking */
function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hasAuthCookieConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function isOwnerUnlimitedEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_UNLIMITED_EMAILS.has(email.trim().toLowerCase());
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

async function hasOwnerUnlimitedBypass(request: NextRequest): Promise<boolean> {
  if (!hasAuthCookieConfig()) return false;

  try {
    const supabase = createRequestSupabaseClient(request);
    if (!supabase) return false;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn('Owner bypass auth lookup failed:', error.message);
      return false;
    }

    return isOwnerUnlimitedEmail(user?.email);
  } catch (error) {
    console.warn('Owner bypass lookup failed:', error);
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

async function incrementUsageInDB(ipHash: string, today: string, currentCount: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('free_tier_usage').upsert({
    ip_hash: ipHash,
    usage_date: today,
    count: currentCount + 1,
  });

  if (error) {
    throw error;
  }
}

async function decrementUsageInDB(ipHash: string, today: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('free_tier_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('usage_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data && data.count > 0) {
    const { error: upsertError } = await supabase.from('free_tier_usage').upsert({
      ip_hash: ipHash,
      usage_date: today,
      count: data.count - 1,
    });

    if (upsertError) {
      throw upsertError;
    }
  }
}

// --- Unified tracking (DB with in-memory fallback) ---

async function checkAndIncrementUsage(identityHash: string): Promise<{ allowed: boolean; remaining: number; resetAt: string; storageMode: StorageMode }> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (hasSupabaseConfig()) {
    try {
      const currentCount = await getUsageFromDB(identityHash, today);

      if (currentCount >= FREE_TIER_DAILY_LIMIT) {
        return { allowed: false, remaining: 0, resetAt, storageMode: 'supabase' };
      }

      await incrementUsageInDB(identityHash, today, currentCount);
      return {
        allowed: true,
        remaining: FREE_TIER_DAILY_LIMIT - currentCount - 1,
        resetAt,
        storageMode: 'supabase',
      };
    } catch (err) {
      console.error('Supabase free tier tracking failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(identityHash);
  if (!record || record.date !== today) {
    fallbackMap.set(identityHash, { date: today, count: 1 });
    return { allowed: true, remaining: FREE_TIER_DAILY_LIMIT - 1, resetAt, storageMode: 'memory' };
  }
  if (record.count < FREE_TIER_DAILY_LIMIT) {
    record.count++;
    return {
      allowed: true,
      remaining: FREE_TIER_DAILY_LIMIT - record.count,
      resetAt,
      storageMode: 'memory',
    };
  }
  return { allowed: false, remaining: 0, resetAt, storageMode: 'memory' };
}

async function getUsageStatus(identityHash: string): Promise<{ used: number; remaining: number; resetAt: string; storageMode: StorageMode }> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (hasSupabaseConfig()) {
    try {
      const count = await getUsageFromDB(identityHash, today);
      return {
        used: count,
        remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - count),
        resetAt,
        storageMode: 'supabase',
      };
    } catch (err) {
      console.error('Supabase free tier status failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(identityHash);
  if (!record || record.date !== today) {
    return { used: 0, remaining: FREE_TIER_DAILY_LIMIT, resetAt, storageMode: 'memory' };
  }
  return {
    used: record.count,
    remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - record.count),
    resetAt,
    storageMode: 'memory',
  };
}

async function refundUsage(identityHash: string): Promise<void> {
  const today = getTodayUTC();

  if (hasSupabaseConfig()) {
    try {
      await decrementUsageInDB(identityHash, today);
      return;
    } catch (err) {
      console.error('Supabase refund failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(identityHash);
  if (record) record.count = Math.max(0, record.count - 1);
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

  if (await hasOwnerUnlimitedBypass(request)) {
    return NextResponse.json(
      {
        enabled: false,
        dailyLimit: 0,
        used: 0,
        remaining: 0,
        resetAt: getResetAt(),
        ownerUnlimited: true,
      },
      {
        headers: buildFreeTierHeaders({ storageMode: 'unknown' }),
      }
    );
  }

  const identityHash = await hashIdentity(getIdentitySeed(request));
  const status = await getUsageStatus(identityHash);

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
  let ownerUnlimited = false;

  const safeRefund = async () => {
    if (!usageCounted || !identityHash) return;
    try {
      await refundUsage(identityHash);
      usageCounted = false;
    } catch (refundError) {
      console.error('Failed to refund free tier usage:', refundError);
    }
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Free tier not available. Please configure your own API key.' },
        {
          status: 503,
          headers: buildFreeTierHeaders({ storageMode }),
        }
      );
    }

    ownerUnlimited = await hasOwnerUnlimitedBypass(request);

    let remaining = 0;
    let resetAt = getResetAt();

    if (!ownerUnlimited) {
      identityHash = await hashIdentity(getIdentitySeed(request));
      const usage = await checkAndIncrementUsage(identityHash);
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
      console.error('Primary parse attempt failed, retrying once:', firstError);
      const retryResponse = await generateATSAnalysis(
        preparedResume.text,
        preparedJobDescription.text,
        model
      );
      try {
        result = parseATSAnalysisResponse(retryResponse);
      } catch (retryError) {
        console.error('Retry parse failed:', retryError);
        console.error('Retry raw response (first 500 chars):', retryResponse?.slice(0, 500));

        await safeRefund();

        // Include diagnostic info to help debug
        const errorMessage = retryError instanceof Error ? retryError.message : 'Unknown parse error';
        const responsePreview = retryResponse?.slice(0, 200) || 'No response';

        return NextResponse.json(
          {
            error: 'Failed to parse analysis. Please try again.',
            debug: {
              parseError: errorMessage,
              responsePreview: responsePreview,
            }
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

    if (ownerUnlimited) {
      return NextResponse.json({
        ...result,
        _input: {
          resumeChars: preparedResume.originalLength,
          jobDescriptionChars: preparedJobDescription.originalLength,
          resumeTruncated: preparedResume.truncated,
          jobDescriptionTruncated: preparedJobDescription.truncated,
        },
      });
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
    console.error('Free Tier Analysis Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
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
