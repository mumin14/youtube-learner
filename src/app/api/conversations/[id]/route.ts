import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const conversation = await db.get(
    `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
    Number(id), user.id
  );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await db.all(
    `SELECT m.id, m.conversation_id, m.role, m.content, m.created_at
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id AND c.user_id = ?
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`,
    user.id, Number(id)
  );

  return NextResponse.json({ conversation, messages });
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

  const result = await db.run(
    `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
    Number(id), user.id
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
