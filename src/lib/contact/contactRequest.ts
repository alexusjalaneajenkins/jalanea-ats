import { createHmac } from 'node:crypto';

const CONTACT_BODY_LIMIT_BYTES = 16 * 1024;
const CONTACT_FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 160,
  message: 5_000,
  companyWebsite: 200,
} as const;

export const CONTACT_RATE_LIMIT = 5;
export const CONTACT_PROVIDER_TIMEOUT_MS = 8_000;

const MIN_RATE_LIMIT_SECRET_CHARS = 32;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const EMAIL_LOCAL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactProviderInput extends ContactInput {
  idempotencyKey: string;
}

export interface ContactRateLimitInput {
  bucket: string;
  windowStart: string;
  limit: number;
}

export interface ContactProviderResult {
  accepted: boolean;
  status: number;
}

export interface ContactRequestDependencies {
  configuration: {
    rateLimitSecret?: string;
    resendApiKey?: string;
    fromEmail?: string;
    toEmail?: string;
  };
  consumeRateLimit(
    input: ContactRateLimitInput
  ): Promise<boolean>;
  sendEmail(
    input: ContactProviderInput,
    signal: AbortSignal
  ): Promise<ContactProviderResult>;
  now?: () => Date;
  timeoutMs?: number;
  logFailure?: (
    event:
      | 'rate_limit_unavailable'
      | 'provider_timeout'
      | 'provider_rejected'
      | 'provider_unavailable',
    metadata?: Readonly<Record<string, string | number>>
  ) => void;
}

type ParsedBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

type ValidatedBodyResult =
  | {
      ok: true;
      input: ContactInput;
    }
  | { ok: false; error: string };

function json(
  value: Record<string, unknown>,
  status: number,
  headers?: Record<string, string>
): Response {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      ...headers,
    },
  });
}

function configurationIsReady(
  configuration: ContactRequestDependencies['configuration']
): boolean {
  return Boolean(
    configuration.rateLimitSecret
    && configuration.rateLimitSecret.trim().length
      >= MIN_RATE_LIMIT_SECRET_CHARS
    && configuration.resendApiKey?.trim()
    && configuration.fromEmail?.trim()
    && configuration.toEmail?.trim()
  );
}

function firstClientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const candidate =
    forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  return candidate.slice(0, 256);
}

export function createContactRateLimitBucket(
  clientAddress: string,
  secret: string
): string {
  const digest = createHmac('sha256', secret)
    .update(clientAddress)
    .digest('hex');
  return `contact:v1:anonymous:${digest}`;
}

export function getContactRateLimitWindow(now: Date): string {
  const hourStart = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  return new Date(hourStart).toISOString();
}

export function isStrictEmailAddress(value: string): boolean {
  if (
    value.length < 3
    || value.length > CONTACT_FIELD_LIMITS.email
    || value.includes(' ')
    || value.includes('\n')
    || value.includes('\r')
  ) {
    return false;
  }

  const separator = value.lastIndexOf('@');
  if (separator <= 0 || separator !== value.indexOf('@')) return false;

  const local = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  if (
    local.length > 64
    || domain.length > 253
    || local.startsWith('.')
    || local.endsWith('.')
    || local.includes('..')
    || !EMAIL_LOCAL_PATTERN.test(local)
  ) {
    return false;
  }

  const labels = domain.split('.');
  return (
    labels.length >= 2
    && labels.every((label) => EMAIL_DOMAIN_LABEL_PATTERN.test(label))
    && /^[A-Za-z]{2,63}$/.test(labels.at(-1) ?? '')
  );
}

export function escapeContactHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character
  );
}

async function readBoundedJson(request: Request): Promise<ParsedBodyResult> {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim();
  if (contentType !== 'application/json') {
    return {
      ok: false,
      status: 415,
      error: 'Content-Type must be application/json.',
    };
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const bytes = Number(declaredLength);
    if (!Number.isFinite(bytes) || bytes < 0) {
      return { ok: false, status: 400, error: 'Invalid Content-Length.' };
    }
    if (bytes > CONTACT_BODY_LIMIT_BYTES) {
      return { ok: false, status: 413, error: 'Request body is too large.' };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: 'Request body is required.' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > CONTACT_BODY_LIMIT_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          status: 413,
          error: 'Request body is too large.',
        };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Unable to read request body.' };
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, status: 400, error: 'Request body must be UTF-8.' };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: 'Request body must be valid JSON.' };
  }
}

