import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const folder = await db.get(
    "SELECT id, name, color FROM folders WHERE share_token = ?",
    token
  ) as { id: number; name: string; color: string } | undefined;

  if (!folder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get all notes for action items in this folder's files
  const notes = await db.all(
    `SELECT
      ln.id, ln.content, ln.created_at,
      ai.title as action_title, ai.difficulty, ai.topic,
      a.score, a.grade, a.strengths, a.improvements,
      f.original_name as filename
    FROM learning_notes ln
    JOIN action_items ai ON ai.id = ln.action_item_id
    JOIN files f ON f.id = ai.file_id AND f.folder_id = ?
    LEFT JOIN assessments a ON a.note_id = ln.id
    ORDER BY ai.difficulty, ai.topic, ln.created_at DESC`,
    folder.id
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
  }));

  return NextResponse.json({
    folder: { name: folder.name, color: folder.color },
    notes: formattedNotes,
  });
}
