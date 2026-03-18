import { neon, Pool } from "@neondatabase/serverless";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return url;
}

// HTTP-based query function (fast for simple queries)
const _sql = neon(getConnectionString());
// Use .query() for conventional parameterized calls (string + params array)
const sql = _sql.query as (
  query: string,
  params?: unknown[]
) => Promise<Record<string, unknown>[]>;

// Connection pool for transactions (WebSocket-based)
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: getConnectionString() });
  }
  return _pool;
}

/**
 * Convert SQLite-style `?` placeholders to Postgres `$1, $2, ...` numbering.
 * Handles `?` inside string literals by skipping quoted sections.
 */
function convertParams(text: string): string {
  let idx = 0;
  let result = "";
  let inSingleQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle escaped single quotes inside strings
    if (char === "'" && text[i + 1] === "'") {
      result += "''";
      i++;
      continue;
    }

    if (char === "'") {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === "?" && !inSingleQuote) {
      result += `$${++idx}`;
      continue;
    }

    result += char;
  }

  return result;
}

export interface DbResult {
  lastInsertRowid: number;
  changes: number;
}

export interface DbClient {
  get<T = Record<string, unknown>>(
    text: string,
    ...params: unknown[]
  ): Promise<T | undefined>;

  all<T = Record<string, unknown>>(
    text: string,
    ...params: unknown[]
  ): Promise<T[]>;

  run(text: string, ...params: unknown[]): Promise<DbResult>;

  transaction<T>(fn: () => Promise<T>): Promise<T>;

  exec(text: string): Promise<void>;
}

/**
 * Returns a database client compatible with the app's query patterns.
 * Provides async get/all/run/transaction/exec methods.
 * Auto-converts `?` placeholders to `$1, $2, ...` for Postgres.
 * Auto-injects `RETURNING id` on INSERTs for lastInsertRowid compatibility.
 */
export function getDb(): DbClient {
  return {
    async get<T = Record<string, unknown>>(
      text: string,
      ...params: unknown[]
    ): Promise<T | undefined> {
      const pgText = convertParams(text);
      const rows = (await sql(pgText, params)) as T[];
      return rows[0];
    },

    async all<T = Record<string, unknown>>(
      text: string,
      ...params: unknown[]
    ): Promise<T[]> {
      const pgText = convertParams(text);
      return (await sql(pgText, params)) as T[];
    },

    async run(text: string, ...params: unknown[]): Promise<DbResult> {
      const pgText = convertParams(text);

      // INSERT without RETURNING — auto-add RETURNING id
      if (/^\s*INSERT/i.test(pgText) && !/RETURNING/i.test(pgText)) {
        const withReturning = pgText.trimEnd().replace(/;?\s*$/, " RETURNING id");
        const rows = (await sql(withReturning, params)) as { id: number }[];
        return { lastInsertRowid: rows[0]?.id ?? 0, changes: rows.length };
      }

      // UPDATE/DELETE without RETURNING — auto-add to count affected rows
      if (
        /^\s*(UPDATE|DELETE)/i.test(pgText) &&
        !/RETURNING/i.test(pgText)
      ) {
        const withReturning = pgText.trimEnd().replace(/;?\s*$/, " RETURNING 1 AS _c");
        const rows = await sql(withReturning, params);
        return { lastInsertRowid: 0, changes: rows.length };
      }

      const rows = (await sql(pgText, params)) as { id?: number }[];
      return { lastInsertRowid: rows[0]?.id ?? 0, changes: rows.length };
    },

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn();
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async exec(text: string): Promise<void> {
      await sql(text, []);
    },
  };
}
