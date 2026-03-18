import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const convId = Number(id);
  const db = getDb();

  // Verify conversation belongs to user
  const conversation = await db.get(
    `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
    convId, user.id
  ) as { id: number; title: string } | undefined;

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userMessage, assistantMessage } = (await req.json()) as {
    userMessage: string;
    assistantMessage: string;
  };

  await db.transaction(async () => {
    await db.run(
      `INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`,
      convId, "user", userMessage
    );
    await db.run(
      `INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`,
      convId, "assistant", assistantMessage
    );

    // Auto-set title from first user message if still default
    if (conversation.title === "New Chat") {
      const title =
        userMessage.length > 50
          ? userMessage.slice(0, 50) + "..."
          : userMessage;
      await db.run(
        `UPDATE conversations SET title = ? WHERE id = ?`,
        title, convId
      );
    }

    await db.run(
      `UPDATE conversations SET updated_at = NOW() WHERE id = ?`,
      convId
    );
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
