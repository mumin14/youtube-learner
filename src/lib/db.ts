import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "youtube-learner.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initializeSchema(_db);
  }
  return _db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      chunk_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'uploaded',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_estimate INTEGER NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_id INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      source_context TEXT,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS processing_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'pending',
      total_chunks INTEGER NOT NULL DEFAULT 0,
      processed_chunks INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_action_items_difficulty ON action_items(difficulty);
    CREATE INDEX IF NOT EXISTS idx_action_items_file_id ON action_items(file_id);
    CREATE INDEX IF NOT EXISTS idx_action_items_file_difficulty ON action_items(file_id, difficulty, topic);
    CREATE INDEX IF NOT EXISTS idx_action_items_completed ON action_items(completed, completed_at);
    CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_processed ON chunks(processed);
  `);

  // Add YouTube columns to existing files table (safe to run multiple times)
  const cols = db.prepare("PRAGMA table_info(files)").all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("source_type")) {
    db.exec(`ALTER TABLE files ADD COLUMN source_type TEXT DEFAULT 'file'`);
  }
  if (!colNames.includes("youtube_url")) {
    db.exec(`ALTER TABLE files ADD COLUMN youtube_url TEXT`);
  }
  if (!colNames.includes("video_id")) {
    db.exec(`ALTER TABLE files ADD COLUMN video_id TEXT`);
  }
  if (!colNames.includes("share_token")) {
    db.exec(`ALTER TABLE files ADD COLUMN share_token TEXT`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token) WHERE share_token IS NOT NULL`);
  }
  if (!colNames.includes("user_id")) {
    db.exec(`ALTER TABLE files ADD COLUMN user_id INTEGER REFERENCES users(id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`);
    // Backfill: assign all existing files to the first user
    db.exec(`UPDATE files SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL`);
  }

  // Users & sessions for Stripe auth
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT NOT NULL UNIQUE,
      subscription_status TEXT NOT NULL DEFAULT 'inactive',
      subscription_id TEXT,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  // Add Google SSO columns to users table (safe to run multiple times)
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const userColNames = userCols.map((c) => c.name);
  if (!userColNames.includes("google_id")) {
    db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`);
  }
  if (!userColNames.includes("name")) {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
  }
  if (!userColNames.includes("avatar_url")) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }

  // Add timestamp columns to chunks table (safe to run multiple times)
  const chunkCols = db.prepare("PRAGMA table_info(chunks)").all() as { name: string }[];
  const chunkColNames = chunkCols.map((c) => c.name);
  if (!chunkColNames.includes("start_seconds")) {
    db.exec(`ALTER TABLE chunks ADD COLUMN start_seconds REAL`);
  }
  if (!chunkColNames.includes("end_seconds")) {
    db.exec(`ALTER TABLE chunks ADD COLUMN end_seconds REAL`);
  }

  // Add timestamp column to action_items table
  const aiCols = db.prepare("PRAGMA table_info(action_items)").all() as { name: string }[];
  const aiColNames = aiCols.map((c) => c.name);
  if (!aiColNames.includes("timestamp_seconds")) {
    db.exec(`ALTER TABLE action_items ADD COLUMN timestamp_seconds REAL`);
  }
  if (!aiColNames.includes("completed")) {
    db.exec(`ALTER TABLE action_items ADD COLUMN completed INTEGER NOT NULL DEFAULT 0`);
  }
  if (!aiColNames.includes("completed_at")) {
    db.exec(`ALTER TABLE action_items ADD COLUMN completed_at TEXT`);
  }

  // Conversations & messages for Ask AI chat history
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  `);

  // Learning notes & AI assessments
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_item_id INTEGER NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL REFERENCES learning_notes(id) ON DELETE CASCADE,
      action_item_id INTEGER NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      grade TEXT NOT NULL,
      strengths TEXT NOT NULL DEFAULT '[]',
      improvements TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_learning_notes_action_item ON learning_notes(action_item_id);
    CREATE INDEX IF NOT EXISTS idx_learning_notes_user ON learning_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_note ON assessments(note_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_action_item ON assessments(action_item_id);
  `);

  // Learner profiles — stores user's learning preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS learner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      profile_text TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_learner_profiles_user ON learner_profiles(user_id);
  `);

  // Add llm_profile_text column to learner_profiles (safe to run multiple times)
  const lpCols = db.prepare("PRAGMA table_info(learner_profiles)").all() as { name: string }[];
  const lpColNames = lpCols.map((c) => c.name);
  if (!lpColNames.includes("llm_profile_text")) {
    db.exec(`ALTER TABLE learner_profiles ADD COLUMN llm_profile_text TEXT NOT NULL DEFAULT ''`);
  }
  if (!lpColNames.includes("llm_updated_at")) {
    db.exec(`ALTER TABLE learner_profiles ADD COLUMN llm_updated_at TEXT`);
  }

  // Create FTS5 table separately (can't use IF NOT EXISTS with virtual tables in all versions)
  try {
    db.exec(`
      CREATE VIRTUAL TABLE chunks_fts USING fts5(
        content,
        content='chunks',
        content_rowid='id',
        tokenize='porter unicode61'
      );
    `);
  } catch {
    // Table already exists
  }

  // FTS sync triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
      INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
    END;
  `);
}
