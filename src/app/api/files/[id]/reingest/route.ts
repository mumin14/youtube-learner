import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fetchTranscript } from "@/lib/youtube";
import { chunkTranscriptSegments, chunkText } from "@/lib/chunker";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // Check if processing is running
  const runningJob = db
    .prepare("SELECT id FROM processing_jobs WHERE status IN ('pending', 'running') LIMIT 1")
    .get();
  if (runningJob) {
    return NextResponse.json(
      { error: "Cannot re-ingest while processing is running" },
      { status: 409 }
    );
  }

  const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(Number(id), user.id) as {
    id: number;
    video_id: string | null;
    source_type: string;
    original_name: string;
  } | undefined;

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.source_type !== "youtube" || !file.video_id) {
    return NextResponse.json({ error: "Only YouTube videos can be re-ingested" }, { status: 400 });
  }

  try {
    const { text, title, segments } = await fetchTranscript(file.video_id);

    if (!text.trim()) {
      return NextResponse.json({ error: "Transcript is empty" }, { status: 400 });
    }

    const chunks =
      segments.length > 0
        ? chunkTranscriptSegments(segments, title)
        : chunkText(text, title);

    const tx = db.transaction(() => {
      // Delete old action items and chunks for this file
      db.prepare("DELETE FROM action_items WHERE file_id = ?").run(file.id);
      db.prepare("DELETE FROM chunks WHERE file_id = ?").run(file.id);

      // Insert new chunks with timestamps
      const insertChunk = db.prepare(
        "INSERT INTO chunks (file_id, chunk_index, content, token_estimate, start_seconds, end_seconds) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(
          file.id,
          i,
          chunks[i].content,
          chunks[i].tokenEstimate,
          chunks[i].startSeconds ?? null,
          chunks[i].endSeconds ?? null
        );
      }

      // Update file record
      db.prepare(
        "UPDATE files SET chunk_count = ?, status = 'chunked', size_bytes = ?, original_name = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(chunks.length, Buffer.byteLength(text), title, file.id);
    });
    tx();

    return NextResponse.json({ success: true, chunks: chunks.length, title });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Re-ingest failed" },
      { status: 500 }
    );
  }
}
