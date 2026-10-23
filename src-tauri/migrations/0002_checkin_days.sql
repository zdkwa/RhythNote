CREATE TABLE IF NOT EXISTS checkin_days (
  date TEXT PRIMARY KEY NOT NULL CHECK (
    length(date) = 10 AND date(date) = date
  ),
  created_at TEXT NOT NULL
);
