// CRUD operations for model_responses table
import { Database } from "bun:sqlite";
import type { ModelResponse, ToolCall, ModelConfig } from "../../types";

export interface CreateResponseInput {
  run_id: number;
  model_id: string;
  model_name: string;
  output_text?: string;
  reasoning_text?: string;
  tool_calls?: ToolCall[];
  status: "completed" | "error" | "timeout";
  error_message?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  token_count_input?: number;
  token_count_output?: number;
  config?: ModelConfig;
}

export function createResponse(
  db: Database,
  input: CreateResponseInput
): number {
  const stmt = db.prepare(`
    INSERT INTO model_responses (
      run_id, model_id, model_name, output_text, reasoning_text,
      tool_calls, status, error_message, start_time, end_time,
      duration_ms, token_count_input, token_count_output, config
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.run_id,
    input.model_id,
    input.model_name,
    input.output_text ?? null,
    input.reasoning_text ?? null,
    input.tool_calls ? JSON.stringify(input.tool_calls) : null,
    input.status,
    input.error_message ?? null,
    input.start_time,
    input.end_time ?? null,
    input.duration_ms ?? null,
    input.token_count_input ?? null,
    input.token_count_output ?? null,
    input.config ? JSON.stringify(input.config) : null
  );

  return Number(result.lastInsertRowid);
}

export function getResponse(db: Database, id: number): ModelResponse | null {
  const stmt = db.prepare("SELECT * FROM model_responses WHERE id = ?");
  return stmt.get(id) as ModelResponse | null;
}

export function getResponsesForRun(
  db: Database,
  runId: number
): ModelResponse[] {
  const stmt = db.prepare(`
    SELECT * FROM model_responses
    WHERE run_id = ?
    ORDER BY start_time ASC
  `);
  return stmt.all(runId) as ModelResponse[];
}

export function getResponsesByModel(
  db: Database,
  modelId: string,
  limit: number = 100
): ModelResponse[] {
  const stmt = db.prepare(`
    SELECT * FROM model_responses
    WHERE model_id = ?
    ORDER BY start_time DESC
    LIMIT ?
  `);
  return stmt.all(modelId, limit) as ModelResponse[];
}

export function getModelStats(
  db: Database,
  modelId: string
): {
  total_runs: number;
  avg_duration_ms: number | null;
  error_rate: number;
  avg_score: number | null;
} {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_runs,
      AVG(duration_ms) as avg_duration_ms,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate,
      AVG(es.score) as avg_score
    FROM model_responses mr
    LEFT JOIN evaluation_scores es ON es.model_response_id = mr.id
    WHERE mr.model_id = ?
  `);

  return stmt.get(modelId) as {
    total_runs: number;
    avg_duration_ms: number | null;
    error_rate: number;
    avg_score: number | null;
  };
}

export function deleteResponse(db: Database, id: number): boolean {
  const stmt = db.prepare("DELETE FROM model_responses WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
