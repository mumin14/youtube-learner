import { NextRequest, NextResponse } from "next/server";
import { requireAuth, deleteUserSessions, clearSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function DELETE(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Cancel Stripe subscription if one exists
    if (user.subscription_id && user.subscription_id.startsWith("sub_")) {
      try {
        await stripe.subscriptions.cancel(user.subscription_id);
      } catch {
        // Subscription may already be cancelled
      }
    }

    // Delete all sessions
    await deleteUserSessions(user.id);

    // Delete user row (CASCADE handles all related data)
    const db = getDb();
    await db.run(`DELETE FROM users WHERE id = ?`, user.id);

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
