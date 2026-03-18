import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const email =
        session.customer_email || session.customer_details?.email;

      if (email) {
        await db.run(
          `INSERT INTO users (email, stripe_customer_id, subscription_id, subscription_status)
           VALUES (?, ?, ?, 'active')
           ON CONFLICT(email) DO UPDATE SET
             stripe_customer_id = excluded.stripe_customer_id,
             subscription_id = excluded.subscription_id,
             subscription_status = 'active',
             updated_at = NOW()`,
          email, customerId, subscriptionId
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = mapStripeStatus(subscription.status);
      const rawEnd =
        (subscription as unknown as { current_period_end?: number })
          .current_period_end ?? Math.floor(Date.now() / 1000);
      const periodEnd = new Date(rawEnd * 1000).toISOString();

      await db.run(
        `UPDATE users SET
          subscription_status = ?,
          current_period_end = ?,
          updated_at = NOW()
        WHERE stripe_customer_id = ?`,
        status, periodEnd, customerId
      );

      if (status === "canceled" || status === "inactive") {
        const user = await db.get(
          "SELECT id FROM users WHERE stripe_customer_id = ?",
          customerId
        ) as { id: number } | undefined;
        if (user) {
          await db.run("DELETE FROM sessions WHERE user_id = ?", user.id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const user = await db.get(
        "SELECT id FROM users WHERE stripe_customer_id = ?",
        customerId
      ) as { id: number } | undefined;

      await db.run(
        `UPDATE users SET subscription_status = 'canceled', updated_at = NOW()
         WHERE stripe_customer_id = ?`,
        customerId
      );

      if (user) {
        await db.run("DELETE FROM sessions WHERE user_id = ?", user.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await db.run(
        `UPDATE users SET subscription_status = 'past_due', updated_at = NOW()
         WHERE stripe_customer_id = ?`,
        customerId
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): string {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}
