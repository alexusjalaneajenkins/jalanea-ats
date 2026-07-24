import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CONTACT_RATE_LIMIT,
  createContactRateLimitBucket,
  getContactRateLimitWindow,
  handleContactRequest,
  isStrictEmailAddress,
} from '../src/lib/contact/contactRequest.ts';
import {
  CONTACT_BODY_LIMIT_BYTES,
  CONTACT_FIELD_LIMITS,
} from '../src/lib/contact/contactLimits.ts';

const IDEMPOTENCY_KEY = '11111111-1111-4111-8111-111111111111';
const VALID_BODY = {
  name: 'Alex Example',
  email: 'alex@example.com',
  subject: 'Technical Issue',
  message: 'I need help with an analysis.',
  companyWebsite: '',
};
const VALID_CONFIGURATION = {
  rateLimitSecret: 's'.repeat(48),
  resendApiKey: 're_test_key',
  fromEmail: 'Jalanea ATS <support@example.com>',
  toEmail: 'support@example.com',
};

async function read(relativePath) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    'utf8'
  );
}

function contactRequest(
  body = VALID_BODY,
  headers = {}
) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': IDEMPOTENCY_KEY,
      'X-Forwarded-For': '203.0.113.22',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function dependencyHarness(overrides = {}) {
  const calls = {
    rateLimit: [],
    provider: [],
    logs: [],
    events: [],
  };
  const dependencies = {
    configuration: { ...VALID_CONFIGURATION },
    now: () => new Date('2026-07-24T17:43:21.000Z'),
    timeoutMs: 100,
    async consumeRateLimit(input) {
      calls.events.push('rate-limit');
      calls.rateLimit.push(input);
      return true;
    },
    async sendEmail(input) {
      calls.events.push('provider');
      calls.provider.push(input);
      return { accepted: true, status: 200 };
    },
    logFailure(event, metadata) {
      calls.logs.push({ event, metadata });
    },
    ...overrides,
  };

  return { calls, dependencies };
}

test('contact body is bounded by declared and streamed byte length', async () => {
  for (const request of [
    contactRequest(VALID_BODY, {
      'Content-Length': String(CONTACT_BODY_LIMIT_BYTES + 1),
    }),
    contactRequest(
      JSON.stringify({
        ...VALID_BODY,
        message: 'x'.repeat(CONTACT_BODY_LIMIT_BYTES),
      })
    ),
  ]) {
    const { calls, dependencies } = dependencyHarness();
    const response = await handleContactRequest(request, dependencies);

    assert.equal(response.status, 413);
    assert.equal(calls.rateLimit.length, 0);
    assert.equal(calls.provider.length, 0);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  }
});

test('field caps and strict email validation happen after durable attempt counting', async () => {
  assert.equal(isStrictEmailAddress('person@example.com'), true);
  assert.equal(isStrictEmailAddress('.person@example.com'), false);
  assert.equal(isStrictEmailAddress('person..name@example.com'), false);
  assert.equal(isStrictEmailAddress('person@example'), false);
  assert.equal(isStrictEmailAddress('person@-example.com'), false);

  for (const body of [
    { ...VALID_BODY, name: 'n'.repeat(CONTACT_FIELD_LIMITS.name + 1) },
    { ...VALID_BODY, email: 'not-an-email' },
    { ...VALID_BODY, message: 'm'.repeat(CONTACT_FIELD_LIMITS.message + 1) },
  ]) {
    const { calls, dependencies } = dependencyHarness();
    const response = await handleContactRequest(
      contactRequest(body),
      dependencies
    );

    assert.equal(response.status, 400);
    assert.equal(calls.rateLimit.length, 1);
    assert.equal(calls.provider.length, 0);
  }
});

