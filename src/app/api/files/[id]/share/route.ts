import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const file = db
    .prepare("SELECT id, share_token FROM files WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id) as { id: number; share_token: string | null } | undefined;

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.share_token) {
    return NextResponse.json({ token: file.share_token });
  }

  const token = randomUUID().replace(/-/g, "").slice(0, 16);
  db.prepare("UPDATE files SET share_token = ? WHERE id = ?").run(token, file.id);

  return NextResponse.json({ token });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  db.prepare("UPDATE files SET share_token = NULL WHERE id = ? AND user_id = ?").run(Number(id), user.id);

  return NextResponse.json({ success: true });
}
