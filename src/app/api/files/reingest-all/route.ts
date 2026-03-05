import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fetchTranscript } from "@/lib/youtube";
import { chunkTranscriptSegments, chunkText } from "@/lib/chunker";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const youtubeFiles = db
    .prepare("SELECT id, video_id, original_name FROM files WHERE source_type = 'youtube' AND video_id IS NOT NULL AND user_id = ?")
    .all(user.id) as { id: number; video_id: string; original_name: string }[];

  let succeeded = 0;
  let failed = 0;

  for (const file of youtubeFiles) {
    try {
      const { text, title, segments } = await fetchTranscript(file.video_id);
      if (!text.trim()) {
        failed++;
        continue;
      }

      const chunks =
        segments.length > 0
          ? chunkTranscriptSegments(segments, title)
          : chunkText(text, title);

      const tx = db.transaction(() => {
        db.prepare("DELETE FROM action_items WHERE file_id = ?").run(file.id);
        db.prepare("DELETE FROM chunks WHERE file_id = ?").run(file.id);

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

        db.prepare(
          "UPDATE files SET chunk_count = ?, status = 'chunked', size_bytes = ?, original_name = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(chunks.length, Buffer.byteLength(text), title, file.id);
      });
      tx();

      succeeded++;
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ succeeded, failed, total: youtubeFiles.length });
}
