// CRUD operations for saved_models table
import { Database } from "bun:sqlite";
import type { SavedModel } from "../../types";

export interface SaveModelInput {
  model_id: string;
  model_name: string;
  context_length?: number | null;
  input_modalities?: string[];
  output_modalities?: string[];
  pricing?: Record<string, string> | null;
}

type SavedModelRow = {
  model_id: string;
  model_name: string;
  context_length: number | null;
  input_modalities: string | null;
  output_modalities: string | null;
  pricing: string | null;
  is_judge: number;
  added_at: number;
};

const parseJsonArray = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const parseJsonRecord = (value: string | null): Record<string, string> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, val]) => [key, String(val)])
    );
  } catch {
    return null;
  }
};

const toSavedModel = (row: SavedModelRow): SavedModel => ({
  model_id: row.model_id,
  model_name: row.model_name,
  context_length: row.context_length,
  input_modalities: parseJsonArray(row.input_modalities),
  output_modalities: parseJsonArray(row.output_modalities),
  pricing: parseJsonRecord(row.pricing),
  is_judge: row.is_judge,
  added_at: row.added_at,
});

export function listSavedModels(db: Database): SavedModel[] {
  const stmt = db.prepare(`
    SELECT * FROM saved_models
    ORDER BY added_at DESC
  `);
  const rows = stmt.all() as SavedModelRow[];
  return rows.map(toSavedModel);
}

export function upsertSavedModel(db: Database, input: SaveModelInput): void {
  const stmt = db.prepare(`
    INSERT INTO saved_models (
      model_id,
      model_name,
      context_length,
      input_modalities,
      output_modalities,
      pricing
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(model_id) DO UPDATE SET
      model_name = excluded.model_name,
      context_length = excluded.context_length,
      input_modalities = excluded.input_modalities,
      output_modalities = excluded.output_modalities,
      pricing = excluded.pricing
  `);

  stmt.run(
    input.model_id,
    input.model_name,
    input.context_length ?? null,
    input.input_modalities ? JSON.stringify(input.input_modalities) : null,
    input.output_modalities ? JSON.stringify(input.output_modalities) : null,
    input.pricing ? JSON.stringify(input.pricing) : null
  );
}

export function removeSavedModel(db: Database, modelId: string): boolean {
  const stmt = db.prepare("DELETE FROM saved_models WHERE model_id = ?");
  const result = stmt.run(modelId);
  return result.changes > 0;
}

export function setJudgeModel(db: Database, modelId: string, isJudge: boolean): void {
  const stmt = db.prepare("UPDATE saved_models SET is_judge = ? WHERE model_id = ?");
  stmt.run(isJudge ? 1 : 0, modelId);
}

export function listJudgeModels(db: Database): SavedModel[] {
  const stmt = db.prepare(`
    SELECT * FROM saved_models
    WHERE is_judge = 1
    ORDER BY added_at DESC
  `);
  const rows = stmt.all() as SavedModelRow[];
  return rows.map(toSavedModel);
}

export function getJudgeModel(db: Database, modelId: string): SavedModel | null {
  const stmt = db.prepare("SELECT * FROM saved_models WHERE model_id = ? AND is_judge = 1");
  const row = stmt.get(modelId) as SavedModelRow | undefined;
  return row ? toSavedModel(row) : null;
}
