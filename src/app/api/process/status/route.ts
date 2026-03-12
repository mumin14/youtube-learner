import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

interface AuthUser {
  id: number;
  email: string;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = requireAuth(req) as AuthUser | null;
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const db = getDb();

      const sendEvent = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream already closed
          cleanup();
        }
      };

      const cleanup = () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
      };

      interval = setInterval(() => {  // poll every 1s (was 500ms)
        try {
          const job = db
            .prepare("SELECT * FROM processing_jobs WHERE id = ?")
            .get(Number(jobId)) as {
            status: string;
            total_chunks: number;
            processed_chunks: number;
            error_message: string | null;
          } | undefined;

          if (!job) {
            sendEvent({ error: "Job not found" });
            cleanup();
            controller.close();
            return;
          }

          const itemCount = db
            .prepare(
              `SELECT COUNT(*) as count FROM action_items
               WHERE file_id IN (SELECT id FROM files WHERE user_id = ?)`
            )
            .get(user.id) as { count: number };

          sendEvent({
            status: job.status,
            totalChunks: job.total_chunks,
            processedChunks: job.processed_chunks,
            progress:
              job.total_chunks > 0
                ? Math.round(
                    (job.processed_chunks / job.total_chunks) * 100
                  )
                : 0,
            error: job.error_message,
            itemsFound: itemCount.count,
          });

          if (job.status === "completed" || job.status === "error") {
            cleanup();
            controller.close();
          }
        } catch {
          cleanup();
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }, 1000);

      // Safety timeout — 5 minutes (reduced from 10)
      safetyTimeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 5 * 60 * 1000);
    },
    cancel() {
      // Called when the client disconnects — clean up the interval
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
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
