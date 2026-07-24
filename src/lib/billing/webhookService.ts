export interface StripeEventEnvelope {
  id: string;
  type: string;
  created: number;
  data: {
    object: {
      id?: string;
      [key: string]: unknown;
    };
  };
}

export interface EventClaim {
  claimed: boolean;
  status: string;
}

export interface WebhookDependencies {
  claimEvent(input: {
    eventId: string;
    eventType: string;
    objectId: string;
    eventCreatedAt: string;
  }): Promise<EventClaim>;
  finishEvent(input: {
    eventId: string;
    status: 'processed' | 'failed' | 'ignored';
    errorCode: string | null;
    retryAt: string | null;
  }): Promise<void>;
  reconcileCheckoutSession(
    sessionId: string,
    eventId: string,
    eventCreatedAt: string
  ): Promise<void>;
  failCheckoutSession(
    sessionId: string,
    eventId: string,
    reason: 'async_payment_failed' | 'expired',
    eventCreatedAt: string
  ): Promise<void>;
  reconcileSubscription(
    subscriptionId: string,
    eventId: string,
    eventCreatedAt: string,
    fallbackObject?: Record<string, unknown>
  ): Promise<void>;
}

const CHECKOUT_RECONCILIATION_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
]);

const SUBSCRIPTION_RECONCILIATION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

function toIsoTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function getInvoiceSubscriptionId(object: Record<string, unknown>): string | null {
  const legacySubscription = object.subscription;
  if (typeof legacySubscription === 'string') return legacySubscription;
  if (
    legacySubscription &&
    typeof legacySubscription === 'object' &&
    typeof (legacySubscription as Record<string, unknown>).id === 'string'
  ) {
    return (legacySubscription as Record<string, unknown>).id as string;
  }

  const parent = object.parent;
  if (!parent || typeof parent !== 'object') return null;

  const details = (parent as Record<string, unknown>).subscription_details;
  if (!details || typeof details !== 'object') return null;

  const subscription = (details as Record<string, unknown>).subscription;
  if (typeof subscription === 'string') return subscription;
  if (
    subscription &&
    typeof subscription === 'object' &&
    typeof (subscription as Record<string, unknown>).id === 'string'
  ) {
    return (subscription as Record<string, unknown>).id as string;
  }

  return null;
}

function getObjectId(event: StripeEventEnvelope): string | null {
  if (event.type.startsWith('invoice.')) {
    return getInvoiceSubscriptionId(event.data.object);
  }

  return typeof event.data.object.id === 'string' ? event.data.object.id : null;
}

export type WebhookProcessingResult =
  | 'processed'
  | 'duplicate'
  | 'ignored';

/**
 * Claims an event before any effect and reconciles current Stripe objects
 * instead of trusting the event snapshot. A failed event is left retryable.
 */
export async function processStripeEvent(
  event: StripeEventEnvelope,
  dependencies: WebhookDependencies
): Promise<WebhookProcessingResult> {
  const resolvedObjectId = getObjectId(event);
  const objectId = resolvedObjectId ?? 'unknown';
  const eventCreatedAt = toIsoTime(event.created);

  const claim = await dependencies.claimEvent({
    eventId: event.id,
    eventType: event.type,
    objectId,
    eventCreatedAt,
  });

  if (!claim.claimed) {
    if (claim.status === 'processed' || claim.status === 'ignored') {
      return 'duplicate';
    }

    // There is no background worker in this application. Returning a failure
    // makes Stripe retry instead of incorrectly acknowledging an event whose
    // first handler is still processing or waiting for retry.
    throw new Error('Stripe event is not ready to acknowledge');
  }

  if (!resolvedObjectId) {
    await dependencies.finishEvent({
      eventId: event.id,
      status: 'ignored',
      errorCode: 'missing_object_id',
      retryAt: null,
    });
    return 'ignored';
  }

  try {
    if (CHECKOUT_RECONCILIATION_EVENTS.has(event.type)) {
      await dependencies.reconcileCheckoutSession(
        objectId,
        event.id,
        eventCreatedAt
      );
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await dependencies.failCheckoutSession(
        objectId,
        event.id,
        'async_payment_failed',
        eventCreatedAt
      );
    } else if (event.type === 'checkout.session.expired') {
      await dependencies.failCheckoutSession(
        objectId,
        event.id,
        'expired',
        eventCreatedAt
      );
    } else if (SUBSCRIPTION_RECONCILIATION_EVENTS.has(event.type)) {
      await dependencies.reconcileSubscription(
        objectId,
        event.id,
        eventCreatedAt,
        event.type === 'customer.subscription.deleted'
          ? event.data.object
          : undefined
      );
    } else {
      await dependencies.finishEvent({
        eventId: event.id,
        status: 'ignored',
        errorCode: null,
        retryAt: null,
      });
      return 'ignored';
    }

    await dependencies.finishEvent({
      eventId: event.id,
      status: 'processed',
      errorCode: null,
      retryAt: null,
    });
    return 'processed';
  } catch {
    await dependencies.finishEvent({
      eventId: event.id,
      status: 'failed',
      errorCode: 'reconciliation_failed',
      retryAt: new Date(Date.now() + 60_000).toISOString(),
    });
    throw new Error('Stripe event reconciliation failed');
  }
}
