import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chunkText, chunkTranscriptSegments } from "@/lib/chunker";
import { fetchTranscript } from "@/lib/youtube";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
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

      // Skip videos already in the database
      const newVideoIds: string[] = [];
      for (const id of videoIds) {
        const existing = await db.get(
          `SELECT video_id FROM files WHERE video_id = ? AND user_id = ?`,
          id, userId
        );
        if (!existing) {
          newVideoIds.push(id);
        }
      }
      const skippedCount = videoIds.length - newVideoIds.length;

      let completed = skippedCount;
      let succeeded = skippedCount;
      let failed = 0;
      const total = videoIds.length;

      if (skippedCount > 0) {
        send({
          status: "processing",
          completed,
          total,
          progress: Math.round((completed / total) * 100),
          message: `${skippedCount} video(s) already ingested, skipping`,
        });
      }

      // Process sequentially with delay to avoid YouTube rate limits
      const DELAY_BETWEEN_MS = 1500;

      for (let i = 0; i < newVideoIds.length; i++) {
        const videoId = newVideoIds[i];

        send({
          status: "processing",
          videoId,
          completed,
          total,
          progress: Math.round((completed / total) * 100),
        });

        try {
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
              total,
            });
          } else {
            const safeName = `yt-${videoId}`;
            const ytUrl = `https://youtube.com/watch?v=${videoId}`;
            const info = await db.run(
              `INSERT INTO files (filename, original_name, size_bytes, status, source_type, youtube_url, video_id, user_id)
               VALUES (?, ?, ?, 'chunked', 'youtube', ?, ?, ?)`,
              safeName, title, Buffer.byteLength(text), ytUrl, videoId, userId
            );
            const fileId = info.lastInsertRowid as number;

            const chunks = segments.length > 0
              ? chunkTranscriptSegments(segments, title)
              : chunkText(text, title);

            await db.transaction(async () => {
              for (let j = 0; j < chunks.length; j++) {
                await db.run(
                  `INSERT INTO chunks (file_id, chunk_index, content, token_estimate, start_seconds, end_seconds) VALUES (?, ?, ?, ?, ?, ?)`,
                  fileId, j, chunks[j].content, chunks[j].tokenEstimate,
                  chunks[j].startSeconds ?? null, chunks[j].endSeconds ?? null
                );
              }
              await db.run(
                `UPDATE files SET chunk_count = ? WHERE id = ?`,
                chunks.length, fileId
              );
            });

            succeeded++;
            completed++;
            send({
              status: "video_done",
              videoId,
              title,
              chunks: chunks.length,
              completed,
              total,
              progress: Math.round((completed / total) * 100),
            });
          }
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
            total,
          });
        }

        // Delay between videos to avoid triggering YouTube rate limits
        if (i < newVideoIds.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
        }
      }

      send({
        status: "done",
        succeeded,
        failed,
        total,
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
