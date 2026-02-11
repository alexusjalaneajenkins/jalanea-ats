import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Bullet Improvement API
 *
 * Generates 3 variations of a resume bullet point:
 * - High Impact (metrics/numbers focus)
 * - Leadership (action verbs focus)
 * - Concise (shorter, punchier)
 *
 * Rate limited: 3/day for unauthenticated users, unlimited for paid subscribers.
 */

const DAILY_LIMIT = 3;

// In-memory fallback for rate limiting (used if Supabase unavailable)
const rateLimitMap = new Map<string, { date: string; count: number }>();

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
}

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/** Hash IP so we don't store raw IPs */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_jalanea_bullet_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Check if user has active subscription (server-side) */
async function checkPaidAccess(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return false;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in API routes
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .single();

    return !!subscription;
  } catch {
    return false;
  }
}

/** Check and increment rate limit for IP */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = getTodayUTC();
  const ipHash = await hashIP(ip);

  // In-memory rate limiting
  const record = rateLimitMap.get(ipHash);
  if (!record || record.date !== today) {
    rateLimitMap.set(ipHash, { date: today, count: 1 });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }
  if (record.count < DAILY_LIMIT) {
    record.count++;
    return { allowed: true, remaining: DAILY_LIMIT - record.count };
  }
  return { allowed: false, remaining: 0 };
}

export interface BulletVariation {
  id: string;
  strategy: 'high-impact' | 'leadership' | 'concise';
  label: string;
  text: string;
  highlights: {
    type: 'metric' | 'verb' | 'keyword';
    text: string;
    start: number;
    end: number;
  }[];
}

export interface ImproveBulletResponse {
  original: string;
  variations: BulletVariation[];
}

const GEMINI_MODEL = 'gemini-2.0-flash';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not available. Please configure your own API key.' },
        { status: 503 }
      );
    }

    // Check if user has paid access - if so, skip rate limiting
    const hasPaidAccess = await checkPaidAccess();
    let successHeaders: Record<string, string> | undefined;

    if (!hasPaidAccess) {
      // Apply rate limiting for non-paid users
      const ip = getClientIP(request);
      const { allowed, remaining } = await checkRateLimit(ip);

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: `You've used all ${DAILY_LIMIT} free bullet improvements for today. Subscribe for unlimited access.`,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': DAILY_LIMIT.toString(),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      successHeaders = {
        'X-RateLimit-Limit': DAILY_LIMIT.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      };
    }

    const body = await request.json();
    const { bullet, jobDescription, missingKeywords = [] } = body;

    if (!bullet || bullet.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a bullet point to improve.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a professional resume writer. Improve this resume bullet point by creating 3 variations.

ORIGINAL BULLET:
"${bullet}"

${jobDescription ? `JOB DESCRIPTION CONTEXT:
${jobDescription.slice(0, 1000)}` : ''}

${missingKeywords.length > 0 ? `KEYWORDS TO INCORPORATE (if relevant):
${missingKeywords.slice(0, 10).join(', ')}` : ''}

Generate exactly 3 variations:

1. HIGH IMPACT - Focus on quantifiable results, metrics, and numbers. If the original lacks numbers, add realistic placeholders like "X%" or "[number]" that the user can fill in.

2. LEADERSHIP - Focus on strong action verbs that demonstrate leadership, initiative, and ownership. Start with powerful verbs like: Spearheaded, Orchestrated, Championed, Pioneered, Transformed.

3. CONCISE - Make it shorter and punchier while keeping the core message. Remove filler words and unnecessary qualifiers.

RULES:
- Keep each variation under 150 characters
- Maintain professional tone
- Don't invent specific numbers (use placeholders)
- Start each bullet with a strong action verb
- Each variation should be meaningfully different

Respond in this exact JSON format:
{
  "variations": [
    {
      "strategy": "high-impact",
      "text": "your improved bullet here",
      "highlights": [
        {"type": "metric", "text": "the metric text"}
      ]
    },
    {
      "strategy": "leadership",
      "text": "your improved bullet here",
      "highlights": [
        {"type": "verb", "text": "the action verb"}
      ]
    },
    {
      "strategy": "concise",
      "text": "your improved bullet here",
      "highlights": []
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON response
    let parsed;
    try {
      // Try direct parse
      parsed = JSON.parse(response);
    } catch {
      // Try extracting from code block
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1]);
      } else {
        // Try finding JSON object
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON in response');
        }
      }
    }

    // Add IDs and labels to variations
    const strategyLabels: Record<string, string> = {
      'high-impact': 'High Impact',
      'leadership': 'Leadership',
      'concise': 'Concise',
    };

    const variations: BulletVariation[] = parsed.variations.map(
      (v: { strategy: string; text: string; highlights?: { type: string; text: string }[] }, i: number) => {
        // Calculate highlight positions
        const highlights = (v.highlights || []).map((h: { type: string; text: string }) => {
          const start = v.text.indexOf(h.text);
          return {
            type: h.type as 'metric' | 'verb' | 'keyword',
            text: h.text,
            start,
            end: start + h.text.length,
          };
        }).filter((h: { start: number }) => h.start >= 0);

        return {
          id: `var-${i}-${Date.now()}`,
          strategy: v.strategy,
          label: strategyLabels[v.strategy] || v.strategy,
          text: v.text,
          highlights,
        };
      }
    );

    return NextResponse.json(
      {
        original: bullet,
        variations,
      },
      successHeaders ? { headers: successHeaders } : undefined
    );
  } catch (error) {
    console.error('Bullet improvement error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to improve bullet' },
      { status: 500 }
    );
  }
}
