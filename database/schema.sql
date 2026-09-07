PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT '',
  floor TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  room_id TEXT,
  api_key_hash TEXT,
  firmware_version TEXT NOT NULL DEFAULT '',
  last_seen_at TEXT,
  status TEXT NOT NULL DEFAULT 'not_configured',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  sensor_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('electricity', 'pir')),
  model TEXT NOT NULL DEFAULT '',
  gpio_pin TEXT NOT NULL DEFAULT '',
  interface TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  room_id TEXT,
  device_id TEXT,
  configuration TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'not_connected',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  voltage REAL NOT NULL,
  current REAL NOT NULL,
  power REAL NOT NULL,
  energy REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS occupancy_events (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  motion_detected INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wastage_states (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wastage_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  current REAL NOT NULL,
  power REAL NOT NULL,
  started_at TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  current REAL,
  power REAL,
  started_at TEXT,
  detected_at TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  current_threshold REAL NOT NULL DEFAULT 0.1,
  alert_duration_minutes INTEGER NOT NULL DEFAULT 20,
  sensor_freshness_seconds INTEGER NOT NULL DEFAULT 90,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_room_timestamp ON readings(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_occupancy_room_timestamp ON occupancy_events(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wastage_room_status ON wastage_events(room_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_room_ack ON notifications(room_id, acknowledged, detected_at DESC);
