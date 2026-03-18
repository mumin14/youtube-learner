import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const file = await db.get(
    "SELECT id, original_name, source_type, video_id FROM files WHERE share_token = ?",
    token
  ) as
    | {
        id: number;
        original_name: string;
        source_type: string;
        video_id: string | null;
      }
    | undefined;

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db.all(
    `SELECT ai.id, ai.difficulty, ai.title, ai.description, ai.source_context,
            ai.topic, ai.timestamp_seconds, ai.completed,
            c.start_seconds as chunk_start_seconds, c.end_seconds as chunk_end_seconds
     FROM action_items ai
     LEFT JOIN chunks c ON c.id = ai.chunk_id
     WHERE ai.file_id = ?
     ORDER BY
       CASE ai.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END,
       ai.topic, ai.id`,
    file.id
  );

  return NextResponse.json({
    source: {
      name: file.original_name,
      source_type: file.source_type,
      video_id: file.video_id,
    },
    items,
  });
}
