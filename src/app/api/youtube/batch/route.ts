import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chunkText, chunkTranscriptSegments } from "@/lib/chunker";
import { fetchTranscript } from "@/lib/youtube";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { videoIds } = (await req.json()) as { videoIds: string[] };

  if (!videoIds?.length) {
    return new Response("No video IDs provided", { status: 400 });
  }

  const userId = user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const db = getDb();
      const insertFile = db.prepare(
        `INSERT INTO files (filename, original_name, size_bytes, status, source_type, youtube_url, video_id, user_id)
         VALUES (?, ?, ?, 'chunked', 'youtube', ?, ?, ?)`
      );
      const insertChunk = db.prepare(
        `INSERT INTO chunks (file_id, chunk_index, content, token_estimate, start_seconds, end_seconds) VALUES (?, ?, ?, ?, ?, ?)`
      );
      const updateFileChunks = db.prepare(
        `UPDATE files SET chunk_count = ? WHERE id = ?`
      );

      let completed = 0;
      let succeeded = 0;
      let failed = 0;

      for (const videoId of videoIds) {
        try {
          send({
            status: "processing",
            videoId,
            completed,
            total: videoIds.length,
            progress: Math.round((completed / videoIds.length) * 100),
          });

          const { text, title, segments } = await fetchTranscript(videoId);

          if (!text.trim()) {
            failed++;
            completed++;
            send({
              status: "video_error",
              videoId,
              title,
              error: "Empty transcript",
              completed,
              total: videoIds.length,
            });
            continue;
          }

          const safeName = `yt-${videoId}`;
          const ytUrl = `https://youtube.com/watch?v=${videoId}`;
          const info = insertFile.run(
            safeName,
            title,
            Buffer.byteLength(text),
            ytUrl,
            videoId,
            userId
          );
          const fileId = info.lastInsertRowid as number;

          const chunks = segments.length > 0
            ? chunkTranscriptSegments(segments, title)
            : chunkText(text, title);

          const tx = db.transaction(() => {
            for (let i = 0; i < chunks.length; i++) {
              insertChunk.run(
                fileId,
                i,
                chunks[i].content,
                chunks[i].tokenEstimate,
                chunks[i].startSeconds ?? null,
                chunks[i].endSeconds ?? null
              );
            }
            updateFileChunks.run(chunks.length, fileId);
          });
          tx();

          succeeded++;
          completed++;
          send({
            status: "video_done",
            videoId,
            title,
            chunks: chunks.length,
            completed,
            total: videoIds.length,
            progress: Math.round((completed / videoIds.length) * 100),
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Transcript not available";
          console.error(`[batch] Video ${videoId} FAILED:`, err instanceof Error ? err.stack : err);
          failed++;
          completed++;
          send({
            status: "video_error",
            videoId,
            error: errMsg,
            completed,
            total: videoIds.length,
          });
        }

        // Small delay to avoid rate limiting
        if (completed < videoIds.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      send({
        status: "done",
        succeeded,
        failed,
        total: videoIds.length,
        progress: 100,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
