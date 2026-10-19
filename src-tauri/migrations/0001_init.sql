CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color TEXT NOT NULL CHECK (
    color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
  ),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_preset INTEGER NOT NULL DEFAULT 0 CHECK (is_preset IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color TEXT NOT NULL CHECK (
    color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description TEXT NULL CHECK (description IS NULL OR length(description) <= 2000),
  type TEXT NOT NULL CHECK (type IN ('once', 'recurring')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  time_semantic TEXT NOT NULL CHECK (time_semantic IN ('planned', 'deadline')),
  task_date TEXT NOT NULL CHECK (
    length(task_date) = 10 AND date(task_date) = task_date
  ),
  start_time TEXT NULL CHECK (
    start_time IS NULL OR (
      length(start_time) = 5 AND
      substr(start_time, 3, 1) = ':' AND
      cast(substr(start_time, 1, 2) AS INTEGER) BETWEEN 0 AND 23 AND
      cast(substr(start_time, 4, 2) AS INTEGER) BETWEEN 0 AND 59
    )
  ),
  end_time TEXT NULL CHECK (
    end_time IS NULL OR (
      length(end_time) = 5 AND
      substr(end_time, 3, 1) = ':' AND
      cast(substr(end_time, 1, 2) AS INTEGER) BETWEEN 0 AND 23 AND
      cast(substr(end_time, 4, 2) AS INTEGER) BETWEEN 0 AND 59
    )
  ),
  recurrence_rule TEXT NULL CHECK (
    recurrence_rule IS NULL OR (
      length(recurrence_rule) BETWEEN 5 AND 500 AND
      recurrence_rule LIKE 'FREQ=%' AND
      instr(upper(recurrence_rule), 'DTSTART') = 0 AND
      instr(upper(recurrence_rule), 'RDATE') = 0 AND
      instr(upper(recurrence_rule), 'EXDATE') = 0 AND
      instr(upper(recurrence_rule), 'TZID') = 0
    )
  ),
  category_id TEXT NULL,
  completed_at TEXT NULL,
  is_backfilled INTEGER NOT NULL DEFAULT 0 CHECK (is_backfilled IN (0, 1)),
  archived_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CHECK (
    (type = 'once' AND recurrence_rule IS NULL) OR
    (type = 'recurring' AND recurrence_rule IS NOT NULL)
  ),
  CHECK (
    (type = 'once' AND (
      (time_semantic = 'planned' AND (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
      )) OR
      (time_semantic = 'deadline' AND start_time IS NULL)
    )) OR
    (type = 'recurring' AND
      time_semantic = 'planned' AND
      start_time IS NOT NULL AND
      end_time IS NOT NULL AND
      start_time < end_time
    )
  ),
  CHECK (
    (type = 'once') OR
    (completed_at IS NULL AND is_backfilled = 0)
  ),
  CHECK (is_backfilled = 0 OR completed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  record_date TEXT NOT NULL CHECK (
    length(record_date) = 10 AND date(record_date) = record_date
  ),
  status TEXT NOT NULL CHECK (status IN ('done', 'undone')),
  note TEXT NULL CHECK (note IS NULL OR length(note) <= 500),
  is_backfilled INTEGER NOT NULL DEFAULT 0 CHECK (is_backfilled IN (0, 1)),
  completed_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE (task_id, record_date),
  CHECK (
    (status = 'done' AND completed_at IS NOT NULL) OR
    (status = 'undone' AND completed_at IS NULL)
  ),
  CHECK (is_backfilled = 0 OR status = 'done')
);

CREATE TABLE IF NOT EXISTS task_pauses (
  task_id TEXT NOT NULL,
  pause_date TEXT NOT NULL CHECK (
    length(pause_date) = 10 AND date(pause_date) = pause_date
  ),
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, pause_date),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL CHECK (length(value) <= 2000),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_archived_type ON tasks (archived_at, type);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks (task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks (archived_at);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records (record_date);
CREATE INDEX IF NOT EXISTS idx_daily_records_task ON daily_records (task_id);
CREATE INDEX IF NOT EXISTS idx_task_pauses_date ON task_pauses (pause_date);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags (tag_id);

INSERT OR IGNORE INTO categories (id, name, color, sort_order, is_preset, created_at, updated_at) VALUES
  ('cat-work',   '工作', '#3B82F6', 10, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-study',  '学习', '#8B5CF6', 20, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-life',   '生活', '#10B981', 30, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-health', '健康', '#F59E0B', 40, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('theme', 'system', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
