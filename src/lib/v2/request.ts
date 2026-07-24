import type { V2AnalysisResult } from './types';

const MAX_RESUME_CHARS = 30_000;
const MAX_JOB_DESCRIPTION_CHARS = 20_000;

export interface V2AuthorizedUser {
  id: string;
}

export interface V2RequestDependencies {
  isProviderConfigured: () => boolean;
  authorize: (request: Request) => Promise<V2AuthorizedUser | null>;
  consumeQuota: (userId: string) => Promise<boolean>;
  analyze: (
    resume: string,
    jobDescription: string,
    signal: AbortSignal
  ) => Promise<V2AnalysisResult>;
}

function json(
  value: unknown,
  status = 200,
  headers?: Record<string, string>
): Response {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function aborted(): Response {
  return json(
    {
      error: 'Advanced AI analysis was cancelled',
      code: 'REQUEST_ABORTED',
    },
    499
  );
}

export async function handleV2AnalysisRequest(
  request: Request,
  dependencies: V2RequestDependencies
): Promise<Response> {
  if (request.signal.aborted) return aborted();

  if (request.headers.get('x-ai-consent') !== 'acknowledged') {
    return json({ error: 'AI data-sharing consent is required' }, 428);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    if (request.signal.aborted) return aborted();
    return json({ error: 'Request body must be valid JSON' }, 400);
  }
  if (request.signal.aborted) return aborted();

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ error: 'Request body must be a JSON object' }, 400);
  }

  const requestBody = body as Record<string, unknown>;
  const rawResume =
    typeof requestBody.resume === 'string' ? requestBody.resume.trim() : '';
  const rawJobDescription =
    typeof requestBody.jobDescription === 'string'
      ? requestBody.jobDescription.trim()
      : '';

  if (rawResume.length < 50) {
    return json({ error: 'Resume text too short or missing' }, 400);
  }
  if (rawJobDescription.length < 50) {
    return json(
      { error: 'Job description text too short or missing' },
      400
    );
  }

  let authorizedUser: V2AuthorizedUser | null;
  try {
    authorizedUser = await dependencies.authorize(request);
  } catch {
    if (request.signal.aborted) return aborted();
    return json(
      {
        error: 'Subscription verification is temporarily unavailable',
        code: 'ENTITLEMENT_UNAVAILABLE',
      },
      503
    );
  }
  if (request.signal.aborted) return aborted();

  if (!authorizedUser) {
    return json(
      {
        error:
          'An active subscription is required for advanced AI analysis',
      },
      403
    );
  }

  if (!dependencies.isProviderConfigured()) {
    return json(
      {
        error: 'Advanced AI analysis is temporarily unavailable',
        code: 'PROVIDER_UNAVAILABLE',
      },
      503
    );
  }

  let quotaAllowed: boolean;
  try {
    quotaAllowed = await dependencies.consumeQuota(authorizedUser.id);
  } catch {
    if (request.signal.aborted) return aborted();
    return json(
      {
        error: 'AI request limiting is temporarily unavailable',
        code: 'QUOTA_UNAVAILABLE',
      },
      503
    );
  }
  if (request.signal.aborted) return aborted();

  if (!quotaAllowed) {
    return json(
      {
        error:
          'Too many advanced AI requests. Try again in one minute.',
      },
      429,
      { 'Retry-After': '60' }
    );
  }

  const resume =
    rawResume.length > MAX_RESUME_CHARS
      ? `${rawResume.slice(0, MAX_RESUME_CHARS)}\n[truncated]`
      : rawResume;
  const jobDescription =
    rawJobDescription.length > MAX_JOB_DESCRIPTION_CHARS
      ? `${rawJobDescription.slice(0, MAX_JOB_DESCRIPTION_CHARS)}\n[truncated]`
      : rawJobDescription;

  try {
    const result = await dependencies.analyze(
      resume,
      jobDescription,
      request.signal
    );
    if (request.signal.aborted) return aborted();
    return json(result);
  } catch {
    if (request.signal.aborted) return aborted();
    return json(
      {
        error: 'Advanced AI analysis could not be completed',
        code: 'ANALYSIS_FAILED',
      },
      502
    );
  }
}
