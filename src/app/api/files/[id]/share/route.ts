import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const file = await db.get(
    "SELECT id, share_token FROM files WHERE id = ? AND user_id = ?",
    Number(id), user.id
  ) as { id: number; share_token: string | null } | undefined;

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.share_token) {
    return NextResponse.json({ token: file.share_token });
  }

  const token = randomBytes(16).toString("hex");
  await db.run("UPDATE files SET share_token = ? WHERE id = ?", token, file.id);

  return NextResponse.json({ token });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  await db.run("UPDATE files SET share_token = NULL WHERE id = ? AND user_id = ?", Number(id), user.id);

  return NextResponse.json({ success: true });
}
