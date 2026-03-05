import { getDb } from "./db";

interface RetrievedChunk {
  id: number;
  content: string;
  fileId: number;
  filename: string;
  startSeconds: number | null;
  endSeconds: number | null;
  videoId: string | null;
}

export function retrieveRelevantChunks(
  query: string,
  userId: number,
  limit: number = 15,
  maxTokens: number = 12000,
  fileId?: number
): RetrievedChunk[] {
  const db = getDb();
  const ftsQuery = sanitizeFtsQuery(query);

  if (!ftsQuery) {
    return [];
  }

  try {
    const fileFilter = fileId ? ` AND f.id = ?` : "";
    const params: (string | number)[] = [userId];
    if (fileId) params.push(fileId);
    params.push(ftsQuery, limit * 2);

    const results = db
      .prepare(
        `SELECT
          c.id,
          c.content,
          c.file_id as fileId,
          f.original_name as filename,
          c.start_seconds as startSeconds,
          c.end_seconds as endSeconds,
          f.video_id as videoId,
          rank
        FROM chunks_fts
        JOIN chunks c ON c.id = chunks_fts.rowid
        JOIN files f ON f.id = c.file_id AND f.user_id = ?${fileFilter}
        WHERE chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?`
      )
      .all(...params) as (RetrievedChunk & { rank: number })[];

    // Trim to token budget
    let tokenCount = 0;
    const selected: RetrievedChunk[] = [];

    for (const chunk of results) {
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (tokenCount + chunkTokens > maxTokens) break;
      tokenCount += chunkTokens;
      selected.push({
        id: chunk.id,
        content: chunk.content,
        fileId: chunk.fileId,
        filename: chunk.filename,
        startSeconds: chunk.startSeconds,
        endSeconds: chunk.endSeconds,
        videoId: chunk.videoId,
      });
    }

    return selected;
  } catch {
    // FTS query error — fall back to empty
    return [];
  }
}

function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/['"(){}[\]*:^~!@#$%&\\/<>]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) return "";

  return words.join(" OR ");
}
