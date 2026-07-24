export const MAX_IMPROVE_BULLET_BODY_CHARS = 30_000;
export const MAX_BULLET_CHARS = 1_000;
export const MAX_JOB_DESCRIPTION_CHARS = 20_000;

const MAX_KEYWORDS = 25;
const MAX_CONTEXT_ITEMS = 10;
const MAX_KEYWORD_CHARS = 100;
const MAX_CONTEXT_ITEM_CHARS = 500;

export interface ImproveBulletInput {
  bullet: string;
  jobDescription: string;
  missingKeywords: string[];
  gaps: string[];
  recommendations: string[];
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

export interface ImproveBulletQuotaDecision {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetAt: string;
}

export interface ImproveBulletDependencies {
  isProviderConfigured: () => boolean;
  resolvePaidIdentity: (request: Request) => Promise<string | null>;
  consumeQuota: (params: {
    request: Request;
    tier: 'free' | 'paid';
    paidIdentity: string | null;
  }) => Promise<ImproveBulletQuotaDecision>;
  generate: (input: ImproveBulletInput) => Promise<ImproveBulletResponse>;
}

type ValidationResult =
  | { ok: true; input: ImproveBulletInput }
  | { ok: false; error: string };

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers?: Record<string, string>
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function normalizeStringArray(
  value: unknown,
  fieldName: string,
  maxItems: number,
  maxItemChars: number
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be an array of strings` };
  }
  if (value.length > maxItems) {
    return { ok: false, error: `${fieldName} contains too many items` };
  }

  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return { ok: false, error: `${fieldName} must contain only strings` };
    }

    const trimmed = item.trim();
    if (trimmed.length > maxItemChars) {
      return { ok: false, error: `${fieldName} contains an item that is too long` };
    }
    if (trimmed) normalized.push(trimmed);
  }

  return { ok: true, value: normalized };
}

function validateBody(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const body = value as Record<string, unknown>;
  const bullet = typeof body.bullet === 'string' ? body.bullet.trim() : '';
  const jobDescription =
    typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';

  if (bullet.length < 10) {
    return { ok: false, error: 'Please provide a bullet point to improve.' };
  }
  if (bullet.length > MAX_BULLET_CHARS) {
    return { ok: false, error: 'Bullet point is too long.' };
  }
  if (jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
    return { ok: false, error: 'Job description is too long.' };
  }

  const missingKeywords = normalizeStringArray(
    body.missingKeywords,
    'missingKeywords',
    MAX_KEYWORDS,
    MAX_KEYWORD_CHARS
  );
  if ('error' in missingKeywords) {
    return { ok: false, error: missingKeywords.error };
  }

  const gaps = normalizeStringArray(
    body.gaps,
    'gaps',
    MAX_CONTEXT_ITEMS,
    MAX_CONTEXT_ITEM_CHARS
  );
  if ('error' in gaps) {
    return { ok: false, error: gaps.error };
  }

  const recommendations = normalizeStringArray(
    body.recommendations,
    'recommendations',
    MAX_CONTEXT_ITEMS,
    MAX_CONTEXT_ITEM_CHARS
  );
  if ('error' in recommendations) {
    return { ok: false, error: recommendations.error };
  }

  return {
    ok: true,
    input: {
      bullet,
      jobDescription,
      missingKeywords: missingKeywords.value,
      gaps: gaps.value,
      recommendations: recommendations.value,
    },
  };
}

export async function handleImproveBulletRequest(
  request: Request,
  dependencies: ImproveBulletDependencies
): Promise<Response> {
  if (request.headers.get('x-ai-consent') !== 'acknowledged') {
    return jsonResponse(
      { error: 'AI data-sharing consent is required' },
      428
    );
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (
    Number.isFinite(declaredLength)
    && declaredLength > MAX_IMPROVE_BULLET_BODY_CHARS
  ) {
    return jsonResponse({ error: 'Request body is too large.' }, 413);
  }

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return jsonResponse({ error: 'Unable to read request body.' }, 400);
  }

  if (bodyText.length > MAX_IMPROVE_BULLET_BODY_CHARS) {
    return jsonResponse({ error: 'Request body is too large.' }, 413);
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const validation = validateBody(rawBody);
  if ('error' in validation) {
    return jsonResponse({ error: validation.error }, 400);
  }

  if (!dependencies.isProviderConfigured()) {
    return jsonResponse({ error: 'AI service is temporarily unavailable.' }, 503);
  }

  let paidIdentity: string | null;
  try {
    paidIdentity = await dependencies.resolvePaidIdentity(request);
  } catch {
    return jsonResponse(
      { error: 'AI access verification is temporarily unavailable.' },
      503
    );
  }

  let quota: ImproveBulletQuotaDecision;
  try {
    quota = await dependencies.consumeQuota({
      request,
      tier: paidIdentity ? 'paid' : 'free',
      paidIdentity,
    });
  } catch {
    // Deliberately fail closed. A process-local fallback can be bypassed across
    // serverless instances and would make the quota ineffective.
    return jsonResponse(
      { error: 'AI rate limiting is temporarily unavailable.' },
      503
    );
  }

  const remaining = Math.max(quota.limit - quota.currentCount, 0);
  const quotaHeaders = {
    'X-RateLimit-Limit': quota.limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': quota.resetAt,
  };

  if (!quota.allowed) {
    return jsonResponse(
      paidIdentity
        ? {
            error: 'Too many requests',
            message: 'Too many bullet improvements. Try again after the current rate-limit window.',
          }
        : {
            error: 'Daily limit reached',
            message: `You've used all ${quota.limit} free bullet improvements for today.`,
          },
      429,
      quotaHeaders
    );
  }

  try {
    const result = await dependencies.generate(validation.input);
    return jsonResponse(
      result as unknown as Record<string, unknown>,
      200,
      quotaHeaders
    );
  } catch {
    return jsonResponse(
      { error: 'The AI provider could not complete this request.' },
      502
    );
  }
}
