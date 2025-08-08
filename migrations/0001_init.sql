-- users handled by Lucia (sessions in D1), plus minimal profile table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Lucia base tables (simplified; singular names)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT
);

-- Lucia v3 sqlite adapter expects 'key' table
CREATE TABLE IF NOT EXISTS key (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hashed_password TEXT,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

-- ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  idea_hash TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'queued',
  score INTEGER,
  analysis_summary TEXT,
  analysis_raw TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(idea_hash, owner_id)
);

-- cached analyses (global reuse by idea_hash)
CREATE TABLE IF NOT EXISTS idea_cache (
  idea_hash TEXT PRIMARY KEY,
  analysis_raw TEXT NOT NULL,
  analysis_summary TEXT NOT NULL,
  score INTEGER NOT NULL,
  cached_at TEXT DEFAULT (datetime('now'))
);

-- rate limiting (rolling 24h window)
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_owner ON ideas(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_owner_time ON submissions(owner_id, created_at DESC);


