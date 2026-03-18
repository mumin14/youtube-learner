import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertUser, createSession, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const { code, email, password } = await request.json();

    if (!code || !email) {
      return NextResponse.json(
        { error: "Code and email are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim().toUpperCase();

    const db = getDb();

    // Look up promo code
    const promo = await db.get<{ id: number; max_uses: number }>(
      `SELECT id, max_uses FROM promo_codes WHERE UPPER(code) = ?`,
      trimmedCode
    );

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid promo code" },
        { status: 400 }
      );
    }

    // Count redemptions
    const countRow = await db.get<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM promo_redemptions WHERE promo_code_id = ?`,
      promo.id
    );
    const used = parseInt(countRow?.count || "0", 10);

    if (used >= promo.max_uses) {
      return NextResponse.json(
        { error: "This promo code has reached its limit" },
        { status: 400 }
      );
    }

    // Check if user already has an active account
    const existing = await db.get<{ id: number; subscription_status: string }>(
      `SELECT id, subscription_status FROM users WHERE email = ?`,
      trimmedEmail
    );

    if (existing && (existing.subscription_status === "active" || existing.subscription_status === "trialing")) {
      return NextResponse.json(
        { error: "This email already has an active account" },
        { status: 400 }
      );
    }

    // Create/update user with lifetime active status (no Stripe, no expiry)
    const user = await upsertUser(trimmedEmail, null, null, "active");

    // Clear any period end so trial banner never shows
    // If password provided, hash and store it
    if (password) {
      const hashed = await hashPassword(password);
      await db.run(
        `UPDATE users SET current_period_end = NULL, password_hash = ? WHERE id = ?`,
        hashed,
        user.id
      );
    } else {
      await db.run(
        `UPDATE users SET current_period_end = NULL WHERE id = ?`,
        user.id
      );
    }

    // Record redemption
    await db.run(
      `INSERT INTO promo_redemptions (promo_code_id, user_id) VALUES (?, ?)
       ON CONFLICT (promo_code_id, user_id) DO NOTHING`,
      promo.id,
      user.id
    );

    // Create session and set cookie
    const { sessionId, expires } = await createSession(user.id);
    await setSessionCookie(sessionId, expires);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Promo redeem error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
