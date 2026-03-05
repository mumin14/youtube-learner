import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { upsertUser, createSession, setSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { checkoutSessionId } = (await req.json()) as {
    checkoutSessionId: string;
  };

  if (!checkoutSessionId) {
    return NextResponse.json(
      { error: "Missing checkout session ID" },
      { status: 400 }
    );
  }

  // Retrieve the checkout session from Stripe
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    checkoutSessionId,
    { expand: ["subscription"] }
  );

  const customerId = checkoutSession.customer as string;
  const subscriptionId = checkoutSession.subscription;
  const email =
    checkoutSession.customer_email ||
    checkoutSession.customer_details?.email;

  if (!email || !customerId) {
    return NextResponse.json(
      { error: "Could not retrieve account details" },
      { status: 400 }
    );
  }

  // Check for Google OAuth data from pending cookie
  let googleOpts: { googleId?: string; name?: string; avatarUrl?: string } | undefined;
  const cookieStore = await cookies();
  const googlePending = cookieStore.get("google_pending")?.value;
  if (googlePending) {
    try {
      googleOpts = JSON.parse(googlePending);
    } catch {
      // ignore malformed cookie
    }
  }

  // Create or update user in our database
  const subId =
    typeof subscriptionId === "string"
      ? subscriptionId
      : subscriptionId?.id || null;

  const user = upsertUser(
    email.toLowerCase(),
    customerId,
    subId,
    "active",
    googleOpts
  );

  // Create session and set cookie
  const { sessionId, expires } = createSession(user.id);
  await setSessionCookie(sessionId, expires);

  // Clear the google_pending cookie
  if (googlePending) {
    cookieStore.delete("google_pending");
  }

  return NextResponse.json({ ok: true });
}
