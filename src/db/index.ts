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
