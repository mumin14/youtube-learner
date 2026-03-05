import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import type { UserRecord, SessionRecord } from "@/types";

const SESSION_LIFETIME_DAYS = 30;
const COOKIE_NAME = "session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not set");
  return secret;
}

export function signSessionId(sessionId: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(sessionId);
  const sig = hmac.digest("hex");
  return `${sessionId}.${sig}`;
}

export function verifySessionId(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;
  const sessionId = signed.slice(0, dot);
  const expected = signSessionId(sessionId);
  if (expected.length !== signed.length) return null;
  const isValid = timingSafeEqual(Buffer.from(expected), Buffer.from(signed));
  if (!isValid) return null;
  return sessionId;
}

export function createSession(userId: number): {
  sessionId: string;
  expires: Date;
} {
  const db = getDb();
  const sessionId = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_LIFETIME_DAYS);

  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(sessionId, userId, expires.toISOString());

  return { sessionId, expires };
}

export function getSessionUser(sessionId: string): UserRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(sessionId) as (UserRecord & SessionRecord) | undefined;

  return row || null;
}

export function deleteSession(sessionId: string) {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
}

export function deleteUserSessions(userId: number) {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

export async function setSessionCookie(sessionId: string, expires: Date) {
  const signed = signSessionId(sessionId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function requireAuth(request: NextRequest): UserRecord | null {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;

  const sessionId = verifySessionId(cookie);
  if (!sessionId) return null;

  const user = getSessionUser(sessionId);
  if (!user) return null;

  if (
    user.subscription_status !== "active" &&
    user.subscription_status !== "trialing" &&
    !isAdmin(user.email)
  ) {
    return null;
  }

  return user;
}

export function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}

export function getUserByEmail(email: string): UserRecord | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRecord) || null;
}

export function getUserByStripeCustomerId(customerId: string): UserRecord | null {
  const db = getDb();
  return (
    (db
      .prepare(`SELECT * FROM users WHERE stripe_customer_id = ?`)
      .get(customerId) as UserRecord) || null
  );
}

export function upsertUser(
  email: string,
  stripeCustomerId: string,
  subscriptionId: string | null,
  status: string = "active",
  opts?: { googleId?: string; name?: string; avatarUrl?: string }
): UserRecord {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (email, stripe_customer_id, subscription_id, subscription_status, google_id, name, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       subscription_id = excluded.subscription_id,
       subscription_status = excluded.subscription_status,
       google_id = COALESCE(excluded.google_id, google_id),
       name = COALESCE(excluded.name, name),
       avatar_url = COALESCE(excluded.avatar_url, avatar_url),
       updated_at = datetime('now')`
  ).run(
    email,
    stripeCustomerId,
    subscriptionId,
    status,
    opts?.googleId || null,
    opts?.name || null,
    opts?.avatarUrl || null
  );

  return getUserByEmail(email)!;
}

export function getUserByGoogleId(googleId: string): UserRecord | null {
  const db = getDb();
  return (
    (db
      .prepare(`SELECT * FROM users WHERE google_id = ?`)
      .get(googleId) as UserRecord) || null
  );
}

export function updateUserGoogleInfo(
  userId: number,
  googleId: string,
  name: string | null,
  avatarUrl: string | null
) {
  const db = getDb();
  db.prepare(
    `UPDATE users SET google_id = ?, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
  ).run(googleId, name, avatarUrl, userId);
}
