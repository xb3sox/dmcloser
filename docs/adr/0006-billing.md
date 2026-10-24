# ADR-0006: Direct Stripe Integration and Webhook Reconciled Entitlements

## Status
Accepted

## Context
DMCloser requires subscription billing, checkout session creation, customer portal access, and workspace feature entitlement enforcement based on subscription status.

## Decision
We implemented direct SDK integration with Stripe and webhook-driven entitlement reconciliation:
- **Official SDK:** Direct server-side use of official `stripe` Node package in `server/billing.ts`.
- **Signed Webhook Reconciliation:** Stripe webhook events (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`) are cryptographically verified using `stripe.webhooks.constructEvent` with the raw request body.
- **Durable Webhook Ingestion:** Webhooks are recorded in `webhook_receipts` with unique event ID deduplication to ensure idempotent state reconciliation.
- **Real-Time Entitlement Gate:** Workspace automation gates (`autoAllowed()`) check subscription status directly against workspace records prior to performing automated actions.

## Alternatives Considered
- **Paddle / LemonSqueezy / Chargebee:** Evaluated merchant-of-record and multi-billing wrapper services. Rejected to maintain direct relationships with Stripe, lower transaction fee overhead, and ensure full control over billing webhooks and subscription state machine transitions.
- **Client-Side Entitlement Checks:** Rejected as unsafe; subscription state enforcement occurs exclusively on the Express backend server.

## Consequences
- **Positive:** Robust, idempotent subscription state reconciliation directly tied to Stripe's canonical webhook events.
- **Negative:** Stripe price IDs and secret keys must be properly configured in environment settings for live billing operations.
