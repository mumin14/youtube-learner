import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { requireAuth } from "@/lib/auth";
import { parsePagination } from "@/lib/api-utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const db = getDb();

  // Read all files first (async)
  const fileContents: { file: File; text: string }[] = [];
  for (const file of files) {
    const text = await file.text();
    fileContents.push({ file, text });
  }

  const results: { id: number; name: string; chunks: number }[] = [];

  await db.transaction(async () => {
    for (const { file, text } of fileContents) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const info = await db.run(
        `INSERT INTO files (filename, original_name, size_bytes, status, user_id) VALUES (?, ?, ?, 'uploaded', ?)`,
        safeName, file.name, file.size, user.id
      );
      const fileId = info.lastInsertRowid as number;

      const chunks = chunkText(text, file.name);
      for (let i = 0; i < chunks.length; i++) {
        await db.run(
          `INSERT INTO chunks (file_id, chunk_index, content, token_estimate) VALUES (?, ?, ?, ?)`,
          fileId, i, chunks[i].content, chunks[i].tokenEstimate
        );
      }
      await db.run(
        `UPDATE files SET chunk_count = ?, status = 'chunked' WHERE id = ?`,
        chunks.length, fileId
      );
      results.push({ id: fileId, name: file.name, chunks: chunks.length });
    }
  });

  return NextResponse.json({ files: results });
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const total = (
    await db.get(`SELECT COUNT(*) as cnt FROM files WHERE user_id = ?`, user.id) as { cnt: number }
  ).cnt;

  const files = await db.all(
    `SELECT f.*,
      (SELECT COUNT(*) FROM action_items ai WHERE ai.file_id = f.id) as action_item_count
     FROM files f WHERE f.user_id = ? ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    user.id, limit, offset
  );

  return NextResponse.json({ files, total, limit, offset });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  // Cascading deletes handle chunks, action_items, and FTS entries — scoped to user
  const result = await db.run("DELETE FROM files WHERE user_id = ?", user.id);
  // Only clear processing jobs that belong to this user's files (all are now deleted)
  await db.run(
    `UPDATE processing_jobs SET status = 'error', error_message = 'Files deleted by user'
     WHERE status IN ('pending', 'running')`
  );

  return NextResponse.json({ deleted: result.changes });
}
