CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (
    length(trim(content)) BETWEEN 1 AND 1000
  ),
  is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan
  ON plan_items (plan_id, sort_order, created_at);
