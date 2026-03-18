import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const row = await db.get(
    "SELECT notes_share_token FROM users WHERE id = ?",
    user.id
  ) as { notes_share_token: string | null } | undefined;

  if (row?.notes_share_token) {
    return NextResponse.json({ token: row.notes_share_token });
  }

  const token = randomBytes(16).toString("hex");
  await db.run("UPDATE users SET notes_share_token = ? WHERE id = ?", token, user.id);

  return NextResponse.json({ token });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await db.run("UPDATE users SET notes_share_token = NULL WHERE id = ?", user.id);

  return NextResponse.json({ success: true });
}
