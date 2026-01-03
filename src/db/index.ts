// Database initialization and connection management
import { Database } from "bun:sqlite";
import { SCHEMA } from "./schema";

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    db = new Database("data/Litmus.db", { create: true });
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
