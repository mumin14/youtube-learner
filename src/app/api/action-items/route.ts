import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const difficulty = req.nextUrl.searchParams.get("difficulty");
  const topic = req.nextUrl.searchParams.get("topic");
  const review = req.nextUrl.searchParams.get("review");
  const completedOnly = req.nextUrl.searchParams.get("completed");

  const db = getDb();

  const fileId = req.nextUrl.searchParams.get("fileId");

  let query = `
    SELECT ai.*, f.original_name as filename, f.source_type, f.video_id, f.youtube_url,
      c.start_seconds as chunk_start_seconds, c.end_seconds as chunk_end_seconds
    FROM action_items ai
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN chunks c ON c.id = ai.chunk_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [user.id];

  if (difficulty) {
    const difficulties = difficulty.split(",");
    const placeholders = difficulties.map(() => "?").join(",");
    query += ` AND ai.difficulty IN (${placeholders})`;
    params.push(...difficulties);
  }

  if (topic) {
    query += ` AND ai.topic = ?`;
    params.push(topic);
  }

  if (fileId) {
    query += ` AND ai.file_id = ?`;
    params.push(fileId);
  }

  if (completedOnly === "true") {
    query += ` AND ai.completed = 1`;
  }

  if (review === "true") {
    query += ` AND (
      (ai.completed = 1 AND ai.completed_at < datetime('now', '-3 days'))
      OR
      (ai.completed = 0 AND ai.created_at < datetime('now', '-7 days'))
    )`;
  }

  query += ` ORDER BY
    f.id,
    CASE ai.difficulty
      WHEN 'easy' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'hard' THEN 3
    END,
    ai.topic, ai.id`;

  // Prepare all metadata queries upfront for batch execution
  const topicsStmt = db.prepare(
    `SELECT DISTINCT ai.topic FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE ai.topic IS NOT NULL ORDER BY ai.topic`
  );
  const countsStmt = db.prepare(
    `SELECT ai.difficulty, COUNT(*) as count,
       SUM(CASE WHEN ai.completed = 1 THEN 1 ELSE 0 END) as completed_count
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     GROUP BY ai.difficulty`
  );
  const sourcesStmt = db.prepare(
    `SELECT f.id, f.original_name, f.source_type, f.video_id,
       COUNT(ai.id) as item_count
     FROM files f
     JOIN action_items ai ON ai.file_id = f.id
     WHERE f.user_id = ?
     GROUP BY f.id
     ORDER BY f.original_name`
  );
  const reviewStmt = db.prepare(
    `SELECT COUNT(*) as count FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE (ai.completed = 1 AND ai.completed_at < datetime('now', '-3 days'))
        OR (ai.completed = 0 AND ai.created_at < datetime('now', '-7 days'))`
  );
  const itemsStmt = db.prepare(query);

  // Run all queries in a single transaction for consistency and speed
  const fetchAll = db.transaction(() => {
    const items = itemsStmt.all(...params);
    const topics = topicsStmt.all(user.id) as { topic: string }[];
    const allCounts = countsStmt.all(user.id) as { difficulty: string; count: number; completed_count: number }[];
    const sources = sourcesStmt.all(user.id) as { id: number; original_name: string; source_type: string; video_id: string | null; item_count: number }[];
    const reviewCount = (reviewStmt.get(user.id) as { count: number }).count;
    return { items, topics, allCounts, sources, reviewCount };
  });

  const { items, topics, allCounts, sources, reviewCount } = fetchAll();

  return NextResponse.json({
    items,
    topics: topics.map((t) => t.topic),
    sources,
    counts: {
      easy: allCounts.find((c) => c.difficulty === "easy")?.count ?? 0,
      medium: allCounts.find((c) => c.difficulty === "medium")?.count ?? 0,
      hard: allCounts.find((c) => c.difficulty === "hard")?.count ?? 0,
    },
    completedCounts: {
      easy: allCounts.find((c) => c.difficulty === "easy")?.completed_count ?? 0,
      medium: allCounts.find((c) => c.difficulty === "medium")?.completed_count ?? 0,
      hard: allCounts.find((c) => c.difficulty === "hard")?.completed_count ?? 0,
    },
    reviewCount,
  });
}

export async function PATCH(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, completed } = await req.json();

  if (typeof id !== "number" || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  const completedInt = completed ? 1 : 0;
  const completedAt = completed ? new Date().toISOString() : null;

  // Only update if the action item belongs to this user's files
  const result = db.prepare(
    `UPDATE action_items SET completed = ?, completed_at = ?
     WHERE id = ? AND file_id IN (SELECT id FROM files WHERE user_id = ?)`
  ).run(completedInt, completedAt, id, user.id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ id, completed: completedInt, completed_at: completedAt });
}
