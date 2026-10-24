// probe: v3 precision
import Stripe from "stripe";
import type { ProductService } from "./service.ts";
import { HttpError } from "./security.ts";

export class Billing {
  stripe: Stripe | null;
  constructor(private service: ProductService) {
    this.stripe = service.config.stripeKey
      ? new Stripe(service.config.stripeKey, {
          maxNetworkRetries: 1,
          timeout: 10000,
        })
      : null;
  }
  async checkout(
    workspaceId: string,
    email: string,
    plan: string,
    interval: string,
    key: string,
  ) {
    const price = this.service.config.prices[`${plan}_${interval}`];
    if (!this.stripe || !this.service.config.stripeWebhookSecret || !price)
      throw new HttpError(
        503,
        "Billing is not configured for this plan. No payment has been taken.",
      );
    const [workspace] = await this.service.db.query(
      "SELECT * FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    if (
      workspace.stripe_subscription &&
      ["active", "trialing", "past_due"].includes(workspace.billing_status) &&
      workspace.plan !== "trial"
    )
      throw new HttpError(
        409,
        "Manage your existing subscription through the billing portal.",
      );
    let customer = workspace.stripe_customer;
    if (!customer) {
      const created = await this.stripe.customers.create(
        { email, metadata: { workspaceId } },
        { idempotencyKey: `customer:${workspaceId}` },
      );
      customer = created.id;
      await this.service.db.query(
        "UPDATE workspaces SET stripe_customer=$1 WHERE id=$2",
        [customer, workspaceId],
      );
    }
    const session = await this.stripe.checkout.sessions.create(
      {
        customer,
        mode: "subscription",
        client_reference_id: workspaceId,
        line_items: [{ price, quantity: 1 }],
        subscription_data: { metadata: { workspaceId } },
        success_url: `${this.service.config.appUrl}/workspace?billing=processing`,
        cancel_url: `${this.service.config.appUrl}/workspace?billing=cancelled`,
      },
      { idempotencyKey: `checkout:${workspaceId}:${key}` },
    );
    return session.url;
  }
  async portal(workspaceId: string) {
    const [workspace] = await this.service.db.query(
      "SELECT stripe_customer FROM workspaces WHERE id=$1",
      [workspaceId],
    );
    if (!this.stripe || !workspace?.stripe_customer)
      throw new HttpError(409, "No billing account exists yet.");
    return (
      await this.stripe.billingPortal.sessions.create({
        customer: workspace.stripe_customer,
        return_url: `${this.service.config.appUrl}/workspace`,
      })
    ).url;
  }
  async process(event: Stripe.Event) {
    if (!this.stripe) throw new Error("Billing is not configured.");
    const object = event.data.object as any;
    const subscriptionId = event.type.startsWith("customer.subscription.")
      ? object.id
      : typeof object.subscription === "string"
        ? object.subscription
        : object.parent?.subscription_details?.subscription;
    if (!subscriptionId) return;
    // Retrieve current truth: stale or out-of-order events cannot reactivate a cancelled subscription.
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const [workspace] = await this.service.db.query(
      "SELECT id FROM workspaces WHERE stripe_customer=$1",
      [customer],
    );
    if (!workspace || subscription.metadata.workspaceId !== workspace.id)
      return;
    const priceId = subscription.items.data[0]?.price.id;
    const entry = Object.entries(this.service.config.prices).find(
      ([, value]) => !!value && value === priceId,
    );
    if (!entry)
      throw new Error("Unknown Stripe price. Provisioning requires review.");
    await this.service.db.query(
      "UPDATE workspaces SET plan=$1,billing_status=$2,stripe_subscription=$3,updated_at=now() WHERE id=$4",
      [
        entry[0].split("_")[0],
        subscription.status,
        subscription.id,
        workspace.id,
      ],
    );
    await this.service.audit(
      workspace.id,
      null,
      "billing.reconciled",
      event.id,
      { status: subscription.status },
    );
    this.service.changed(workspace.id);
  }
}
