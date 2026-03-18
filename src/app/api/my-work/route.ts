import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = req.nextUrl.searchParams.get("folderId");

  const db = getDb();

  // Get user's all-notes share token
  const userRow = await db.get(
    "SELECT notes_share_token FROM users WHERE id = ?",
    user.id
  ) as { notes_share_token: string | null } | undefined;

  let query = `
    SELECT
      ln.id, ln.content, ln.created_at, ln.share_token,
      ai.id as action_item_id, ai.title as action_title, ai.difficulty, ai.topic,
      a.score, a.grade, a.strengths, a.improvements,
      f.original_name as filename, f.source_type, f.folder_id,
      fo.id as folder_id, fo.name as folder_name, fo.color as folder_color
    FROM learning_notes ln
    JOIN action_items ai ON ai.id = ln.action_item_id
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN assessments a ON a.note_id = ln.id
    LEFT JOIN folders fo ON fo.id = f.folder_id
    WHERE ln.user_id = ?
  `;
  const params: (string | number)[] = [user.id, user.id];

  if (folderId) {
    query += ` AND f.folder_id = ?`;
    params.push(Number(folderId));
  }

  query += ` ORDER BY ln.created_at DESC`;

  const rows = await db.all(query, ...params) as Array<{
    id: number;
    content: string;
    created_at: string;
    share_token: string | null;
    action_item_id: number;
    action_title: string;
    difficulty: string;
    topic: string | null;
    score: number | null;
    grade: string | null;
    strengths: string | null;
    improvements: string | null;
    filename: string;
    source_type: string;
    folder_id: number | null;
    folder_name: string | null;
    folder_color: string | null;
  }>;

  const notes = rows.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    share_token: r.share_token,
    actionItem: {
      id: r.action_item_id,
      title: r.action_title,
      difficulty: r.difficulty,
      topic: r.topic,
    },
    assessment: r.score != null
      ? {
          score: r.score,
          grade: r.grade,
          strengths: JSON.parse(r.strengths || "[]"),
          improvements: JSON.parse(r.improvements || "[]"),
        }
      : null,
    folder: r.folder_id
      ? { id: r.folder_id, name: r.folder_name, color: r.folder_color }
      : null,
    filename: r.filename,
    source_type: r.source_type,
  }));

  return NextResponse.json({
    notes,
    allNotesShareToken: userRow?.notes_share_token ?? null,
  });
}
