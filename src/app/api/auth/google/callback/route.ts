import { NextRequest, NextResponse } from "next/server";
import {
  getUserByGoogleId,
  getUserByEmail,
  updateUserGoogleInfo,
  createSession,
  setSessionCookie,
  isAdmin,
  upsertUser,
} from "@/lib/auth";

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
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
    let user = getUserByGoogleId(googleUser.id) || getUserByEmail(email);

    if (user) {
      // Update Google info if not already linked
      if (!user.google_id) {
        updateUserGoogleInfo(
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
        const { sessionId, expires } = createSession(user.id);
        await setSessionCookie(sessionId, expires);

        const response = NextResponse.redirect(`${appUrl}/app`);
        response.cookies.delete("oauth_state");
        return response;
      }
    }

    // Admin without existing user record → create user and go to app
    if (!user && isAdmin(email)) {
      const newUser = upsertUser(email, "", null, "inactive", {
        googleId: googleUser.id,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      });
      const { sessionId, expires } = createSession(newUser.id);
      await setSessionCookie(sessionId, expires);

      const response = NextResponse.redirect(`${appUrl}/app`);
      response.cookies.delete("oauth_state");
      return response;
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
    response.cookies.set("google_pending", googleData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour
    });
    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(`${appUrl}/?error=oauth_failed`);
  }
}
