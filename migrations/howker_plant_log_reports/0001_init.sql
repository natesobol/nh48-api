-- howker_plant_log_reports schema
CREATE TABLE IF NOT EXISTS plant_reports (
  id TEXT PRIMARY KEY,
  plant_slug TEXT NOT NULL,     -- matches catalog slug/id
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy_m INTEGER,
  elevation_m INTEGER,
  observed_at TEXT,             -- ISO string (optional)
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  created_by TEXT,              -- optional (anon hash / user / etc.)
  source TEXT                   -- optional (web, import, etc.)
);

CREATE INDEX IF NOT EXISTS idx_plant_reports_lat_lng
  ON plant_reports (lat, lng);
CREATE INDEX IF NOT EXISTS idx_plant_reports_plant_slug
  ON plant_reports (plant_slug);
CREATE INDEX IF NOT EXISTS idx_plant_reports_status
  ON plant_reports (status);
