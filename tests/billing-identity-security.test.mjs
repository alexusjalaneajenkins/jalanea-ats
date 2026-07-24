import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CheckoutSessionLookupError,
  handleCheckoutRequest,
} from '../src/lib/billing/checkoutService.ts';
import {
  checkoutAttemptNeedsDeletionDiscovery,
  deleteAtsAccount,
} from '../src/lib/billing/accountDeletionService.ts';
import {
  classifyCheckoutStatus,
} from '../src/lib/billing/checkoutStatus.ts';
import {
  getBillingReturnUrls,
  getCanonicalAppOrigin,
} from '../src/lib/billing/appUrl.ts';
import {
  subscriptionGrantsAccess,
} from '../src/lib/billing/subscriptionAccess.ts';
import {
  getAccountBillingState,
} from '../src/lib/billing/accountBillingState.ts';
import {
  identifyAtsCheckoutSession,
  identifyAtsSubscription,
  isAtsDedicatedCustomer,
} from '../src/lib/billing/stripeObjectScope.ts';
import {
  processStripeEvent,
} from '../src/lib/billing/webhookService.ts';

function checkoutRequest(body = { priceType: 'monthly' }) {
  return new Request('https://attacker.example/api/checkout', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
      Origin: 'https://attacker.example',
    },
    body: JSON.stringify(body),
  });
}

function makeCheckoutDependencies(overrides = {}) {
  const calls = [];
  let claimCount = 0;

  const dependencies = {
    calls,
    async authenticate() {
      calls.push('authenticate');
      return { id: 'user-1', email: 'person@example.com' };
    },
    async getMembershipStatus() {
      calls.push('membership');
      return 'active';
    },
    async hasCurrentEntitlement() {
      calls.push('entitlement');
      return false;
    },
    async hasBillingRelationship() {
      calls.push('billing-relationship');
      return false;
    },
    async getCustomerId() {
      calls.push('get-customer');
      return 'cus_existing';
    },
    async createCustomer() {
      calls.push('create-customer');
      return 'cus_created';
    },
    async saveCustomerId() {
      calls.push('save-customer');
    },
    async claimAttempt() {
      claimCount += 1;
      calls.push(`claim-${claimCount}`);
      return {
        id: `attempt-${claimCount}`,
        status: 'pending',
        stripeSessionId: null,
        idempotencyKey: `ats-checkout-attempt-${claimCount}`,
      };
    },
    async getSession() {
      calls.push('get-session');
      return {
        id: 'cs_existing',
        url: 'https://checkout.stripe.test/existing',
        status: 'open',
        paymentStatus: 'unpaid',
        createdAt: '2026-07-23T12:00:00.000Z',
        expiresAt: '2026-07-23T13:00:00.000Z',
        reconciledAt: '2026-07-23T12:00:01.000Z',
      };
    },
    async createSession(input, idempotencyKey) {
      calls.push(`create-session:${input.attemptId}:${idempotencyKey}`);
      return {
        id: 'cs_new',
        url: 'https://checkout.stripe.test/new',
        status: 'open',
        paymentStatus: 'unpaid',
        createdAt: '2026-07-23T12:00:00.000Z',
        expiresAt: '2026-07-23T13:00:00.000Z',
        reconciledAt: '2026-07-23T12:00:01.000Z',
      };
    },
    async markAttemptSession() {
      calls.push('mark-session');
    },
    async markAttemptFailed(input) {
      calls.push('mark-failed');
      calls.push(
        `mark-failed-input:${input.status}:${input.sessionId}:${input.errorCode}`
      );
    },
    getReturnUrls() {
      calls.push('return-urls');
      return {
        checkoutSuccess:
          'https://ats.jalanea.dev/checkout/success?session_id={CHECKOUT_SESSION_ID}',
        checkoutCancel: 'https://ats.jalanea.dev/pricing?canceled=true',
      };
    },
    ...overrides,
  };

  return dependencies;
}

test('checkout authenticates before validating a malformed plan', async () => {
  const dependencies = makeCheckoutDependencies({
    async authenticate() {
      dependencies.calls.push('authenticate');
      return null;
    },
  });

  const response = await handleCheckoutRequest(
    checkoutRequest({ priceType: 'attacker-price' }),
    dependencies
  );

  assert.equal(response.status, 401);
  assert.deepEqual(dependencies.calls, ['authenticate']);
});