test('contact IP bucket is keyed, deterministic, windowed, and never exposes the IP', () => {
  const first = createContactRateLimitBucket(
    '203.0.113.22',
    'a'.repeat(48)
  );
  const repeated = createContactRateLimitBucket(
    '203.0.113.22',
    'a'.repeat(48)
  );
  const otherIp = createContactRateLimitBucket(
    '203.0.113.23',
    'a'.repeat(48)
  );
  const otherSecret = createContactRateLimitBucket(
    '203.0.113.22',
    'b'.repeat(48)
  );

  assert.equal(first, repeated);
  assert.notEqual(first, otherIp);
  assert.notEqual(first, otherSecret);
  assert.equal(first.includes('203.0.113.22'), false);
  assert.match(first, /^contact:v1:anonymous:[a-f0-9]{64}$/);
  assert.equal(
    getContactRateLimitWindow(
      new Date('2026-07-24T17:43:21.000Z')
    ),
    '2026-07-24T17:00:00.000Z'
  );
});

test('contact configuration and durable rate limiting fail closed', async () => {
  {
    const { calls, dependencies } = dependencyHarness();
    dependencies.configuration = {
      ...VALID_CONFIGURATION,
      rateLimitSecret: undefined,
    };
    const response = await handleContactRequest(
      contactRequest(),
      dependencies
    );
    assert.equal(response.status, 503);
    assert.equal(calls.rateLimit.length, 0);
    assert.equal(calls.provider.length, 0);
  }

  {
    const { calls, dependencies } = dependencyHarness({
      async consumeRateLimit() {
        calls.events.push('rate-limit');
        throw new Error('database is unavailable');
      },
    });
    const response = await handleContactRequest(
      contactRequest(),
      dependencies
    );
    assert.equal(response.status, 503);
    assert.equal(calls.provider.length, 0);
  }

  {
    const { calls, dependencies } = dependencyHarness({
      async consumeRateLimit(input) {
        calls.rateLimit.push(input);
        return false;
      },
    });
    const response = await handleContactRequest(
      contactRequest(),
      dependencies
    );
    assert.equal(response.status, 429);
    assert.equal(calls.rateLimit[0].limit, CONTACT_RATE_LIMIT);
    assert.equal(calls.provider.length, 0);
  }
});

test('honeypot attempts consume quota but receive indistinguishable acceptance', async () => {
  const { calls, dependencies } = dependencyHarness();
  const response = await handleContactRequest(
    contactRequest({
      ...VALID_BODY,
      email: 'bot-input',
      message: '',
      companyWebsite: 'https://spam.example',
    }),
    dependencies
  );
  const body = await response.json();

  assert.equal(response.status, 202);
  assert.equal(body.accepted, true);
  assert.equal(calls.rateLimit.length, 1);
  assert.equal(calls.provider.length, 0);
});

test('contact idempotency is stable and quota is consumed before provider work', async () => {
  const { calls, dependencies } = dependencyHarness();
  const first = await handleContactRequest(
    contactRequest(),
    dependencies
  );
  const second = await handleContactRequest(
    contactRequest(),
    dependencies
  );

  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.deepEqual(calls.events, [
    'rate-limit',
    'provider',
    'rate-limit',
    'provider',
  ]);
  assert.equal(
    calls.provider[0].idempotencyKey,
    `contact/${IDEMPOTENCY_KEY}`
  );
  assert.equal(
    calls.provider[1].idempotencyKey,
    calls.provider[0].idempotencyKey
  );
});

