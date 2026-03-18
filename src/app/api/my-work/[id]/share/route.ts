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

  // Verify note ownership: learning_notes → action_items → files → user_id
  const note = await db.get(
    `SELECT ln.id, ln.share_token
     FROM learning_notes ln
     JOIN action_items ai ON ai.id = ln.action_item_id
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE ln.id = ?`,
    user.id, Number(id)
  ) as { id: number; share_token: string | null } | undefined;

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.share_token) {
    return NextResponse.json({ token: note.share_token });
  }

  const token = randomBytes(16).toString("hex");
  await db.run("UPDATE learning_notes SET share_token = ? WHERE id = ?", token, note.id);

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

  await db.run(
    `UPDATE learning_notes SET share_token = NULL
     WHERE id = ? AND id IN (
       SELECT ln.id FROM learning_notes ln
       JOIN action_items ai ON ai.id = ln.action_item_id
       JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     )`,
    Number(id), user.id
  );

  return NextResponse.json({ success: true });
}
