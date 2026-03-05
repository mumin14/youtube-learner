import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
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

      interval = setInterval(() => {
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
      }, 500);

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