test('provider timeout and rejection stay redacted', async () => {
  const secretBody = {
    ...VALID_BODY,
    email: 'private@example.com',
    message: 'PRIVATE CONTACT BODY 987654',
  };

  {
    const { calls, dependencies } = dependencyHarness({
      timeoutMs: 5,
      sendEmail(_input, signal) {
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true }
          );
        });
      },
    });
    const response = await handleContactRequest(
      contactRequest(secretBody),
      dependencies
    );
    const publicBody = await response.text();
    const logged = JSON.stringify(calls.logs);

    assert.equal(response.status, 503);
    assert.match(logged, /provider_timeout/);
    assert.doesNotMatch(
      `${publicBody}${logged}`,
      /private@example\.com|PRIVATE CONTACT BODY 987654/
    );
  }

  {
    const { calls, dependencies } = dependencyHarness({
      async sendEmail() {
        return { accepted: false, status: 422 };
      },
    });
    const response = await handleContactRequest(
      contactRequest(secretBody),
      dependencies
    );
    const publicBody = await response.text();
    const logged = JSON.stringify(calls.logs);

    assert.equal(response.status, 503);
    assert.match(logged, /provider_rejected/);
    assert.match(logged, /422/);
    assert.doesNotMatch(
      `${publicBody}${logged}`,
      /private@example\.com|PRIVATE CONTACT BODY 987654/
    );
  }
});

test('successful provider acceptance returns honest 202 semantics', async () => {
  const { dependencies } = dependencyHarness();
  const response = await handleContactRequest(
    contactRequest(),
    dependencies
  );
  const body = await response.json();

  assert.equal(response.status, 202);
  assert.equal(body.accepted, true);
  assert.match(body.message, /accepted for processing/i);
  assert.doesNotMatch(body.message, /\bsent\b|\bdelivered\b/i);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('contact route and client enforce provider and browser safeguards', async () => {
  const route = await read('src/app/api/contact/route.ts');
  const page = await read('src/app/contact/page.tsx');

  assert.match(route, /\.rpc\('consume_ai_rate_limit'/);
  assert.match(route, /CONTACT_RATE_LIMIT_SECRET/);
  assert.match(route, /'Idempotency-Key': input\.idempotencyKey/);
  assert.match(route, /'User-Agent': RESEND_USER_AGENT/);
  assert.match(route, /signal,/);
  assert.doesNotMatch(route, /onboarding@resend\.dev/);
  assert.doesNotMatch(route, /response\.text\(\)/);
  assert.match(page, /crypto\.randomUUID\(\)/);
  assert.match(page, /companyWebsite/);
  assert.match(page, /maxLength=\{CONTACT_FIELD_LIMITS\.message\}/);
  assert.match(page, /Message submitted/i);
  assert.doesNotMatch(page, /Message Sent!/i);
});

test('privacy, terms, and help copy match actual data and access behavior', async () => {
  const [privacy, terms, help, contact, support] = await Promise.all([
    read('src/app/privacy/page.tsx'),
    read('src/app/terms/page.tsx'),
    read('src/app/help/page.tsx'),
    read('src/app/contact/page.tsx'),
    read('src/lib/contact/publicSupport.ts'),
  ]);

  for (const required of [
    /IndexedDB/,
    /not encrypted/i,
    /Supabase/,
    /Stripe/,
    /Google Gemini/,
    /Resend/,
    /keyed, hashed/i,
    /48 hours/,
    /seven days/,
    /in-memory/,
    /shared sign-in/,
  ]) {
    assert.match(privacy, required);
  }
  assert.match(terms, /BYOK is not (?:a |included in the )?.*free tier/i);
  assert.match(terms, /signed in[\s\S]{0,80}verified paid ATS access/i);
  assert.doesNotMatch(terms, /BYOK is free/i);
  assert.doesNotMatch(terms, /analysis at no cost to you/i);
  assert.match(help, /PDF, DOCX, and TXT/);
  assert.match(help, /href="\/forgot-password"/);
  assert.match(help, /aria-expanded=\{isOpen\}/);
  assert.match(help, /aria-controls=\{panelId\}/);

  for (const page of [privacy, terms, help, contact]) {
    assert.match(page, /PUBLIC_SUPPORT_EMAIL|PUBLIC_SUPPORT_MAILTO/);
    assert.equal(page.includes('support-ats@jalanea.dev'), false);
  }
  assert.match(
    support,
    /PUBLIC_SUPPORT_EMAIL = 'support-ats@jalanea\.dev'/
  );
});
