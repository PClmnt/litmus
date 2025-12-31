// CRUD operations for evaluations and evaluation_scores tables
import { Database } from "bun:sqlite";
import type { Evaluation, EvaluationScore } from "../../types";

export interface CreateEvaluationInput {
  run_id: number;
  judge_model: string;
  evaluation_prompt: string;
}

export interface CreateScoreInput {
  evaluation_id: number;
  model_response_id: number;
  score: number;
  reasoning?: string;
  criteria_scores?: Record<string, number>;
  raw_response?: string;
}

export interface EvaluationWithScores extends Evaluation {
  scores: Array<
    EvaluationScore & {
      model_id: string;
      model_name: string;
    }
  >;
}

export function createEvaluation(
  db: Database,
  input: CreateEvaluationInput
): number {
  const stmt = db.prepare(`
    INSERT INTO evaluations (run_id, judge_model, evaluation_prompt)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(input.run_id, input.judge_model, input.evaluation_prompt);
  return Number(result.lastInsertRowid);
}

export function createEvaluationScore(
  db: Database,
  input: CreateScoreInput
): number {
  const stmt = db.prepare(`
    INSERT INTO evaluation_scores (
      evaluation_id, model_response_id, score, reasoning, criteria_scores, raw_response
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.evaluation_id,
    input.model_response_id,
    input.score,
    input.reasoning ?? null,
    input.criteria_scores ? JSON.stringify(input.criteria_scores) : null,
    input.raw_response ?? null
  );

  return Number(result.lastInsertRowid);
}

export function getEvaluation(db: Database, id: number): Evaluation | null {
  const stmt = db.prepare("SELECT * FROM evaluations WHERE id = ?");
  return stmt.get(id) as Evaluation | null;
}

export function getEvaluationsForRun(
  db: Database,
  runId: number
): Evaluation[] {
  const stmt = db.prepare(`
    SELECT * FROM evaluations
    WHERE run_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(runId) as Evaluation[];
}

export function getEvaluationWithScores(
  db: Database,
  evaluationId: number
): EvaluationWithScores | null {
  const evaluation = getEvaluation(db, evaluationId);
  if (!evaluation) return null;

  const stmt = db.prepare(`
    SELECT
      es.*,
      mr.model_id,
      mr.model_name
    FROM evaluation_scores es
    JOIN model_responses mr ON mr.id = es.model_response_id
    WHERE es.evaluation_id = ?
    ORDER BY es.score DESC
  `);

  const scores = stmt.all(evaluationId) as Array<
    EvaluationScore & { model_id: string; model_name: string }
  >;

  return { ...evaluation, scores };
}

export function getLatestEvaluationForRun(
  db: Database,
  runId: number
): EvaluationWithScores | null {
  const stmt = db.prepare(`
    SELECT * FROM evaluations
    WHERE run_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const evaluation = stmt.get(runId) as Evaluation | null;
  if (!evaluation) return null;

  return getEvaluationWithScores(db, evaluation.id);
}

export function getScoresForResponse(
  db: Database,
  responseId: number
): EvaluationScore[] {
  const stmt = db.prepare(`
    SELECT * FROM evaluation_scores
    WHERE model_response_id = ?
    ORDER BY score DESC
  `);
  return stmt.all(responseId) as EvaluationScore[];
}

export function deleteEvaluation(db: Database, id: number): boolean {
  const stmt = db.prepare("DELETE FROM evaluations WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getAverageScoreByModel(
  db: Database
): Array<{ model_id: string; model_name: string; avg_score: number; eval_count: number }> {
  const stmt = db.prepare(`
    SELECT
      mr.model_id,
      mr.model_name,
      AVG(es.score) as avg_score,
      COUNT(es.id) as eval_count
    FROM evaluation_scores es
    JOIN model_responses mr ON mr.id = es.model_response_id
    GROUP BY mr.model_id
    ORDER BY avg_score DESC
  `);

  return stmt.all() as Array<{
    model_id: string;
    model_name: string;
    avg_score: number;
    eval_count: number;
  }>;
}
