// SQLite schema definitions for Litmus

export const SCHEMA = `
-- Prompt templates for reusable test cases
CREATE TABLE IF NOT EXISTS prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Test suites grouping multiple prompts
CREATE TABLE IF NOT EXISTS test_suites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Many-to-many: test_suites <-> prompt_templates
CREATE TABLE IF NOT EXISTS suite_prompts (
  suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  prompt_id INTEGER NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (suite_id, prompt_id)
);

-- Benchmark runs (a single execution session)
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_text TEXT NOT NULL,
  prompt_template_id INTEGER REFERENCES prompt_templates(id),
  tools_enabled TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Individual model responses within a run
CREATE TABLE IF NOT EXISTS model_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  output_text TEXT,
  reasoning_text TEXT,
  tool_calls TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_ms INTEGER,
  token_count_input INTEGER,
  token_count_output INTEGER,
  config TEXT
);

-- LLM-as-judge evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  judge_model TEXT NOT NULL,
  evaluation_prompt TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Individual scores for each model response
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  model_response_id INTEGER NOT NULL REFERENCES model_responses(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  reasoning TEXT,
  criteria_scores TEXT,
  raw_response TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_responses_run_id ON model_responses(run_id);
CREATE INDEX IF NOT EXISTS idx_model_responses_model_id ON model_responses(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_run_id ON evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id ON evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
`;
