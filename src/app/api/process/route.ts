import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { processAllChunks } from "@/lib/processor";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:process`, RATE_LIMITS.heavy);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many processing requests. Please wait." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }
  const db = getDb();
  const { force, folderId } = await req.json().catch(() => ({ force: false, folderId: undefined as number | undefined }));

  // Check if there's already a running job
  const result = await db.transaction(async () => {
    const running = await db.get(
      `SELECT id, updated_at FROM processing_jobs WHERE status = 'running'`
    ) as { id: number; updated_at: string } | undefined;

    if (running) {
      // If the job hasn't been updated in 2 minutes, it's stale — clear it
      const lastUpdate = new Date(running.updated_at + "Z").getTime();
      const staleThreshold = 2 * 60 * 1000;
      if (Date.now() - lastUpdate > staleThreshold) {
        await db.run(
          `UPDATE processing_jobs SET status = 'error', error_message = 'Stale job cleared', updated_at = NOW() WHERE id = ?`,
          running.id
        );
        await db.run(
          `UPDATE files SET status = 'chunked' WHERE status = 'processing' AND user_id = ?`,
          user.id
        );
      } else {
        return null; // Signal that a job is running
      }
    }

    // If folderId is provided, verify ownership
    if (folderId) {
      const folder = await db.get(
        `SELECT id FROM folders WHERE id = ? AND user_id = ?`,
        folderId, user.id
      );
      if (!folder) {
        return { error: "Folder not found" };
      }
    }

    const folderFilter = folderId ? ` AND f.folder_id = ?` : "";
    const folderParams = folderId ? [user.id, folderId] : [user.id];

    // If force=true, reset chunks and clear old action items so we can reprocess
    if (force) {
      await db.run(
        `UPDATE chunks SET processed = 0 WHERE file_id IN (SELECT id FROM files f WHERE f.user_id = ?${folderFilter})`,
        ...folderParams
      );
      await db.run(
        `DELETE FROM action_items WHERE file_id IN (SELECT id FROM files f WHERE f.user_id = ?${folderFilter})`,
        ...folderParams
      );
      await db.run(
        `UPDATE files SET status = 'chunked' WHERE status IN ('completed', 'processing', 'error') AND user_id = ?${folderFilter ? ' AND folder_id = ?' : ''}`,
        ...folderParams
      );
    }

    // Check for unprocessed chunks belonging to this user (scoped to folder if provided)
    const unprocessed = await db.get(
      `SELECT COUNT(*) as count FROM chunks c
       JOIN files f ON f.id = c.file_id AND f.user_id = ?${folderFilter}
       WHERE c.processed = 0`,
      ...folderParams
    ) as { count: number };

    if (unprocessed.count === 0) {
      return { error: "No unprocessed content found. Upload files first." };
    }

    const info = await db.run(
      `INSERT INTO processing_jobs (status) VALUES ('pending')`
    );
    return { jobId: info.lastInsertRowid as number };
  });

  if (result === null) {
    return NextResponse.json(
      { error: "A processing job is already running" },
      { status: 409 }
    );
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Fire and forget — processing runs in the background, scoped to folder or all user files
  processAllChunks(result.jobId, user.id, folderId).catch(async (err) => {
    console.error("Processing failed:", err);
    await db.run(
      `UPDATE processing_jobs SET status = 'error', error_message = ?, updated_at = NOW() WHERE id = ?`,
      String(err), result.jobId
    );
  });

  return NextResponse.json({ jobId: result.jobId });
}
