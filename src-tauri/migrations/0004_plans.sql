CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL CHECK (
    length(trim(content)) BETWEEN 1 AND 5000
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_updated
  ON plans (updated_at DESC);
