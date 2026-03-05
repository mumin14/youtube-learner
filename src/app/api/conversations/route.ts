import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const conversations = db
    .prepare(
      `SELECT c.id, c.title, c.file_id, c.updated_at,
              COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC`
    )
    .all(user.id);

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, fileId } = (await req.json()) as {
    title?: string;
    fileId?: number;
  };

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO conversations (user_id, title, file_id) VALUES (?, ?, ?)`
    )
    .run(user.id, title ?? "New Chat", fileId ?? null);

  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(result.lastInsertRowid);

  return NextResponse.json({ conversation }, { status: 201 });
}