test('removed ATS membership cannot silently start a new purchase', async () => {
  const dependencies = makeCheckoutDependencies({
    async getMembershipStatus() {
      dependencies.calls.push('membership');
      return 'removed';
    },
  });

  const response = await handleCheckoutRequest(
    checkoutRequest(),
    dependencies
  );

  assert.equal(response.status, 410);
  assert.equal(dependencies.calls.includes('create-session'), false);
});

test('nonterminal ATS billing relationship blocks a duplicate purchase', async () => {
  const dependencies = makeCheckoutDependencies({
    async hasBillingRelationship() {
      dependencies.calls.push('billing-relationship');
      return true;
    },
  });

  const response = await handleCheckoutRequest(checkoutRequest(), dependencies);

  assert.equal(response.status, 409);
  assert.equal(dependencies.calls.includes('get-customer'), false);
  assert.equal(dependencies.calls.includes('claim-1'), false);
});

test('durable attempt is claimed before creating an ATS Stripe customer', async () => {
  const dependencies = makeCheckoutDependencies({
    async getCustomerId() {
      dependencies.calls.push('get-customer');
      return null;
    },
  });

  const response = await handleCheckoutRequest(checkoutRequest(), dependencies);

  assert.equal(response.status, 200);
  const firstClaim = dependencies.calls.indexOf('claim-1');
  const createCustomer = dependencies.calls.indexOf('create-customer');
  const secondClaim = dependencies.calls.indexOf('claim-2');
  assert.ok(firstClaim > -1 && firstClaim < createCustomer);
  assert.ok(createCustomer < secondClaim);
});

test('checkout reuses the persisted customer and one active Stripe session', async () => {
  const dependencies = makeCheckoutDependencies({
    async claimAttempt() {
      dependencies.calls.push('claim-1');
      return {
        id: 'attempt-existing',
        status: 'session_created',
        stripeSessionId: 'cs_existing',
        idempotencyKey: 'ats-checkout-existing',
      };
    },
  });

  const response = await handleCheckoutRequest(checkoutRequest(), dependencies);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.reused, true);
  assert.equal(dependencies.calls.includes('create-customer'), false);
  assert.equal(
    dependencies.calls.some((call) => call.startsWith('create-session:')),
    false
  );
});

test('a confirmed missing Stripe session is expired before a new logical attempt', async () => {
  const dependencies = makeCheckoutDependencies({
    async claimAttempt() {
      const number =
        dependencies.calls.filter((call) => call.startsWith('claim-')).length + 1;
      dependencies.calls.push(`claim-${number}`);
      return number === 1
        ? {
            id: 'attempt-old',
            status: 'session_created',
            stripeSessionId: 'cs_missing',
            idempotencyKey: 'ats-checkout-old',
          }
        : {
            id: 'attempt-new',
            status: 'pending',
            stripeSessionId: null,
            idempotencyKey: 'ats-checkout-new',
          };
    },
    async getSession() {
      dependencies.calls.push('get-session');
      throw new CheckoutSessionLookupError(true);
    },
  });

  const response = await handleCheckoutRequest(checkoutRequest(), dependencies);

  assert.equal(response.status, 200);
  assert.deepEqual(
    dependencies.calls.filter((call) =>
      call === 'mark-failed' ||
      call.startsWith('mark-failed-input:') ||
      call.startsWith('claim-') ||
      call.startsWith('create-session:')
    ),
    [
      'claim-1',
      'mark-failed',
      'mark-failed-input:expired:cs_missing:checkout_session_expired',
      'claim-2',
      'create-session:attempt-new:ats-checkout-new',
    ]
  );
});

test('a temporary Stripe lookup failure does not create a duplicate checkout', async () => {
  const dependencies = makeCheckoutDependencies({
    async claimAttempt() {
      dependencies.calls.push('claim-1');
      return {
        id: 'attempt-old',
        status: 'session_created',
        stripeSessionId: 'cs_temporarily_unavailable',
        idempotencyKey: 'ats-checkout-old',
      };
    },
    async getSession() {
      dependencies.calls.push('get-session');
      throw new CheckoutSessionLookupError(false);
    },
  });

  const response = await handleCheckoutRequest(checkoutRequest(), dependencies);

  assert.equal(response.status, 503);
  assert.equal(dependencies.calls.includes('mark-failed'), false);
  assert.equal(
    dependencies.calls.some((call) => call.startsWith('create-session:')),
    false
  );
});

test('billing return URLs are server canonical and never use request origin', () => {
  const origin = getCanonicalAppOrigin({ NODE_ENV: 'production' });
  const urls = getBillingReturnUrls(origin);

  assert.equal(origin, 'https://ats.jalanea.dev');
  assert.equal(
    urls.checkoutSuccess,
    'https://ats.jalanea.dev/checkout/success?session_id={CHECKOUT_SESSION_ID}'
  );
  assert.equal(urls.portalReturn, 'https://ats.jalanea.dev/account');
  assert.equal(JSON.stringify(urls).includes('attacker.example'), false);
});

