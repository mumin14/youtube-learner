import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { processAllChunks } from "@/lib/processor";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const { force } = await req.json().catch(() => ({ force: false }));

  // Check if there's already a running job — use BEGIN IMMEDIATE to prevent race condition
  const createJob = db.transaction(() => {
    const running = db
      .prepare(`SELECT id, updated_at FROM processing_jobs WHERE status = 'running'`)
      .get() as { id: number; updated_at: string } | undefined;

    if (running) {
      // If the job hasn't been updated in 2 minutes, it's stale — clear it
      const lastUpdate = new Date(running.updated_at + "Z").getTime();
      const staleThreshold = 2 * 60 * 1000;
      if (Date.now() - lastUpdate > staleThreshold) {
        db.prepare(
          `UPDATE processing_jobs SET status = 'error', error_message = 'Stale job cleared', updated_at = datetime('now') WHERE id = ?`
        ).run(running.id);
        db.prepare(`UPDATE files SET status = 'chunked' WHERE status = 'processing' AND user_id = ?`).run(user.id);
      } else {
        return null; // Signal that a job is running
      }
    }

    // If force=true, reset user's chunks and clear old action items so we can reprocess
    if (force) {
      db.prepare(
        `UPDATE chunks SET processed = 0 WHERE file_id IN (SELECT id FROM files WHERE user_id = ?)`
      ).run(user.id);
      db.prepare(
        `DELETE FROM action_items WHERE file_id IN (SELECT id FROM files WHERE user_id = ?)`
      ).run(user.id);
      db.prepare(
        `UPDATE files SET status = 'chunked' WHERE status IN ('completed', 'processing', 'error') AND user_id = ?`
      ).run(user.id);
    }

    // Check for unprocessed chunks belonging to this user
    const unprocessed = db
      .prepare(
        `SELECT COUNT(*) as count FROM chunks c
         JOIN files f ON f.id = c.file_id AND f.user_id = ?
         WHERE c.processed = 0`
      )
      .get(user.id) as { count: number };

    if (unprocessed.count === 0) {
      return { error: "No unprocessed content found. Upload files first." };
    }

    const info = db
      .prepare(`INSERT INTO processing_jobs (status) VALUES ('pending')`)
      .run();
    return { jobId: info.lastInsertRowid as number };
  });

  const result = createJob();

  if (result === null) {
    return NextResponse.json(
      { error: "A processing job is already running" },
      { status: 409 }
    );
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Fire and forget — processing runs in the background, scoped to user's files
  processAllChunks(result.jobId, user.id).catch((err) => {
    console.error("Processing failed:", err);
    db.prepare(
      `UPDATE processing_jobs SET status = 'error', error_message = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(String(err), result.jobId);
  });

  return NextResponse.json({ jobId: result.jobId });
}
