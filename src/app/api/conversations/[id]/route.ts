import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ? AND user_id = ?`)
    .get(Number(id), user.id);

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = db
    .prepare(
      `SELECT id, conversation_id, role, content, created_at
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(Number(id));

  return NextResponse.json({ conversation, messages });
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

  const result = db
    .prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`)
    .run(Number(id), user.id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
