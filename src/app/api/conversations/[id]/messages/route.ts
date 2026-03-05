import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const convId = Number(id);
  const db = getDb();

  // Verify conversation belongs to user
  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ? AND user_id = ?`)
    .get(convId, user.id) as { id: number; title: string } | undefined;

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userMessage, assistantMessage } = (await req.json()) as {
    userMessage: string;
    assistantMessage: string;
  };

  const insertMsg = db.prepare(
    `INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`
  );

  const saveMessages = db.transaction(() => {
    insertMsg.run(convId, "user", userMessage);
    insertMsg.run(convId, "assistant", assistantMessage);

    // Auto-set title from first user message if still default
    if (conversation.title === "New Chat") {
      const title =
        userMessage.length > 50
          ? userMessage.slice(0, 50) + "..."
          : userMessage;
      db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(
        title,
        convId
      );
    }

    db.prepare(
      `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`
    ).run(convId);
  });

  saveMessages();

  return NextResponse.json({ ok: true }, { status: 201 });
}
