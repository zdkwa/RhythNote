ALTER TABLE tasks ADD COLUMN review_intervals TEXT NULL;
ALTER TABLE tasks ADD COLUMN review_anchor TEXT NULL;

CREATE TABLE IF NOT EXISTS occurrence_time_overrides (
  task_id TEXT NOT NULL,
  occurrence_date TEXT NOT NULL CHECK (
    length(occurrence_date) = 10 AND date(occurrence_date) = occurrence_date
  ),
  time_semantic TEXT NOT NULL CHECK (time_semantic IN ('planned', 'deadline')),
  start_time TEXT NULL,
  end_time TEXT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (task_id, occurrence_date),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (
    (time_semantic = 'deadline' AND start_time IS NULL) OR
    (time_semantic = 'planned' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time) OR
    (time_semantic = 'planned' AND start_time IS NULL AND end_time IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_time_overrides_date
  ON occurrence_time_overrides (occurrence_date);
