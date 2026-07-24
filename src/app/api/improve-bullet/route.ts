import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

import {
  handleImproveBulletRequest,
  type BulletVariation,
  type ImproveBulletInput,
  type ImproveBulletQuotaDecision,
  type ImproveBulletResponse,
} from '@/lib/ai/improveBulletRequest';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const maxDuration = 60;

const FREE_DAILY_LIMIT = 3;
const PAID_PER_MINUTE_LIMIT = 30;
const GEMINI_MODEL = 'gemini-2.0-flash';
const IDENTITY_VERSION = 'v1';

function getProviderKey(): string | null {
  return process.env.GEMINI_API_KEY
    || process.env.DEMO_GEMINI_API_KEY
    || null;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getAnonymousIdentitySeed(request: NextRequest): string {
  return [
    IDENTITY_VERSION,
    getClientIP(request),
    request.headers.get('user-agent') || 'unknown',
    request.headers.get('accept-language') || 'unknown',
    request.headers.get('sec-ch-ua') || 'unknown',
    request.headers.get('sec-ch-ua-platform') || 'unknown',
  ].join('|');
}

async function hashQuotaIdentity(identity: string): Promise<string> {
  const secret = process.env.AI_RATE_LIMIT_IDENTITY_SALT
    || process.env.FREE_TIER_IDENTITY_SALT
    || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error('AI quota identity hashing is unavailable');
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${identity}|${secret}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
        // This route only reads the authenticated session.
      },
    },
  });
}

async function resolvePaidIdentity(
  request: NextRequest
): Promise<string | null> {
  const requestSupabase = createRequestSupabaseClient(request);
  if (!requestSupabase) return null;

  const {
    data: { user },
  } = await requestSupabase.auth.getUser();

  if (!user) return null;

  const adminSupabase = createServiceRoleClient();
  const { data: hasAccess, error } = await adminSupabase.rpc(
    'has_active_access',
    {
      check_user_id: user.id,
    }
  );

  if (error) {
    throw new Error('Subscription lookup failed');
  }

  return hasAccess === true ? user.id : null;
}

function getUtcDayWindow(): {
  key: string;
  start: string;
  resetAt: string;
} {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const reset = new Date(start);
  reset.setUTCDate(reset.getUTCDate() + 1);

  return {
    key: start.toISOString().slice(0, 10),
    start: start.toISOString(),
    resetAt: reset.toISOString(),
  };
}

function getMinuteWindow(): { start: string; resetAt: string } {
  const start = new Date();
  start.setUTCSeconds(0, 0);
  const reset = new Date(start.getTime() + 60_000);
  return {
    start: start.toISOString(),
    resetAt: reset.toISOString(),
  };
}

async function consumeAtomicQuota(params: {
  request: NextRequest;
  tier: 'free' | 'paid';
  paidIdentity: string | null;
}): Promise<ImproveBulletQuotaDecision> {
  let bucket: string;
  let windowStart: string;
  let resetAt: string;
  let limit: number;

  if (params.tier === 'paid') {
    if (!params.paidIdentity) {
      throw new Error('Paid quota identity is missing');
    }

    const identityHash = await hashQuotaIdentity(
      `paid:${params.paidIdentity}`
    );
    const window = getMinuteWindow();
    bucket = `improve-bullet:paid:${identityHash}`;
    windowStart = window.start;
    resetAt = window.resetAt;
    limit = PAID_PER_MINUTE_LIMIT;
  } else {
    const identityHash = await hashQuotaIdentity(
      `anonymous:${getAnonymousIdentitySeed(params.request)}`
    );
    const window = getUtcDayWindow();
    bucket = `improve-bullet:anonymous:${window.key}:${identityHash}`;
    windowStart = window.start;
    resetAt = window.resetAt;
    limit = FREE_DAILY_LIMIT;
  }

  const adminSupabase = createServiceRoleClient();
  const quotaFunction = params.tier === 'paid'
    ? 'consume_user_ai_rate_limit'
    : 'consume_ai_rate_limit';
  const quotaArguments = params.tier === 'paid'
    ? {
        p_bucket: bucket,
        p_window_start: windowStart,
        p_limit: limit,
        p_user_id: params.paidIdentity,
      }
    : {
        p_bucket: bucket,
        p_window_start: windowStart,
        p_limit: limit,
      };
  const { data, error } = await adminSupabase.rpc(
    quotaFunction,
    quotaArguments
  );

  if (error) {
    throw new Error('Atomic AI quota check failed');
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (
    typeof result?.allowed !== 'boolean'
    || typeof result?.current_count !== 'number'
  ) {
    throw new Error('Atomic AI quota returned an invalid result');
  }

  return {
    allowed: result.allowed,
    currentCount: result.current_count,
    limit,
    resetAt,
  };
}

function buildPrompt(input: ImproveBulletInput): string {
  return `You are a professional resume writer. Improve this resume bullet point by creating 3 variations.

ORIGINAL BULLET:
"${input.bullet}"

${input.jobDescription ? `JOB DESCRIPTION CONTEXT:
${input.jobDescription.slice(0, 1000)}` : ''}

${input.missingKeywords.length > 0 ? `KEYWORDS TO INCORPORATE (if relevant):
${input.missingKeywords.slice(0, 10).join(', ')}` : ''}

${input.gaps.length > 0 ? `KNOWN GAPS TO ADDRESS (if truthful):
${input.gaps.slice(0, 5).join('; ')}` : ''}

${input.recommendations.length > 0 ? `RESUME IMPROVEMENT PRIORITIES:
${input.recommendations.slice(0, 5).join('; ')}` : ''}

Generate exactly 3 variations:

1. HIGH IMPACT - Focus on quantifiable results, metrics, and numbers. If the original lacks numbers, add realistic placeholders like "X%" or "[number]" that the user can fill in.
2. LEADERSHIP - Focus on strong action verbs that demonstrate leadership, initiative, and ownership.
3. CONCISE - Make it shorter and punchier while keeping the core message.

RULES:
- Keep each variation under 150 characters
- Maintain professional tone
- Do not invent specific numbers; use placeholders
- Start each bullet with a strong action verb
- Make each variation meaningfully different

Respond with JSON only:
{
  "variations": [
    {
      "strategy": "high-impact",
      "text": "your improved bullet here",
      "highlights": [{"type": "metric", "text": "the metric text"}]
    },
    {
      "strategy": "leadership",
      "text": "your improved bullet here",
      "highlights": [{"type": "verb", "text": "the action verb"}]
    },
    {
      "strategy": "concise",
      "text": "your improved bullet here",
      "highlights": []
    }
  ]
}`;
}

function parseProviderJson(response: string): unknown {
  try {
    return JSON.parse(response);
  } catch {
    const codeBlockMatch = response.match(
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
    );
    if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);

    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);

    throw new Error('Provider returned invalid JSON');
  }
}