test('subscription entitlement is deny-by-default for paused and unpaid lifetime rows', () => {
  assert.equal(
    subscriptionGrantsAccess({
      status: 'paused',
      is_lifetime: false,
      payment_status: null,
    }),
    false
  );
  assert.equal(
    subscriptionGrantsAccess({
      status: 'active',
      is_lifetime: true,
      payment_status: 'unpaid',
    }),
    false
  );
  assert.equal(
    subscriptionGrantsAccess({
      status: 'active',
      is_lifetime: true,
      payment_status: 'paid',
    }),
    true
  );
  assert.equal(
    subscriptionGrantsAccess({
      status: 'active',
      is_lifetime: false,
      payment_status: null,
      current_period_end: '2020-01-01T00:00:00.000Z',
    }),
    false
  );
  assert.equal(
    subscriptionGrantsAccess({
      status: 'active',
      is_lifetime: false,
      payment_status: null,
      current_period_end: '9999-12-31T23:59:59.999Z',
    }),
    true
  );
});

function stripeEvent(type, object = { id: 'cs_123' }) {
  return {
    id: 'evt_123',
    type,
    created: 1_785_000_000,
    data: { object },
  };
}

function makeWebhookDependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    async claimEvent() {
      calls.push('claim');
      return { claimed: true, status: 'processing' };
    },
    async finishEvent(input) {
      calls.push(`finish:${input.status}`);
    },
    async reconcileCheckoutSession() {
      calls.push('checkout');
    },
    async failCheckoutSession() {
      calls.push('checkout-failed');
    },
    async reconcileSubscription() {
      calls.push('subscription');
    },
    ...overrides,
  };
}

test('processed webhook duplicates are acknowledged without repeating effects', async () => {
  const dependencies = makeWebhookDependencies({
    async claimEvent() {
      dependencies.calls.push('claim');
      return { claimed: false, status: 'processed' };
    },
  });

  const result = await processStripeEvent(
    stripeEvent('checkout.session.completed'),
    dependencies
  );

  assert.equal(result, 'duplicate');
  assert.deepEqual(dependencies.calls, ['claim']);
});

test('an in-flight webhook is not falsely acknowledged without a worker', async () => {
  const dependencies = makeWebhookDependencies({
    async claimEvent() {
      dependencies.calls.push('claim');
      return { claimed: false, status: 'processing' };
    },
  });

  await assert.rejects(
    processStripeEvent(
      stripeEvent('checkout.session.completed'),
      dependencies
    ),
    /not ready to acknowledge/
  );
  assert.deepEqual(dependencies.calls, ['claim']);
});

test('webhook claims before reconciliation and marks completion afterward', async () => {
  const dependencies = makeWebhookDependencies();

  const result = await processStripeEvent(
    stripeEvent('checkout.session.async_payment_succeeded'),
    dependencies
  );

  assert.equal(result, 'processed');
  assert.deepEqual(dependencies.calls, [
    'claim',
    'checkout',
    'finish:processed',
  ]);
});

function makeDeletionDependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    async claimDeletion() {
      calls.push('claim');
      return { claimed: true, status: 'deleting', attemptCount: 1 };
    },
    async getCustomerIds() {
      calls.push('customers');
      return ['cus_1'];
    },
    async listSubscriptions() {
      calls.push('subscriptions');
      return [
        { id: 'sub_active', status: 'active' },
        { id: 'sub_done', status: 'canceled' },
      ];
    },
    async listCheckoutSessions() {
      calls.push('checkout-sessions');
      return [{
        id: 'cs_open',
        mode: 'payment',
        status: 'open',
        paymentStatus: 'unpaid',
      }];
    },
    async getCheckoutSession() {
      calls.push('get-checkout-session');
      return {
        id: 'cs_open',
        mode: 'payment',
        status: 'open',
        paymentStatus: 'unpaid',
      };
    },
    async expireCheckoutSession(id) {
      calls.push(`expire:${id}`);
    },
    async cancelSubscription(id) {
      calls.push(`cancel:${id}`);
    },
    async markBillingCanceled() {
      calls.push('billing-canceled');
    },
    async completeAtsDeletion() {
      calls.push('cleanup');
      return { deleted_subscriptions: 1 };
    },
    async markDeletionFailed(_userId, code) {
      calls.push(`failed:${code}`);
    },
    ...overrides,
  };
}

