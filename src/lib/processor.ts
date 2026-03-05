import { getDb } from "./db";
import { callClaude } from "./claude";
import { EXTRACTION_PROMPT } from "./prompts";

const BATCH_SIZE = 10;
const CONCURRENCY = 3;
const DELAY_BETWEEN_MS = 200;

interface ExtractedItem {
  chunk_id: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  source_context: string;
  topic: string;
  timestamp_seconds: number | null;
}

export async function processAllChunks(jobId: number, userId: number): Promise<void> {
  const db = getDb();

  // Only process chunks belonging to this user's files
  const unprocessedChunks = db
    .prepare(
      `SELECT c.id, c.content, c.file_id, c.chunk_index, c.start_seconds, c.end_seconds
       FROM chunks c
       JOIN files f ON f.id = c.file_id AND f.user_id = ?
       WHERE c.processed = 0
       ORDER BY c.file_id, c.chunk_index`
    )
    .all(userId) as Array<{
    id: number;
    content: string;
    file_id: number;
    chunk_index: number;
    start_seconds: number | null;
    end_seconds: number | null;
  }>;

  const totalChunks = unprocessedChunks.length;

  if (totalChunks === 0) {
    db.prepare(
      `UPDATE processing_jobs SET status = 'completed', total_chunks = 0, updated_at = datetime('now') WHERE id = ?`
    ).run(jobId);
    return;
  }

  db.prepare(
    `UPDATE processing_jobs SET status = 'running', total_chunks = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(totalChunks, jobId);

  // Update this user's file statuses to processing
  db.prepare(`UPDATE files SET status = 'processing' WHERE status = 'chunked' AND user_id = ?`).run(userId);

  const batches: (typeof unprocessedChunks)[] = [];
  for (let i = 0; i < unprocessedChunks.length; i += BATCH_SIZE) {
    batches.push(unprocessedChunks.slice(i, i + BATCH_SIZE));
  }

  let processedCount = 0;
  let failedBatches = 0;

  const insertItem = db.prepare(
    `INSERT INTO action_items (chunk_id, file_id, difficulty, title, description, source_context, topic, timestamp_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const markProcessed = db.prepare(
    `UPDATE chunks SET processed = 1 WHERE id = ?`
  );

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const concurrentBatches = batches.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      concurrentBatches.map((batch) => extractFromBatch(batch))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const batch = concurrentBatches[j];

      if (result.status === "fulfilled" && result.value.length > 0) {
        const tx = db.transaction(() => {
          for (const item of result.value) {
            insertItem.run(
              item.chunkId,
              item.fileId,
              item.difficulty,
              item.title,
              item.description,
              item.source_context,
              item.topic,
              item.timestamp_seconds
            );
          }
          for (const chunk of batch) {
            markProcessed.run(chunk.id);
          }
        });
        tx();
      } else if (result.status === "fulfilled" && result.value.length === 0) {
        // Empty extraction result (JSON parsed but no items) — mark as processed
        for (const chunk of batch) {
          markProcessed.run(chunk.id);
        }
      } else if (result.status === "rejected") {
        // API/network error — do NOT mark as processed so they can be retried
        console.error("Batch processing failed:", result.reason);
        failedBatches++;
      }

      processedCount += batch.length;
      db.prepare(
        `UPDATE processing_jobs SET processed_chunks = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(processedCount, jobId);
    }

    if (i + CONCURRENCY < batches.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
    }
  }

  if (failedBatches > 0) {
    db.prepare(
      `UPDATE processing_jobs SET status = 'completed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(`${failedBatches} batch(es) failed — re-run to retry`, jobId);
  } else {
    db.prepare(
      `UPDATE processing_jobs SET status = 'completed', updated_at = datetime('now') WHERE id = ?`
    ).run(jobId);
  }

  db.prepare(
    `UPDATE files SET status = 'completed' WHERE status = 'processing' AND user_id = ?`
  ).run(userId);
}

async function extractFromBatch(
  chunks: Array<{ id: number; content: string; file_id: number; start_seconds: number | null; end_seconds: number | null }>
): Promise<
  Array<{
    chunkId: number;
    fileId: number;
    difficulty: string;
    title: string;
    description: string;
    source_context: string;
    topic: string;
    timestamp_seconds: number | null;
  }>
> {
  const combinedContent = chunks
    .map((c) => {
      const timeAttrs = c.start_seconds != null
        ? ` start_seconds="${Math.round(c.start_seconds)}" end_seconds="${Math.round(c.end_seconds ?? c.start_seconds)}"`
        : "";
      return `<chunk id="${c.id}"${timeAttrs}>\n${c.content}\n</chunk>`;
    })
    .join("\n\n");

  const response = await callClaude(EXTRACTION_PROMPT(combinedContent));

  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      items: ExtractedItem[];
    };

    return parsed.items.map((item) => {
      const matchedChunk = chunks.find((c) => c.id === item.chunk_id);
      return {
        chunkId: matchedChunk ? item.chunk_id : chunks[0].id,
        fileId: matchedChunk?.file_id ?? chunks[0].file_id,
        difficulty: item.difficulty,
        title: item.title,
        description: item.description,
        source_context: item.source_context || "",
        topic: item.topic || "General",
        timestamp_seconds: typeof item.timestamp_seconds === "number" ? item.timestamp_seconds : null,
      };
    });
  } catch {
    console.error("Failed to parse extraction response:", response.slice(0, 200));
    return [];
  }
}
