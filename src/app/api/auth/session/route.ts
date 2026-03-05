import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionId,
  getSessionUser,
  createSession,
  setSessionCookie,
  deleteSession,
  clearSessionCookie,
  getUserByEmail,
} from "@/lib/auth";
import { stripe } from "@/lib/stripe";

// GET — check current session
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("session")?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessionId = verifySessionId(cookie);
  if (!sessionId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = getSessionUser(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  });
}

// POST — restore session by email
export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return NextResponse.json(
      { error: "No account found with this email" },
      { status: 404 }
    );
  }

  // Verify subscription is still active
  if (user.subscription_id && user.subscription_id.startsWith("sub_")) {
    // Real Stripe subscription — verify with Stripe API
    try {
      const sub = await stripe.subscriptions.retrieve(user.subscription_id);
      if (sub.status !== "active" && sub.status !== "trialing") {
        return NextResponse.json(
          { error: "Your subscription is no longer active" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not verify subscription" },
        { status: 500 }
      );
    }
  } else if (
    user.subscription_status !== "active" &&
    user.subscription_status !== "trialing"
  ) {
    return NextResponse.json(
      { error: "Your subscription is no longer active" },
      { status: 403 }
    );
  }

  const { sessionId, expires } = createSession(user.id);
  await setSessionCookie(sessionId, expires);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      subscription_status: user.subscription_status,
    },
  });
}

// DELETE — logout
export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get("session")?.value;
  if (cookie) {
    const sessionId = verifySessionId(cookie);
    if (sessionId) {
      deleteSession(sessionId);
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
