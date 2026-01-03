// Database initialization and connection management
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { SCHEMA } from "./schema";

let db: Database | null = null;

function getDefaultDbPath(): string {
  const override = process.env.LITMUS_DB_PATH;
  if (override && override.trim().length > 0) {
    return override;
  }

  const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", "litmus-ai", "Litmus.db");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");
    return join(appData, "litmus-ai", "Litmus.db");
  }
  const xdg = process.env.XDG_DATA_HOME ?? join(home, ".local", "share");
  return join(xdg, "litmus-ai", "Litmus.db");
}

export function getDatabase(): Database {
  if (!db) {
    const dbPath = getDefaultDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new Database(dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA);
    // Migration: Add is_judge column if it doesn't exist
    db.exec(`ALTER TABLE saved_models ADD COLUMN is_judge INTEGER NOT NULL DEFAULT 0`);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Re-export queries for convenience
export * from "./queries/runs";
export * from "./queries/responses";
export * from "./queries/evaluations";
export * from "./queries/saved-models";
