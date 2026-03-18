/**
 * One-time schema initialization script for PostgreSQL (Neon).
 * Run via: npm run db:init
 */
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

// Load .env.local for local development
config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    console.error("Add it to .env.local or export it in your shell.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  console.log("Connecting to Neon PostgreSQL...");
  console.log("Running schema initialization...");

  const client = await pool.connect();
  try {
    // Run the entire schema as one transaction using pool client
    // This properly handles $$ function bodies and FK ordering
    await client.query(schema);
    console.log("Schema initialization complete!");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Schema initialization failed:", msg);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Schema initialization failed:", err);
  process.exit(1);
});
