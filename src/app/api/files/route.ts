import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { requireAuth } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const db = getDb();
  const insertFile = db.prepare(
    `INSERT INTO files (filename, original_name, size_bytes, status, user_id) VALUES (?, ?, ?, 'uploaded', ?)`
  );
  const insertChunk = db.prepare(
    `INSERT INTO chunks (file_id, chunk_index, content, token_estimate) VALUES (?, ?, ?, ?)`
  );
  const updateFileChunks = db.prepare(
    `UPDATE files SET chunk_count = ?, status = 'chunked' WHERE id = ?`
  );

  // Read all files first (async)
  const fileContents: { file: File; text: string }[] = [];
  for (const file of files) {
    const text = await file.text();
    fileContents.push({ file, text });
  }

  const results: { id: number; name: string; chunks: number }[] = [];

  const transaction = db.transaction(() => {
    for (const { file, text } of fileContents) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const info = insertFile.run(safeName, file.name, file.size, user.id);
      const fileId = info.lastInsertRowid as number;

      const chunks = chunkText(text, file.name);
      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(fileId, i, chunks[i].content, chunks[i].tokenEstimate);
      }
      updateFileChunks.run(chunks.length, fileId);
      results.push({ id: fileId, name: file.name, chunks: chunks.length });
    }
  });

  transaction();

  return NextResponse.json({ files: results });
}

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const files = db
    .prepare(
      `SELECT f.*,
        (SELECT COUNT(*) FROM action_items ai WHERE ai.file_id = f.id) as action_item_count
       FROM files f WHERE f.user_id = ? ORDER BY f.created_at DESC`
    )
    .all(user.id);

  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  // Cascading deletes handle chunks, action_items, and FTS entries — scoped to user
  const result = db.prepare("DELETE FROM files WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM processing_jobs").run();

  return NextResponse.json({ deleted: result.changes });
}
