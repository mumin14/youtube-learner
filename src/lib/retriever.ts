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

// PostgreSQL lowercases unquoted column aliases, so we map from lowercase
interface RawChunkRow {
  id: number;
  content: string;
  fileid: number;
  filename: string;
  startseconds: number | null;
  endseconds: number | null;
  videoid: string | null;
}

function mapRow(row: RawChunkRow): RetrievedChunk {
  return {
    id: row.id,
    content: row.content,
    fileId: row.fileid,
    filename: row.filename,
    startSeconds: row.startseconds,
    endSeconds: row.endseconds,
    videoId: row.videoid,
  };
}

export async function retrieveRelevantChunks(
  query: string,
  userId: number,
  limit: number = 15,
  maxTokens: number = 12000,
  fileId?: number,
  folderId?: number
): Promise<RetrievedChunk[]> {
  const db = getDb();
  const ftsQuery = sanitizeFtsQuery(query);

  let scopeFilter = "";
  const scopeParams: (string | number)[] = [];
  if (fileId) {
    scopeFilter = ` AND f.id = ?`;
    scopeParams.push(fileId);
  } else if (folderId) {
    scopeFilter = ` AND f.folder_id = ?`;
    scopeParams.push(folderId);
  }

  const selectCols = `c.id, c.content, c.file_id as fileid, f.original_name as filename,
    c.start_seconds as startseconds, c.end_seconds as endseconds, f.video_id as videoid`;

  let results: RawChunkRow[] = [];

  // Try FTS search first (if query has non-stop-word content)
  if (ftsQuery) {
    try {
      const params: (string | number)[] = [userId, ...scopeParams, ftsQuery, ftsQuery, limit * 2];
      results = await db.all(
        `SELECT ${selectCols}
         FROM chunks c
         JOIN files f ON f.id = c.file_id AND f.user_id = ?${scopeFilter}
         WHERE c.search_vector @@ plainto_tsquery('english', ?)
         ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', ?)) DESC
         LIMIT ?`,
        ...params
      ) as RawChunkRow[];
    } catch {
      // FTS query error — fall through to fallback
    }
  }

  // Fallback: if FTS returned nothing and a source scope is active, fetch chunks by recency
  if (results.length === 0 && (fileId || folderId)) {
    const fallbackParams: (string | number)[] = [userId, ...scopeParams, limit * 2];
    results = await db.all(
      `SELECT ${selectCols}
       FROM chunks c
       JOIN files f ON f.id = c.file_id AND f.user_id = ?${scopeFilter}
       ORDER BY c.file_id, c.chunk_index
       LIMIT ?`,
      ...fallbackParams
    ) as RawChunkRow[];
  }

  // Trim to token budget
  let tokenCount = 0;
  const selected: RetrievedChunk[] = [];

  for (const row of results) {
    const chunkTokens = Math.ceil(row.content.length / 4);
    if (tokenCount + chunkTokens > maxTokens) break;
    tokenCount += chunkTokens;
    selected.push(mapRow(row));
  }

  return selected;
}

function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/['"(){}[\]*:^~!@#$%&\\/<>]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) return "";

  return words.join(" ");
}
