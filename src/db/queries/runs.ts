// CRUD operations for runs table
import { Database } from "bun:sqlite";
import type { Run } from "../../types";

export interface CreateRunInput {
  prompt_text: string;
  tools_enabled?: string[];
  prompt_template_id?: number;
}

export interface RunWithResponses extends Run {
  model_count: number;
  avg_score: number | null;
  has_evaluation: boolean;
}

export function createRun(db: Database, input: CreateRunInput): number {
  const stmt = db.prepare(`
    INSERT INTO runs (prompt_text, tools_enabled, prompt_template_id)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(
    input.prompt_text,
    input.tools_enabled ? JSON.stringify(input.tools_enabled) : null,
    input.prompt_template_id ?? null
  );

  return Number(result.lastInsertRowid);
}

export function getRun(db: Database, id: number): Run | null {
  const stmt = db.prepare("SELECT * FROM runs WHERE id = ?");
  return stmt.get(id) as Run | null;
}

export function getRecentRuns(
  db: Database,
  limit: number = 50,
  offset: number = 0
): RunWithResponses[] {
  const stmt = db.prepare(`
    SELECT
      r.*,
      COUNT(DISTINCT mr.id) as model_count,
      AVG(es.score) as avg_score,
      CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as has_evaluation
    FROM runs r
    LEFT JOIN model_responses mr ON mr.run_id = r.id
    LEFT JOIN evaluations e ON e.run_id = r.id
    LEFT JOIN evaluation_scores es ON es.evaluation_id = e.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(limit, offset) as RunWithResponses[];
}

export function searchRuns(
  db: Database,
  query: string,
  limit: number = 50
): RunWithResponses[] {
  const stmt = db.prepare(`
    SELECT
      r.*,
      COUNT(DISTINCT mr.id) as model_count,
      AVG(es.score) as avg_score,
      CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as has_evaluation
    FROM runs r
    LEFT JOIN model_responses mr ON mr.run_id = r.id
    LEFT JOIN evaluations e ON e.run_id = r.id
    LEFT JOIN evaluation_scores es ON es.evaluation_id = e.id
    WHERE r.prompt_text LIKE ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ?
  `);

  return stmt.all(`%${query}%`, limit) as RunWithResponses[];
}

export function deleteRun(db: Database, id: number): boolean {
  const stmt = db.prepare("DELETE FROM runs WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getRunCount(db: Database): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM runs");
  const result = stmt.get() as { count: number };
  return result.count;
}
