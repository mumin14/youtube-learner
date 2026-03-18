import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const total = (
    await db.get(`SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?`, user.id) as { cnt: number }
  ).cnt;

  const conversations = await db.all(
    `SELECT c.id, c.title, c.file_id, c.updated_at,
            COUNT(m.id) as message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.user_id = ?
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT ? OFFSET ?`,
    user.id, limit, offset
  );

  return NextResponse.json({ conversations, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, fileId } = (await req.json()) as {
    title?: string;
    fileId?: number;
  };

  const db = getDb();
  const result = await db.run(
    `INSERT INTO conversations (user_id, title, file_id) VALUES (?, ?, ?)`,
    user.id, title ?? "New Chat", fileId ?? null
  );

  const conversation = await db.get(
    `SELECT * FROM conversations WHERE id = ?`,
    result.lastInsertRowid
  );

  return NextResponse.json({ conversation }, { status: 201 });
}
