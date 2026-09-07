import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const schemaPath = new URL("../../database/schema/schema.sql", import.meta.url);
const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/wattwise.db");

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(readFileSync(schemaPath, "utf8"));

export function now() {
  return new Date().toISOString();
}

export function id() {
  return randomUUID();
}

export function seedDefaults() {
  const timestamp = now();
  const room = db.prepare("SELECT id FROM rooms WHERE room_code = ?").get("ROOM-01") as { id: string } | undefined;
  const roomId = room?.id ?? id();

  if (!room) {
    db.prepare(
      `INSERT INTO rooms (id, room_code, name, building, floor, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(roomId, "ROOM-01", "CSE-A", "", "", "Primary WattWise monitoring room", timestamp, timestamp);
  }

  if (!db.prepare("SELECT id FROM settings WHERE id = 1").get()) {
    db.prepare(
      "INSERT INTO settings (id, current_threshold, alert_duration_minutes, sensor_freshness_seconds, updated_at) VALUES (1, 0.1, 20, 90, ?)"
    ).run(timestamp);
  }
}
