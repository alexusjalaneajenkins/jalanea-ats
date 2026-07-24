export type CheckoutPlan = 'lifetime' | 'monthly';

export interface CheckoutUser {
  id: string;
  email: string | null;
}

export interface CheckoutAttempt {
  id: string;
  status: 'pending' | 'session_created' | 'completed' | 'failed' | 'expired';
  stripeSessionId: string | null;
  idempotencyKey: string;
}

export interface CheckoutSessionSummary {
  id: string;
  url: string | null;
  status: 'open' | 'complete' | 'expired' | null;
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required' | null;
  createdAt: string;
  expiresAt: string | null;
  reconciledAt: string;
}

export class CheckoutSessionLookupError extends Error {
  readonly canReplace: boolean;

  constructor(canReplace: boolean) {
    super('Checkout session lookup failed');
    this.name = 'CheckoutSessionLookupError';
    this.canReplace = canReplace;
  }
}

export interface CheckoutSessionInput {
  attemptId: string;
  plan: CheckoutPlan;
  user: CheckoutUser;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutDependencies {
  authenticate(request: Request): Promise<CheckoutUser | null>;
  getMembershipStatus(userId: string): Promise<'active' | 'removed'>;
  hasCurrentEntitlement(userId: string): Promise<boolean>;
  hasBillingRelationship(userId: string): Promise<boolean>;
  getCustomerId(userId: string): Promise<string | null>;
  createCustomer(user: CheckoutUser, idempotencyKey: string): Promise<string>;
  saveCustomerId(userId: string, customerId: string): Promise<void>;
  claimAttempt(input: {
    userId: string;
    plan: CheckoutPlan;
    customerId: string | null;
  }): Promise<CheckoutAttempt>;
  getSession(sessionId: string): Promise<CheckoutSessionSummary>;
  createSession(
    input: CheckoutSessionInput,
    idempotencyKey: string
  ): Promise<CheckoutSessionSummary>;
  markAttemptSession(input: {
    attemptId: string;
    userId: string;
    customerId: string;
    session: CheckoutSessionSummary;
  }): Promise<void>;
  markAttemptFailed(input: {
    attemptId: string;
    userId: string;
    status: 'failed' | 'expired';
    sessionId: string | null;
    errorCode: string;
    reconciledAt: string;
  }): Promise<void>;
  getReturnUrls(): {
    checkoutSuccess: string;
    checkoutCancel: string;
  };
}

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function readPlan(request: Request): Promise<CheckoutPlan | null> {
  try {
    const body = await request.json();
    return body?.priceType === 'lifetime' || body?.priceType === 'monthly'
      ? body.priceType
      : null;
  } catch {
    return null;
  }
}

/**
 * Checkout orchestration with all provider/database effects injected.
 *
 * Authentication intentionally happens before parsing or validating the plan.
 * A database attempt ID is the logical checkout ID and therefore the Stripe
 * idempotency key. Concurrent calls for the same active attempt coalesce.
 */
export async function handleCheckoutRequest(
  request: Request,
  dependencies: CheckoutDependencies
): Promise<Response> {
  const user = await dependencies.authenticate(request);
  if (!user) {
    return json(
      {
        error: 'Please log in before purchasing. Your purchase must be linked to your account.',
      },
      401
    );
  }

  const plan = await readPlan(request);
  if (!plan) {
    return json(
      { error: 'Invalid price type. Must be "lifetime" or "monthly".' },
      400
    );
  }

  if ((await dependencies.getMembershipStatus(user.id)) === 'removed') {
    return json(
      {
        error:
          'Jalanea ATS was removed from this shared account. Contact support before starting a new purchase.',
      },
      410
    );
  }

  if (await dependencies.hasCurrentEntitlement(user.id)) {
    return json(
      {
        error: 'This account already has paid access. Manage the existing plan from your account.',
      },
      409
    );
  }

  if (await dependencies.hasBillingRelationship(user.id)) {
    return json(
      {
        error:
          'This account already has a Jalanea ATS billing relationship. Contact support before starting another purchase.',
      },
      409
    );
  }

  let customerId = await dependencies.getCustomerId(user.id);
  let attempt = await dependencies.claimAttempt({
    userId: user.id,
    plan,
    customerId,
  });

  if (!customerId) {
    customerId = await dependencies.createCustomer(
      user,
      `ats-customer:${user.id}`
    );
    await dependencies.saveCustomerId(user.id, customerId);
    // Reclaiming the same active plan attempt atomically attaches the newly
    // persisted customer while the pending attempt keeps deletion blocked.
    attempt = await dependencies.claimAttempt({
      userId: user.id,
      plan,
      customerId,
    });
  }

  if (attempt.status === 'completed') {
    return json(
      { error: 'This checkout has already completed. Refresh your account to see access.' },
      409
    );
  }

  if (attempt.stripeSessionId) {
    let attemptClosureReconciledAt: string | null = null;
    try {
      const existingSession = await dependencies.getSession(attempt.stripeSessionId);
      attemptClosureReconciledAt = existingSession.reconciledAt;
      if (existingSession.status === 'open' && existingSession.url) {
        return json(
          {
            sessionId: existingSession.id,
            url: existingSession.url,
            reused: true,
          },
          200
        );
      }

      if (existingSession.status === 'complete') {
        return json(
          {
            error:
              existingSession.paymentStatus === 'paid'
                ? 'Payment completed and access is being reconciled.'
                : 'Checkout completed, but payment is still pending.',
            state: existingSession.paymentStatus === 'paid' ? 'paid' : 'pending',
          },
          202
        );
      }
    } catch (error) {
      // A missing/invalid provider session is not reusable. The durable
      // attempt is closed before claiming a new logical checkout.
      if (
        !(error instanceof CheckoutSessionLookupError) ||
        !error.canReplace
      ) {
        return json(
          { error: 'Checkout status is temporarily unavailable. Please retry.' },
          503
        );
      }
      attemptClosureReconciledAt = new Date().toISOString();
    }

    await dependencies.markAttemptFailed({
      attemptId: attempt.id,
      userId: user.id,
      status: 'expired',
      sessionId: attempt.stripeSessionId,
      errorCode: 'checkout_session_expired',
      reconciledAt:
        attemptClosureReconciledAt ?? new Date().toISOString(),
    });
    attempt = await dependencies.claimAttempt({
      userId: user.id,
      plan,
      customerId,
    });
  }

  try {
    const urls = dependencies.getReturnUrls();
    const session = await dependencies.createSession(
      {
        attemptId: attempt.id,
        plan,
        user,
        customerId,
        successUrl: urls.checkoutSuccess,
        cancelUrl: urls.checkoutCancel,
      },
      attempt.idempotencyKey
    );

    if (!session.url) {
      await dependencies.markAttemptFailed({
        attemptId: attempt.id,
        userId: user.id,
        status: 'failed',
        sessionId: session.id,
        errorCode: 'missing_checkout_url',
        reconciledAt: session.reconciledAt,
      });
      return json({ error: 'Checkout is temporarily unavailable.' }, 502);
    }

    await dependencies.markAttemptSession({
      attemptId: attempt.id,
      userId: user.id,
      customerId,
      session,
    });

    return json(
      {
        sessionId: session.id,
        url: session.url,
        reused: false,
      },
      200
    );
  } catch {
    // Keep the durable attempt pending. Retrying with the same attempt-level
    // idempotency key safely recovers an ambiguous provider response.
    return json({ error: 'Checkout is temporarily unavailable. Please try again.' }, 502);
  }
}
