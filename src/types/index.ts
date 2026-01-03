// Shared type definitions for Litmus

export interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ToolCall {
  name: string;
  args: unknown;
  result?: unknown;
}

export interface UsageData {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
}

// Database entity types
export interface Run {
  id: number;
  prompt_text: string;
  tools_enabled: string | null; // JSON array
  created_at: number;
}

export interface ModelResponse {
  id: number;
  run_id: number;
  model_id: string;
  model_name: string;
  output_text: string | null;
  reasoning_text: string | null;
  tool_calls: string | null; // JSON array
  status: "completed" | "error" | "timeout";
  error_message: string | null;
  start_time: number;
  end_time: number | null;
  duration_ms: number | null;
  token_count_input: number | null;
  token_count_output: number | null;
  config: string | null; // JSON
}

export interface Evaluation {
  id: number;
  run_id: number;
  judge_model: string;
  evaluation_prompt: string;
  created_at: number;
}

export interface EvaluationScore {
  id: number;
  evaluation_id: number;
  model_response_id: number;
  score: number;
  reasoning: string | null;
  criteria_scores: string | null; // JSON
  raw_response: string | null;
}

export interface PromptTemplate {
  id: number;
  name: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  created_at: number;
  updated_at: number;
}

export interface SavedModel {
  model_id: string;
  model_name: string;
  context_length: number | null;
  input_modalities: string[];
  output_modalities: string[];
  pricing: Record<string, string> | null;
  is_judge: number;
  added_at: number;
}

// UI state types
export type ViewName =
  | "benchmark"
  | "history"
  | "evaluations"
  | "templates"
  | "settings";

export interface BenchmarkModel {
  id: string;
  model: string;
  modelName: string;
  output: Array<{ type: string; text: string }>;
  toolCalls?: ToolCall[];
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  startTime?: number;
  endTime?: number;
  usage?: UsageData;
  finishReason?: string;
}

// Available model definition
export interface AvailableModel {
  name: string;
  value: string;
  description: string;
}