function isStrategy(
  value: unknown
): value is BulletVariation['strategy'] {
  return value === 'high-impact'
    || value === 'leadership'
    || value === 'concise';
}

function normalizeVariations(value: unknown): BulletVariation[] {
  if (!value || typeof value !== 'object') {
    throw new Error('Provider response is not an object');
  }

  const rawVariations = (value as { variations?: unknown }).variations;
  if (!Array.isArray(rawVariations)) {
    throw new Error('Provider response has no variations');
  }

  const strategyLabels: Record<BulletVariation['strategy'], string> = {
    'high-impact': 'High Impact',
    leadership: 'Leadership',
    concise: 'Concise',
  };

  const variations = rawVariations
    .slice(0, 3)
    .flatMap((rawVariation, index): BulletVariation[] => {
      if (!rawVariation || typeof rawVariation !== 'object') return [];

      const raw = rawVariation as {
        strategy?: unknown;
        text?: unknown;
        highlights?: unknown;
      };
      if (!isStrategy(raw.strategy) || typeof raw.text !== 'string') return [];

      const text = raw.text.trim();
      if (!text) return [];

      const rawHighlights = Array.isArray(raw.highlights)
        ? raw.highlights.slice(0, 10)
        : [];
      const highlights: BulletVariation['highlights'] = rawHighlights.flatMap(
        (rawHighlight): BulletVariation['highlights'] => {
        if (!rawHighlight || typeof rawHighlight !== 'object') return [];
        const highlight = rawHighlight as {
          type?: unknown;
          text?: unknown;
        };
        if (
          highlight.type !== 'metric'
          && highlight.type !== 'verb'
          && highlight.type !== 'keyword'
        ) {
          return [];
        }
        if (typeof highlight.text !== 'string') return [];

        const highlightText = highlight.text.trim();
        const start = text.indexOf(highlightText);
        if (!highlightText || start < 0) return [];

        return [{
          type: highlight.type,
          text: highlightText,
          start,
          end: start + highlightText.length,
        }];
        }
      );

      return [{
        id: `var-${index}-${crypto.randomUUID()}`,
        strategy: raw.strategy,
        label: strategyLabels[raw.strategy],
        text,
        highlights,
      }];
    });

  if (variations.length === 0) {
    throw new Error('Provider returned no usable variations');
  }

  return variations;
}

async function generateBulletVariations(
  input: ImproveBulletInput
): Promise<ImproveBulletResponse> {
  const apiKey = getProviderKey();
  if (!apiKey) throw new Error('AI provider is unavailable');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(buildPrompt(input));
  const parsed = parseProviderJson(result.response.text());

  return {
    original: input.bullet,
    variations: normalizeVariations(parsed),
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleImproveBulletRequest(request, {
    isProviderConfigured: () => getProviderKey() !== null,
    resolvePaidIdentity: () => resolvePaidIdentity(request),
    consumeQuota: ({ tier, paidIdentity }) => consumeAtomicQuota({
      request,
      tier,
      paidIdentity,
    }),
    generate: generateBulletVariations,
  });
}
