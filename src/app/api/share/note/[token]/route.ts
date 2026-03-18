import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const row = await db.get(
    `SELECT
      ln.id, ln.content, ln.created_at,
      ai.title as action_title, ai.difficulty, ai.topic,
      a.score, a.grade, a.strengths, a.improvements,
      f.original_name as filename, f.source_type,
      u.name as owner_name
    FROM learning_notes ln
    JOIN action_items ai ON ai.id = ln.action_item_id
    JOIN files f ON f.id = ai.file_id
    JOIN users u ON u.id = f.user_id
    LEFT JOIN assessments a ON a.note_id = ln.id
    WHERE ln.share_token = ?`,
    token
  ) as {
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
    owner_name: string | null;
  } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ownerName: row.owner_name || "A Socraty Learner",
    note: {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      actionItem: {
        title: row.action_title,
        difficulty: row.difficulty,
        topic: row.topic,
      },
      assessment: row.score != null
        ? {
            score: row.score,
            grade: row.grade,
            strengths: JSON.parse(row.strengths || "[]"),
            improvements: JSON.parse(row.improvements || "[]"),
          }
        : null,
      filename: row.filename,
      source_type: row.source_type,
    },
  });
}