function validateBody(value: unknown): ValidatedBodyResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const subject =
    typeof body.subject === 'string'
      ? body.subject.replace(/[\r\n]+/g, ' ').trim()
      : '';
  const message =
    typeof body.message === 'string'
      ? body.message.replace(/\r\n?/g, '\n').trim()
      : '';
  if (!name || !email || !message) {
    return { ok: false, error: 'Name, email, and message are required.' };
  }
  if (
    name.length > CONTACT_FIELD_LIMITS.name
    || /[\u0000-\u001f\u007f]/.test(name)
  ) {
    return { ok: false, error: 'Name is invalid or too long.' };
  }
  if (!isStrictEmailAddress(email)) {
    return { ok: false, error: 'Email address is invalid.' };
  }
  if (
    subject.length > CONTACT_FIELD_LIMITS.subject
    || /[\u0000-\u001f\u007f]/.test(subject)
  ) {
    return { ok: false, error: 'Subject is invalid or too long.' };
  }
  if (
    message.length > CONTACT_FIELD_LIMITS.message
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)
  ) {
    return { ok: false, error: 'Message is invalid or too long.' };
  }
  return {
    ok: true,
    input: { name, email, subject, message },
  };
}

function honeypotIsFilled(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const honeypot = (value as Record<string, unknown>).companyWebsite;
  return (
    typeof honeypot === 'string'
    && honeypot.slice(0, CONTACT_FIELD_LIMITS.companyWebsite).trim().length > 0
  );
}

function isValidIdempotencyKey(value: string | null): value is string {
  return Boolean(value && IDEMPOTENCY_KEY_PATTERN.test(value));
}

const ACCEPTED_RESPONSE = {
  accepted: true,
  message:
    'Your message was accepted for processing. Email delivery is not guaranteed.',
};

export async function handleContactRequest(
  request: Request,
  dependencies: ContactRequestDependencies
): Promise<Response> {
  if (!configurationIsReady(dependencies.configuration)) {
    return json(
      { error: 'Contact service is temporarily unavailable.' },
      503
    );
  }

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    return json({ error: parsed.error }, parsed.status);
  }

  const rateLimitInput: ContactRateLimitInput = {
    bucket: createContactRateLimitBucket(
      firstClientAddress(request),
      dependencies.configuration.rateLimitSecret!
    ),
    windowStart: getContactRateLimitWindow(
      dependencies.now?.() ?? new Date()
    ),
    limit: CONTACT_RATE_LIMIT,
  };

  let allowed: boolean;
  try {
    allowed = await dependencies.consumeRateLimit(rateLimitInput);
  } catch {
    dependencies.logFailure?.('rate_limit_unavailable');
    return json(
      { error: 'Contact request limiting is temporarily unavailable.' },
      503
    );
  }

  const rateLimitHeaders = {
    'X-RateLimit-Limit': CONTACT_RATE_LIMIT.toString(),
  };
  if (!allowed) {
    return json(
      { error: 'Too many submissions. Please try again later.' },
      429,
      { ...rateLimitHeaders, 'Retry-After': '3600' }
    );
  }

  if (honeypotIsFilled(parsed.value)) {
    return json(ACCEPTED_RESPONSE, 202, rateLimitHeaders);
  }

  const validated = validateBody(parsed.value);
  if (!validated.ok) {
    return json({ error: validated.error }, 400, rateLimitHeaders);
  }

  const idempotencyKey = request.headers.get('idempotency-key');
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return json(
      { error: 'A valid Idempotency-Key header is required.' },
      400,
      rateLimitHeaders
    );
  }

  const controller = new AbortController();
  const timeoutMs =
    dependencies.timeoutMs ?? CONTACT_PROVIDER_TIMEOUT_MS;
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('contact_provider_timeout'));
      }, timeoutMs);
    });
    const providerResult = await Promise.race([
      dependencies.sendEmail(
        {
          ...validated.input,
          idempotencyKey: `contact/${idempotencyKey}`,
        },
        controller.signal
      ),
      timeoutPromise,
    ]);

    if (!providerResult.accepted) {
      dependencies.logFailure?.('provider_rejected', {
        status: providerResult.status,
      });
      return json(
        { error: 'Your message could not be submitted right now.' },
        503,
        rateLimitHeaders
      );
    }
  } catch (error) {
    dependencies.logFailure?.(
      timedOut ? 'provider_timeout' : 'provider_unavailable',
      timedOut
        ? undefined
        : {
            errorName:
              error instanceof Error && error.name
                ? error.name.slice(0, 80)
                : 'UnknownError',
          }
    );
    return json(
      { error: 'Your message could not be submitted right now.' },
      503,
      rateLimitHeaders
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  return json(ACCEPTED_RESPONSE, 202, rateLimitHeaders);
}
