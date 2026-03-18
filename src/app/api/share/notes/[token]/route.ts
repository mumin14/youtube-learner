import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const user = await db.get(
    "SELECT id, name FROM users WHERE notes_share_token = ?",
    token
  ) as { id: number; name: string | null } | undefined;

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const notes = await db.all(
    `SELECT
      ln.id, ln.content, ln.created_at,
      ai.title as action_title, ai.difficulty, ai.topic,
      a.score, a.grade, a.strengths, a.improvements,
      f.original_name as filename, f.source_type
    FROM learning_notes ln
    JOIN action_items ai ON ai.id = ln.action_item_id
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN assessments a ON a.note_id = ln.id
    ORDER BY ai.difficulty, ai.topic, ln.created_at DESC`,
    user.id
  ) as Array<{
    id: number;
    content: string;
    created_at: string;
    action_title: string;
    difficulty: string;
    topic: string | null;
    score: number | null;
    grade: string | null;
    strengths: string | null;
    improvements: string | null;
    filename: string;
    source_type: string;
  }>;

  const formattedNotes = notes.map((n) => ({
    id: n.id,
    content: n.content,
    created_at: n.created_at,
    actionItem: {
      title: n.action_title,
      difficulty: n.difficulty,
      topic: n.topic,
    },
    assessment: n.score != null
      ? {
          score: n.score,
          grade: n.grade,
          strengths: JSON.parse(n.strengths || "[]"),
          improvements: JSON.parse(n.improvements || "[]"),
        }
      : null,
    filename: n.filename,
    source_type: n.source_type,
  }));

  return NextResponse.json({
    ownerName: user.name || "A Socraty Learner",
    notes: formattedNotes,
  });
}
