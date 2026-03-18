import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/api-utils";
import { actionItemPatchSchema, validateBody } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const difficulty = req.nextUrl.searchParams.get("difficulty");
  const topic = req.nextUrl.searchParams.get("topic");
  const review = req.nextUrl.searchParams.get("review");
  const completedOnly = req.nextUrl.searchParams.get("completed");

  const db = getDb();

  const fileId = req.nextUrl.searchParams.get("fileId");
  const folderId = req.nextUrl.searchParams.get("folderId");

  let query = `
    SELECT ai.*, f.original_name as filename, f.source_type, f.video_id, f.youtube_url,
      c.start_seconds as chunk_start_seconds, c.end_seconds as chunk_end_seconds
    FROM action_items ai
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN chunks c ON c.id = ai.chunk_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [user.id];

  if (folderId) {
    query += ` AND f.folder_id = ?`;
    params.push(folderId);
  }

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
      (ai.completed = 1 AND ai.completed_at < NOW() - INTERVAL '3 days')
      OR
      (ai.completed = 0 AND ai.created_at < NOW() - INTERVAL '7 days')
    )`;
  }

  // Count query shares same WHERE clause
  let countQuery = `
    SELECT COUNT(*) as cnt
    FROM action_items ai
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN chunks c ON c.id = ai.chunk_id
    WHERE 1=1
  `;
  // Rebuild the same WHERE conditions for count
  const countParams: (string | number)[] = [user.id];
  if (folderId) { countQuery += ` AND f.folder_id = ?`; countParams.push(folderId); }
  if (difficulty) { const ds = difficulty.split(","); countQuery += ` AND ai.difficulty IN (${ds.map(() => "?").join(",")})`; countParams.push(...ds); }
  if (topic) { countQuery += ` AND ai.topic = ?`; countParams.push(topic); }
  if (fileId) { countQuery += ` AND ai.file_id = ?`; countParams.push(fileId); }
  if (completedOnly === "true") { countQuery += ` AND ai.completed = 1`; }
  if (review === "true") { countQuery += ` AND ((ai.completed = 1 AND ai.completed_at < NOW() - INTERVAL '3 days') OR (ai.completed = 0 AND ai.created_at < NOW() - INTERVAL '7 days'))`; }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams, { limit: 100, maxLimit: 500 });

  query += ` ORDER BY
    f.id,
    CASE ai.difficulty
      WHEN 'easy' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'hard' THEN 3
    END,
    ai.topic, ai.id
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  // Prepare all metadata queries upfront for batch execution
  const folderScope = folderId ? ` AND f.folder_id = ?` : "";
  const metaParams = folderId ? [user.id, Number(folderId)] : [user.id];

  const topicsQuery =
    `SELECT DISTINCT ai.topic FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?${folderScope}
     WHERE ai.topic IS NOT NULL ORDER BY ai.topic`;
  const countsQuery =
    `SELECT ai.difficulty, COUNT(*) as count,
       SUM(CASE WHEN ai.completed = 1 THEN 1 ELSE 0 END) as completed_count
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?${folderScope}
     GROUP BY ai.difficulty`;
  const sourcesQuery =
    `SELECT f.id, f.original_name, f.source_type, f.video_id,
       COUNT(ai.id) as item_count
     FROM files f
     JOIN action_items ai ON ai.file_id = f.id
     WHERE f.user_id = ?${folderScope}
     GROUP BY f.id
     ORDER BY f.original_name`;
  const reviewQuery =
    `SELECT COUNT(*) as count FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?${folderScope}
     WHERE (ai.completed = 1 AND ai.completed_at < NOW() - INTERVAL '3 days')
        OR (ai.completed = 0 AND ai.created_at < NOW() - INTERVAL '7 days')`;

  const items = await db.all(query, ...params);
  const total = ((await db.get(countQuery, ...countParams)) as { cnt: number }).cnt;
  const topics = await db.all(topicsQuery, ...metaParams) as { topic: string }[];
  const allCounts = await db.all(countsQuery, ...metaParams) as { difficulty: string; count: number; completed_count: number }[];
  const sources = await db.all(sourcesQuery, ...metaParams) as { id: number; original_name: string; source_type: string; video_id: string | null; item_count: number }[];
  const reviewCount = ((await db.get(reviewQuery, ...metaParams)) as { count: number }).count;

  return NextResponse.json({
    items,
    total,
    limit,
    offset,
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
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(actionItemPatchSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { id, completed } = parsed.data;

  const db = getDb();
  const completedInt = completed ? 1 : 0;
  const completedAt = completed ? new Date().toISOString() : null;

  // Only update if the action item belongs to this user's files
  const result = await db.run(
    `UPDATE action_items SET completed = ?, completed_at = ?
     WHERE id = ? AND file_id IN (SELECT id FROM files WHERE user_id = ?)`,
    completedInt, completedAt, id, user.id
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ id, completed: completedInt, completed_at: completedAt });
}
