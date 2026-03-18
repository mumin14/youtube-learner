import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// POST — called from landing page email form
export async function POST(req: NextRequest) {
  const { email, billingPeriod } = (await req.json()) as {
    email: string;
    billingPeriod?: "monthly" | "annual";
  };
  return createCheckoutSession(email?.trim(), billingPeriod || "monthly");
}

// GET — called from Google OAuth callback redirect
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const billingPeriod =
    (req.nextUrl.searchParams.get("billing") as "monthly" | "annual") ||
    "monthly";

  if (!email?.trim()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/?error=missing_email`);
  }

  const result = await createCheckoutSession(email.trim(), billingPeriod);
  const data = await result.json();

  if (data.url) {
    return NextResponse.redirect(data.url);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/?error=checkout_failed`);
}

async function createCheckoutSession(
  email: string | undefined,
  billingPeriod: "monthly" | "annual"
) {
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find or create Stripe customer
  const existing = await stripe.customers.list({ email, limit: 1 });
  let customerId: string;

  if (existing.data.length > 0) {
    customerId = existing.data[0].id;
  } else {
    const customer = await stripe.customers.create({ email });
    customerId = customer.id;
  }

  const priceId =
    billingPeriod === "annual"
      ? process.env.STRIPE_ANNUAL_PRICE_ID!
      : process.env.STRIPE_PRICE_ID!;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
    },
    payment_method_collection: "always",
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/`,
  });

  return NextResponse.json({ url: session.url });
}