test('fresh pending checkout durably blocks ATS deletion before billing snapshot', async () => {
  const dependencies = makeDeletionDependencies({
    async claimDeletion() {
      dependencies.calls.push('claim');
      return {
        claimed: false,
        status: 'checkout_in_progress',
        attemptCount: 0,
      };
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.body.retryable, true);
  assert.deepEqual(dependencies.calls, ['claim']);
});

test('ATS deletion cancels billing before transactional product cleanup', async () => {
  const dependencies = makeDeletionDependencies();

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, true);
  assert.equal(result.body.sharedIdentityPreserved, true);
  assert.deepEqual(dependencies.calls, [
    'claim',
    'customers',
    'checkout-sessions',
    'expire:cs_open',
    'subscriptions',
    'cancel:sub_active',
    'billing-canceled',
    'cleanup',
  ]);
});

test('repeat ATS deletion is idempotent for a deleted membership', async () => {
  const dependencies = makeDeletionDependencies({
    async claimDeletion() {
      dependencies.calls.push('claim');
      return { claimed: false, status: 'deleted', attemptCount: 2 };
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, true);
  assert.deepEqual(dependencies.calls, ['claim']);
});

test('billing cancellation failure leaves ATS cleanup untouched and retryable', async () => {
  const dependencies = makeDeletionDependencies({
    async cancelSubscription() {
      dependencies.calls.push('cancel:sub_active');
      throw new Error('provider unavailable');
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.equal(dependencies.calls.includes('cleanup'), false);
  assert.equal(
    dependencies.calls.includes('failed:billing_cancellation_failed'),
    true
  );
});

test('ATS deletion expires open checkout before subscriptions or data cleanup', async () => {
  const dependencies = makeDeletionDependencies({
    async expireCheckoutSession(id) {
      dependencies.calls.push(`expire:${id}`);
      throw new Error('session completed concurrently');
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.equal(dependencies.calls.includes('subscriptions'), false);
  assert.equal(dependencies.calls.includes('cleanup'), false);
  assert.equal(
    dependencies.calls.includes('failed:billing_cancellation_failed'),
    true
  );
});

test('expire-vs-paid lifetime race blocks deletion for explicit support resolution', async () => {
  const dependencies = makeDeletionDependencies({
    async expireCheckoutSession(id) {
      dependencies.calls.push(`expire:${id}`);
      throw new Error('session completed concurrently');
    },
    async getCheckoutSession() {
      dependencies.calls.push('get-checkout-session');
      return {
        id: 'cs_open',
        mode: 'payment',
        status: 'complete',
        paymentStatus: 'paid',
      };
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.body.retryable, false);
  assert.equal(dependencies.calls.includes('cleanup'), false);
  assert.equal(
    dependencies.calls.includes('failed:paid_checkout_requires_support'),
    true
  );
});

test('a retry still blocks when a durable attempt now resolves to paid lifetime', async () => {
  const dependencies = makeDeletionDependencies({
    async listCheckoutSessions() {
      dependencies.calls.push('checkout-sessions');
      return [{
        id: 'cs_paid',
        mode: 'payment',
        status: 'complete',
        paymentStatus: 'paid',
      }];
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(dependencies.calls.includes('expire:cs_open'), false);
  assert.equal(dependencies.calls.includes('subscriptions'), false);
  assert.equal(dependencies.calls.includes('cleanup'), false);
  assert.equal(
    dependencies.calls.includes('failed:paid_checkout_requires_support'),
    true
  );
});

test('paid monthly checkout subscription is canceled before ATS cleanup even before DB reconciliation', async () => {
  const dependencies = makeDeletionDependencies({
    async listCheckoutSessions() {
      dependencies.calls.push('checkout-sessions');
      return [{
        id: 'cs_monthly_paid',
        mode: 'subscription',
        status: 'complete',
        paymentStatus: 'paid',
        subscriptionId: 'sub_new_from_checkout',
      }];
    },
    async listSubscriptions() {
      dependencies.calls.push('subscriptions');
      return [];
    },
  });

  const result = await deleteAtsAccount('user-1', dependencies);

  assert.equal(result.ok, true);
  assert.ok(
    dependencies.calls.indexOf('cancel:sub_new_from_checkout') <
      dependencies.calls.indexOf('cleanup')
  );
});

test('completed monthly attempt remains discoverable when subscription webhook has not reconciled', () => {
  assert.equal(
    checkoutAttemptNeedsDeletionDiscovery({
      planType: 'monthly',
      status: 'completed',
      completedAt: '2026-07-23T10:00:00.000Z',
      deletionRequestedAt: Date.parse('2026-07-23T11:00:00.000Z'),
      lastErrorCode: null,
      hasReconciledSubscription: false,
    }),
    true
  );
  assert.equal(
    checkoutAttemptNeedsDeletionDiscovery({
      planType: 'monthly',
      status: 'completed',
      completedAt: '2026-07-23T10:00:00.000Z',
      deletionRequestedAt: Date.parse('2026-07-23T11:00:00.000Z'),
      lastErrorCode: null,
      hasReconciledSubscription: true,
    }),
    false
  );
});

test('checkout status never infers success from a redirect or elapsed time', () => {
  assert.equal(
    classifyCheckoutStatus({
      authenticatedUserId: 'user-1',
      clientReferenceId: null,
      metadataUserId: null,
      atsSessionVerified: true,
      sessionStatus: 'complete',
      paymentStatus: 'paid',
      hasEntitlement: true,
    }),
    'invalid'
  );
  assert.equal(
    classifyCheckoutStatus({
      authenticatedUserId: 'user-1',
      clientReferenceId: 'user-1',
      metadataUserId: 'user-1',
      atsSessionVerified: true,
      sessionStatus: 'complete',
      paymentStatus: 'paid',
      hasEntitlement: false,
    }),
    'pending'
  );
  assert.equal(
    classifyCheckoutStatus({
      authenticatedUserId: 'user-1',
      clientReferenceId: 'user-1',
      metadataUserId: 'user-1',
      atsSessionVerified: true,
      sessionStatus: 'expired',
      paymentStatus: 'unpaid',
      hasEntitlement: false,
    }),
    'failed'
  );
});

test('checkout status rejects an owned but non-ATS Stripe session', () => {
  assert.equal(
    classifyCheckoutStatus({
      authenticatedUserId: 'user-1',
      clientReferenceId: 'user-1',
      metadataUserId: 'user-1',
      atsSessionVerified: false,
      sessionStatus: 'complete',
      paymentStatus: 'paid',
      hasEntitlement: true,
    }),
    'invalid'
  );
});

test('Stripe object scope rejects unrelated products and wrong ATS prices', () => {
  const metadata = {
    product: 'jalanea_ats',
    user_id: '11111111-1111-4111-8111-111111111111',
    checkout_attempt_id: '22222222-2222-4222-8222-222222222222',
    price_type: 'monthly',
  };

  assert.equal(
    identifyAtsCheckoutSession({
      metadata: { ...metadata, product: 'jalanea_tutoring' },
      mode: 'subscription',
      actualPriceId: 'price_ats',
      actualCurrency: 'usd',
      actualUnitAmount: 500,
      actualQuantity: 1,
      expectedMonthlyPriceId: 'price_ats',
    }),
    null
  );
  assert.equal(
    identifyAtsSubscription({
      metadata,
      actualPriceId: 'price_tutoring',
      actualCurrency: 'usd',
      actualUnitAmount: 500,
      actualQuantity: 1,
      expectedMonthlyPriceId: 'price_ats',
    }),
    null
  );
  assert.equal(
    identifyAtsSubscription({
      metadata,
      actualPriceId: 'price_ats',
      actualCurrency: 'usd',
      actualUnitAmount: 500,
      actualQuantity: 1,
      expectedMonthlyPriceId: 'price_ats',
    })?.planType,
    'monthly'
  );
});

test('billing portal customer scope requires ATS marker and exact user', () => {
  assert.equal(
    isAtsDedicatedCustomer({
      metadata: { product: 'jalanea_ats', user_id: 'user-1' },
      authenticatedUserId: 'user-1',
    }),
    true
  );
  assert.equal(
    isAtsDedicatedCustomer({
      metadata: { product: 'jalanea_tutoring', user_id: 'user-1' },
      authenticatedUserId: 'user-1',
    }),
    false
  );
  assert.equal(
    isAtsDedicatedCustomer({
      metadata: { product: 'jalanea_ats', user_id: 'user-2' },
      authenticatedUserId: 'user-1',
    }),
    false
  );
});

test('non-entitled existing billing never renders the new-purchase state', () => {
  for (const status of ['past_due', 'paused', 'unpaid']) {
    assert.equal(
      getAccountBillingState(false, status),
      'needs_attention'
    );
  }
  assert.equal(getAccountBillingState(false, null), 'available');
  assert.equal(getAccountBillingState(true, 'active'), 'active');
});
