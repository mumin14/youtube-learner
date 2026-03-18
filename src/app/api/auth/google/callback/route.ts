import { NextRequest, NextResponse } from "next/server";
import {
  getUserByGoogleId,
  getUserByEmail,
  updateUserGoogleInfo,
  createSession,
  signSessionId,
  isAdmin,
  upsertUser,
} from "@/lib/auth";
import { getDb } from "@/lib/db";

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}

/** Set session cookie directly on a response object (avoids cookies() API conflict with NextResponse.redirect) */
function setSessionOnResponse(response: NextResponse, sessionId: string, expires: Date) {
  const signed = signSessionId(sessionId);
  response.cookies.set("session", signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("oauth_state")?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Validate state for CSRF protection
  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/?error=invalid_state`
    );
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/?error=token_exchange`);
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${appUrl}/?error=user_info`);
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();
    const email = googleUser.email.toLowerCase();

    // Check if user exists by google_id or email
    let user = (await getUserByGoogleId(googleUser.id)) || (await getUserByEmail(email));

    if (user) {
      // Update Google info if not already linked
      if (!user.google_id) {
        await updateUserGoogleInfo(
          user.id,
          googleUser.id,
          googleUser.name,
          googleUser.picture
        );
      }

      // If subscription is active or user is admin, create session and go to app
      if (
        user.subscription_status === "active" ||
        user.subscription_status === "trialing" ||
        isAdmin(user.email)
      ) {
        const { sessionId, expires } = await createSession(user.id);
        const response = NextResponse.redirect(`${appUrl}/app`);
        setSessionOnResponse(response, sessionId, expires);
        response.cookies.delete("oauth_state");
        return response;
      }
    }

    // Admin without existing user record → create user and go to app
    if (!user && isAdmin(email)) {
      const newUser = await upsertUser(email, null, null, "inactive", {
        googleId: googleUser.id,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      });
      const { sessionId, expires } = await createSession(newUser.id);
      const response = NextResponse.redirect(`${appUrl}/app`);
      setSessionOnResponse(response, sessionId, expires);
      response.cookies.delete("oauth_state");
      return response;
    }

    // Check for promo code before falling through to Stripe
    const promoPending = req.cookies.get("promo_pending")?.value;
    if (promoPending) {
      const db = getDb();
      const trimmedCode = promoPending.trim().toUpperCase();
      const promo = await db.get<{ id: number; max_uses: number }>(
        `SELECT id, max_uses FROM promo_codes WHERE UPPER(code) = ?`,
        trimmedCode
      );

      if (promo) {
        const countRow = await db.get<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM promo_redemptions WHERE promo_code_id = ?`,
          promo.id
        );
        const used = parseInt(countRow?.count || "0", 10);

        if (used < promo.max_uses) {
          // Valid promo code — activate user directly
          const newUser = await upsertUser(email, null, null, "active", {
            googleId: googleUser.id,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          });
          // Clear period end for lifetime access
          await db.run(
            `UPDATE users SET current_period_end = NULL WHERE id = ?`,
            newUser.id
          );
          // Record redemption
          await db.run(
            `INSERT INTO promo_redemptions (promo_code_id, user_id) VALUES (?, ?)
             ON CONFLICT (promo_code_id, user_id) DO NOTHING`,
            promo.id,
            newUser.id
          );
          const { sessionId, expires } = await createSession(newUser.id);
          const response = NextResponse.redirect(`${appUrl}/app`);
          setSessionOnResponse(response, sessionId, expires);
          response.cookies.delete("oauth_state");
          response.cookies.delete("promo_pending");
          return response;
        }
      }
    }

    // No user or inactive subscription → send to Stripe checkout
    // Store Google info in a temporary cookie so activate can use it
    const googleData = JSON.stringify({
      googleId: googleUser.id,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    });

    const response = NextResponse.redirect(
      `${appUrl}/api/stripe/checkout?email=${encodeURIComponent(email)}`
    );
    response.cookies.delete("oauth_state");
    response.cookies.delete("promo_pending");
    response.cookies.set("google_pending", googleData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Google OAuth error:", message, err);
    return NextResponse.redirect(`${appUrl}/?error=oauth_failed&detail=${encodeURIComponent(message)}`);
  }
}
