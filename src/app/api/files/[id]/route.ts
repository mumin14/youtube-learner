import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();

  const file = db
    .prepare("SELECT id, original_name, source_type, youtube_url, size_bytes, chunk_count FROM files WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id) as {
      id: number;
      original_name: string;
      source_type: string;
      youtube_url: string | null;
      size_bytes: number;
      chunk_count: number;
    } | undefined;

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const chunks = db
    .prepare("SELECT content FROM chunks WHERE file_id = ? ORDER BY chunk_index")
    .all(Number(id)) as { content: string }[];

  const fullText = chunks.map((c) => c.content).join("\n\n");

  return NextResponse.json({
    id: file.id,
    title: file.original_name,
    sourceType: file.source_type,
    url: file.youtube_url,
    sizeBytes: file.size_bytes,
    chunkCount: file.chunk_count,
    content: fullText,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(_req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  const result = db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(Number(id), user.id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
