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

export async function createSession(userId: number): Promise<{
  sessionId: string;
  expires: Date;
}> {
  const db = getDb();
  const sessionId = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_LIFETIME_DAYS);

  await db.run(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
    sessionId, userId, expires.toISOString()
  );

  return { sessionId, expires };
}

export async function getSessionUser(sessionId: string): Promise<UserRecord | null> {
  const db = getDb();
  const row = await db.get(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > NOW()`,
    sessionId
  ) as (UserRecord & SessionRecord) | undefined;

  return row || null;
}

export async function deleteSession(sessionId: string) {
  const db = getDb();
  await db.run(`DELETE FROM sessions WHERE id = ?`, sessionId);
}

export async function deleteUserSessions(userId: number) {
  const db = getDb();
  await db.run(`DELETE FROM sessions WHERE user_id = ?`, userId);
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

export async function requireAuth(request: NextRequest): Promise<UserRecord | null> {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;

  const sessionId = verifySessionId(cookie);
  if (!sessionId) return null;

  const user = await getSessionUser(sessionId);
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

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const db = getDb();
  return (await db.get(`SELECT * FROM users WHERE email = ?`, email) as UserRecord) || null;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<UserRecord | null> {
  const db = getDb();
  return (
    (await db.get(`SELECT * FROM users WHERE stripe_customer_id = ?`, customerId) as UserRecord) || null
  );
}

export async function upsertUser(
  email: string,
  stripeCustomerId: string | null,
  subscriptionId: string | null,
  status: string = "active",
  opts?: { googleId?: string; name?: string; avatarUrl?: string }
): Promise<UserRecord> {
  const db = getDb();
  await db.run(
    `INSERT INTO users (email, stripe_customer_id, subscription_id, subscription_status, google_id, name, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       stripe_customer_id = COALESCE(excluded.stripe_customer_id, users.stripe_customer_id),
       subscription_id = COALESCE(excluded.subscription_id, users.subscription_id),
       subscription_status = excluded.subscription_status,
       google_id = COALESCE(excluded.google_id, users.google_id),
       name = COALESCE(excluded.name, users.name),
       avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
       updated_at = NOW()`,
    email,
    stripeCustomerId,
    subscriptionId,
    status,
    opts?.googleId || null,
    opts?.name || null,
    opts?.avatarUrl || null
  );

  return (await getUserByEmail(email))!;
}

export async function getUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const db = getDb();
  return (
    (await db.get(`SELECT * FROM users WHERE google_id = ?`, googleId) as UserRecord) || null
  );
}

export async function updateUserGoogleInfo(
  userId: number,
  googleId: string,
  name: string | null,
  avatarUrl: string | null
) {
  const db = getDb();
  await db.run(
    `UPDATE users SET google_id = ?, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = NOW() WHERE id = ?`,
    googleId, name, avatarUrl, userId
  );
}
