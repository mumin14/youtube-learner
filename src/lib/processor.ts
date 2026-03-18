import { getDb } from "./db";
import { callClaude } from "./claude";
import { EXTRACTION_PROMPT } from "./prompts";
import { getLearnerContext, getFolderSpecContext } from "./learner-profile";

const BATCH_SIZE = 5;
const CONCURRENCY = 2;
const DELAY_BETWEEN_MS = 1500;

interface ExtractedItem {
  chunk_id: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  source_context: string;
  topic: string;
  timestamp_seconds: number | null;
}

export async function processAllChunks(jobId: number, userId: number, folderId?: number): Promise<void> {
  const db = getDb();

  // Load combined learner profile (manual + LLM-imported)
  const learnerProfile = await getLearnerContext(userId);

  // Load folder specification / marking criteria if processing a specific folder
  const folderSpec = folderId ? await getFolderSpecContext(folderId) : "";

  const folderJoinFilter = folderId ? ` AND f.folder_id = ?` : "";
  const folderDirectFilter = folderId ? ` AND folder_id = ?` : "";
  const queryParams: (number)[] = folderId ? [userId, folderId] : [userId];

  // Only process chunks belonging to this user's files (scoped to folder if provided)
  const unprocessedChunks = await db.all(
    `SELECT c.id, c.content, c.file_id, c.chunk_index, c.start_seconds, c.end_seconds
     FROM chunks c
     JOIN files f ON f.id = c.file_id AND f.user_id = ?${folderJoinFilter}
     WHERE c.processed = 0
     ORDER BY c.file_id, c.chunk_index`,
    ...queryParams
  ) as Array<{
    id: number;
    content: string;
    file_id: number;
    chunk_index: number;
    start_seconds: number | null;
    end_seconds: number | null;
  }>;

  const totalChunks = unprocessedChunks.length;

  if (totalChunks === 0) {
    await db.run(
      `UPDATE processing_jobs SET status = 'completed', total_chunks = 0, updated_at = NOW() WHERE id = ?`,
      jobId
    );
    return;
  }

  await db.run(
    `UPDATE processing_jobs SET status = 'running', total_chunks = ?, updated_at = NOW() WHERE id = ?`,
    totalChunks, jobId
  );

  // Update file statuses to processing (scoped to folder if provided)
  await db.run(`UPDATE files SET status = 'processing' WHERE status = 'chunked' AND user_id = ?${folderDirectFilter}`, ...queryParams);

  const batches: (typeof unprocessedChunks)[] = [];
  for (let i = 0; i < unprocessedChunks.length; i += BATCH_SIZE) {
    batches.push(unprocessedChunks.slice(i, i + BATCH_SIZE));
  }

  let processedCount = 0;
  let failedBatches = 0;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const concurrentBatches = batches.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      concurrentBatches.map((batch) => extractFromBatch(batch, learnerProfile, folderSpec))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const batch = concurrentBatches[j];

      if (result.status === "fulfilled" && result.value.length > 0) {
        await db.transaction(async () => {
          for (const item of result.value) {
            await db.run(
              `INSERT INTO action_items (chunk_id, file_id, difficulty, title, description, source_context, topic, timestamp_seconds)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
            await db.run(`UPDATE chunks SET processed = 1 WHERE id = ?`, chunk.id);
          }
        });
      } else if (result.status === "fulfilled" && result.value.length === 0) {
        // Empty extraction result (JSON parsed but no items) — mark as processed
        for (const chunk of batch) {
          await db.run(`UPDATE chunks SET processed = 1 WHERE id = ?`, chunk.id);
        }
      } else if (result.status === "rejected") {
        // API/network error — do NOT mark as processed so they can be retried
        console.error("Batch processing failed:", result.reason);
        failedBatches++;
      }

      processedCount += batch.length;
      await db.run(
        `UPDATE processing_jobs SET processed_chunks = ?, updated_at = NOW() WHERE id = ?`,
        processedCount, jobId
      );
    }

    if (i + CONCURRENCY < batches.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
    }
  }

  if (failedBatches > 0 && processedCount === failedBatches * BATCH_SIZE) {
    // All batches failed — mark as error
    await db.run(
      `UPDATE processing_jobs SET status = 'error', error_message = ?, updated_at = NOW() WHERE id = ?`,
      `All ${failedBatches} batch(es) failed — check API key or rate limits`, jobId
    );
  } else if (failedBatches > 0) {
    // Some batches succeeded, some failed — still completed but with warning
    await db.run(
      `UPDATE processing_jobs SET status = 'completed', error_message = ?, updated_at = NOW() WHERE id = ?`,
      `${failedBatches} batch(es) failed — re-run to retry`, jobId
    );
  } else {
    await db.run(
      `UPDATE processing_jobs SET status = 'completed', updated_at = NOW() WHERE id = ?`,
      jobId
    );
  }

  await db.run(
    `UPDATE files SET status = 'completed' WHERE status = 'processing' AND user_id = ?${folderDirectFilter}`,
    ...queryParams
  );
}

async function extractFromBatch(
  chunks: Array<{ id: number; content: string; file_id: number; start_seconds: number | null; end_seconds: number | null }>,
  learnerProfile: string,
  folderSpec?: string
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

  const response = await callClaude(EXTRACTION_PROMPT(combinedContent, learnerProfile, folderSpec));

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
