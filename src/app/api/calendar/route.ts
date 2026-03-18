import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const items = await db.all(
    `SELECT ai.*, f.original_name as filename, f.source_type, f.video_id, f.youtube_url,
        c.start_seconds as chunk_start_seconds, c.end_seconds as chunk_end_seconds
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     LEFT JOIN chunks c ON c.id = ai.chunk_id
     WHERE ai.scheduled_date BETWEEN ? AND ?
     ORDER BY ai.scheduled_date, ai.scheduled_time,
       CASE ai.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END`,
    user.id, start, end
  );

  return NextResponse.json({ items });
}
