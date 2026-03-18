-- Socraty AI — PostgreSQL Schema
-- Run once via: npm run db:init

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  google_id TEXT,
  name TEXT,
  avatar_url TEXT,
  notes_share_token TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_token TEXT,
  spec_text TEXT,
  spec_filename TEXT,
  study_level TEXT,
  study_level_details TEXT
);

-- Files
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT DEFAULT 'file',
  youtube_url TEXT,
  video_id TEXT,
  share_token TEXT,
  user_id INTEGER REFERENCES users(id),
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL
);

-- Chunks (with full-text search vector)
CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  processed SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_seconds DOUBLE PRECISION,
  end_seconds DOUBLE PRECISION,
  search_vector TSVECTOR
);

-- Action Items
CREATE TABLE IF NOT EXISTS action_items (
  id SERIAL PRIMARY KEY,
  chunk_id INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_context TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_seconds DOUBLE PRECISION,
  completed SMALLINT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  scheduled_date TEXT,
  scheduled_time TEXT
);

-- Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  total_chunks INTEGER NOT NULL DEFAULT 0,
  processed_chunks INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations & Messages
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learning Notes & Assessments
CREATE TABLE IF NOT EXISTS learning_notes (
  id SERIAL PRIMARY KEY,
  action_item_id INTEGER NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_token TEXT
);

CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES learning_notes(id) ON DELETE CASCADE,
  action_item_id INTEGER NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  grade TEXT NOT NULL,
  strengths TEXT NOT NULL DEFAULT '[]',
  improvements TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learner Profiles
CREATE TABLE IF NOT EXISTS learner_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  llm_profile_text TEXT NOT NULL DEFAULT '',
  llm_updated_at TIMESTAMPTZ
);

-- Calendar Settings
CREATE TABLE IF NOT EXISTS calendar_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  items_per_day INTEGER DEFAULT 6,
  availability TEXT NOT NULL DEFAULT '{"monday":{"enabled":true,"start":"09:00","end":"17:00"},"tuesday":{"enabled":true,"start":"09:00","end":"17:00"},"wednesday":{"enabled":true,"start":"09:00","end":"17:00"},"thursday":{"enabled":true,"start":"09:00","end":"17:00"},"friday":{"enabled":true,"start":"09:00","end":"17:00"},"saturday":{"enabled":false,"start":"10:00","end":"14:00"},"sunday":{"enabled":false,"start":"10:00","end":"14:00"}}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('youtube', 'article', 'paper')),
  topic TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id SERIAL PRIMARY KEY,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_notes_share_token ON users(notes_share_token) WHERE notes_share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_processed ON chunks(processed);
CREATE INDEX IF NOT EXISTS idx_chunks_search ON chunks USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_action_items_difficulty ON action_items(difficulty);
CREATE INDEX IF NOT EXISTS idx_action_items_file_id ON action_items(file_id);
CREATE INDEX IF NOT EXISTS idx_action_items_file_difficulty ON action_items(file_id, difficulty, topic);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON action_items(completed, completed_at);
CREATE INDEX IF NOT EXISTS idx_action_items_scheduled_date ON action_items(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_share_token ON folders(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_learning_notes_action_item ON learning_notes(action_item_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_user ON learning_notes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_share_token ON learning_notes(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_note ON assessments(note_id);
CREATE INDEX IF NOT EXISTS idx_assessments_action_item ON assessments(action_item_id);

CREATE INDEX IF NOT EXISTS idx_learner_profiles_user ON learner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_user ON calendar_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_date ON recommendations(user_id, created_at);

-- ============================================================
-- FULL-TEXT SEARCH (replaces SQLite FTS5)
-- ============================================================

-- Trigger to auto-populate search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION chunks_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (safe for re-runs)
DROP TRIGGER IF EXISTS chunks_search_trigger ON chunks;
CREATE TRIGGER chunks_search_trigger
  BEFORE INSERT OR UPDATE OF content ON chunks
  FOR EACH ROW
  EXECUTE FUNCTION chunks_search_update();
