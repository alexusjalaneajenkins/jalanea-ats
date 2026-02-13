import { NextRequest, NextResponse } from 'next/server';
import { generateATSAnalysis } from '@/lib/ai/gemini';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { parseATSAnalysisResponse } from '@/lib/ai/parseATSAnalysis';

/**
 * Free tier daily usage tracking.
 *
 * Uses Supabase `free_tier_usage` table for persistence across deploys.
 * Falls back to in-memory Map if Supabase is unavailable.
 *
 * The GEMINI_API_KEY environment variable should be set in Vercel (not in code).
 */

const FREE_TIER_DAILY_LIMIT = 3;

// In-memory fallback (used only if Supabase is unavailable)
const fallbackMap = new Map<string, { date: string; count: number }>();

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  return ip;
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

/** Hash IP with SHA-256 so we never store raw IPs */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_jalanea_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Check if Supabase is configured for free tier tracking */
function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// --- Supabase-backed tracking ---

async function getUsageFromDB(ipHash: string, today: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('free_tier_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('usage_date', today)
    .single();

  return data?.count ?? 0;
}

async function incrementUsageInDB(ipHash: string, today: string, currentCount: number): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from('free_tier_usage').upsert({
    ip_hash: ipHash,
    usage_date: today,
    count: currentCount + 1,
  });
}

async function decrementUsageInDB(ipHash: string, today: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('free_tier_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('usage_date', today)
    .single();

  if (data && data.count > 0) {
    await supabase.from('free_tier_usage').upsert({
      ip_hash: ipHash,
      usage_date: today,
      count: data.count - 1,
    });
  }
}

// --- Unified tracking (DB with in-memory fallback) ---

async function checkAndIncrementUsage(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (hasSupabaseConfig()) {
    try {
      const ipHash = await hashIP(ip);
      const currentCount = await getUsageFromDB(ipHash, today);

      if (currentCount >= FREE_TIER_DAILY_LIMIT) {
        return { allowed: false, remaining: 0, resetAt };
      }

      await incrementUsageInDB(ipHash, today, currentCount);
      return { allowed: true, remaining: FREE_TIER_DAILY_LIMIT - currentCount - 1, resetAt };
    } catch (err) {
      console.error('Supabase free tier tracking failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(ip);
  if (!record || record.date !== today) {
    fallbackMap.set(ip, { date: today, count: 1 });
    return { allowed: true, remaining: FREE_TIER_DAILY_LIMIT - 1, resetAt };
  }
  if (record.count < FREE_TIER_DAILY_LIMIT) {
    record.count++;
    return { allowed: true, remaining: FREE_TIER_DAILY_LIMIT - record.count, resetAt };
  }
  return { allowed: false, remaining: 0, resetAt };
}

async function getUsageStatus(ip: string): Promise<{ used: number; remaining: number; resetAt: string }> {
  const today = getTodayUTC();
  const resetAt = getResetAt();

  if (hasSupabaseConfig()) {
    try {
      const ipHash = await hashIP(ip);
      const count = await getUsageFromDB(ipHash, today);
      return { used: count, remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - count), resetAt };
    } catch (err) {
      console.error('Supabase free tier status failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(ip);
  if (!record || record.date !== today) {
    return { used: 0, remaining: FREE_TIER_DAILY_LIMIT, resetAt };
  }
  return { used: record.count, remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - record.count), resetAt };
}

async function refundUsage(ip: string): Promise<void> {
  const today = getTodayUTC();

  if (hasSupabaseConfig()) {
    try {
      const ipHash = await hashIP(ip);
      await decrementUsageInDB(ipHash, today);
      return;
    } catch (err) {
      console.error('Supabase refund failed, falling back to memory:', err);
    }
  }

  // Fallback: in-memory
  const record = fallbackMap.get(ip);
  if (record) record.count = Math.max(0, record.count - 1);
}

// GET: Check remaining free tier usage
export async function GET(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Free tier not available', enabled: false },
      { status: 503 }
    );
  }

  const ip = getClientIP(request);
  const status = await getUsageStatus(ip);

  return NextResponse.json({
    enabled: true,
    dailyLimit: FREE_TIER_DAILY_LIMIT,
    used: status.used,
    remaining: status.remaining,
    resetAt: status.resetAt,
  });
}

// POST: Analyze using free tier
export async function POST(request: NextRequest) {
  let ip: string | null = null;
  let usageCounted = false;

  const safeRefund = async () => {
    if (!usageCounted || !ip) return;
    try {
      await refundUsage(ip);
      usageCounted = false;
    } catch (refundError) {
      console.error('Failed to refund free tier usage:', refundError);
    }
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Free tier not available. Please configure your own API key.' },
        { status: 503 }
      );
    }

    ip = getClientIP(request);
    const { allowed, remaining, resetAt } = await checkAndIncrementUsage(ip);
    usageCounted = allowed;

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Daily free tier limit reached',
          message: `You've used all ${FREE_TIER_DAILY_LIMIT} free analyses for today. Add your own API key for unlimited use, or try again tomorrow.`,
          resetAt,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'X-FreeTier-Limit': FREE_TIER_DAILY_LIMIT.toString(),
            'X-FreeTier-Remaining': '0',
            'X-FreeTier-Reset': resetAt,
          }
        }
      );
    }

    const body = await request.json();
    const { resume, jobDescription, model } = body;

    if (!resume || !jobDescription) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        { status: 400 }
      );
    }

    if (resume.length < 50) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Resume seems too short. Please paste your full resume.' },
        { status: 400 }
      );
    }

    if (jobDescription.length < 50) {
      await safeRefund();
      return NextResponse.json(
        { error: 'Job description seems too short. Please paste the full job posting.' },
        { status: 400 }
      );
    }

    let result;
    try {
      const response = await generateATSAnalysis(resume, jobDescription, model);
      result = parseATSAnalysisResponse(response);
    } catch (firstError) {
      // Retry once to smooth over occasional malformed model wrappers.
      console.error('Primary parse attempt failed, retrying once:', firstError);
      const retryResponse = await generateATSAnalysis(resume, jobDescription, model);
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
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        ...result,
        _freeTier: {
          remaining,
          resetAt,
        }
      },
      {
        headers: {
          'X-FreeTier-Limit': FREE_TIER_DAILY_LIMIT.toString(),
          'X-FreeTier-Remaining': remaining.toString(),
          'X-FreeTier-Reset': resetAt,
        }
      }
    );
  } catch (error) {
    await safeRefund();
    console.error('Free Tier Analysis Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
