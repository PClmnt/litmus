// Export utilities for runs and evaluations
import { getDatabase } from "../db";
import { getRun, getRecentRuns } from "../db/queries/runs";
import { getResponsesForRun } from "../db/queries/responses";
import { getLatestEvaluationForRun } from "../db/queries/evaluations";
import type { Run, ModelResponse, Evaluation, EvaluationScore } from "../types";

export interface ExportedRun {
  id: number;
  prompt: string;
  tools_enabled: string[] | null;
  created_at: string;
  responses: Array<{
    model_id: string;
    model_name: string;
    output: string | null;
    reasoning: string | null;
    tool_calls: any[] | null;
    status: string;
    duration_ms: number | null;
    error: string | null;
  }>;
  evaluation?: {
    judge_model: string;
    scores: Array<{
      model_id: string;
      model_name: string;
      score: number;
      reasoning: string | null;
      criteria_scores: Record<string, number> | null;
    }>;
  };
}

export function exportRunToJSON(runId: number): ExportedRun | null {
  const db = getDatabase();
  const run = getRun(db, runId);
  if (!run) return null;

  const responses = getResponsesForRun(db, runId);
  const evaluation = getLatestEvaluationForRun(db, runId);

  return {
    id: run.id,
    prompt: run.prompt_text,
    tools_enabled: run.tools_enabled ? JSON.parse(run.tools_enabled) : null,
    created_at: new Date(run.created_at * 1000).toISOString(),
    responses: responses.map((r) => ({
      model_id: r.model_id,
      model_name: r.model_name,
      output: r.output_text,
      reasoning: r.reasoning_text,
      tool_calls: r.tool_calls ? JSON.parse(r.tool_calls) : null,
      status: r.status,
      duration_ms: r.duration_ms,
      error: r.error_message,
    })),
    evaluation: evaluation
      ? {
          judge_model: evaluation.judge_model,
          scores: evaluation.scores.map((s) => ({
            model_id: s.model_id,
            model_name: s.model_name,
            score: s.score,
            reasoning: s.reasoning,
            criteria_scores: s.criteria_scores
              ? JSON.parse(s.criteria_scores)
              : null,
          })),
        }
      : undefined,
  };
}

export function exportRunsToCSV(runIds: number[]): string {
  const db = getDatabase();
  const rows: string[] = [];

  // Header
  rows.push(
    [
      "run_id",
      "prompt",
      "model_id",
      "model_name",
      "output",
      "status",
      "duration_ms",
      "score",
      "created_at",
    ]
      .map(escapeCSV)
      .join(",")
  );

  for (const runId of runIds) {
    const run = getRun(db, runId);
    if (!run) continue;

    const responses = getResponsesForRun(db, runId);
    const evaluation = getLatestEvaluationForRun(db, runId);

    for (const response of responses) {
      const evalScore = evaluation?.scores.find(
        (s) => s.model_id === response.model_id
      );

      rows.push(
        [
          run.id.toString(),
          run.prompt_text,
          response.model_id,
          response.model_name,
          response.output_text || "",
          response.status,
          response.duration_ms?.toString() || "",
          evalScore?.score?.toString() || "",
          new Date(run.created_at * 1000).toISOString(),
        ]
          .map(escapeCSV)
          .join(",")
      );
    }
  }

  return rows.join("\n");
}

export function exportAllRunsToJSON(): ExportedRun[] {
  const db = getDatabase();
  const runs = getRecentRuns(db, 1000);
  return runs
    .map((r) => exportRunToJSON(r.id))
    .filter((r): r is ExportedRun => r !== null);
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function saveExport(
  filename: string,
  content: string,
  format: "json" | "csv"
): void {
  const fullPath = `data/exports/${filename}.${format}`;
  Bun.write(fullPath, content);
}
