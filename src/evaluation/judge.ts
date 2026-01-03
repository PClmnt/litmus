// LLM-as-judge implementation
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  buildJudgePrompt,
  buildPairwisePrompt,
  DEFAULT_CRITERIA,
  TOOL_USE_CRITERIA,
  type EvaluationCriteria,
  type FormattedResponse,
} from "./prompts";
import {
  parseJudgeResponse,
  parsePairwiseResponse,
  type EvaluationResult,
  type PairwiseResult,
} from "./scoring";

export interface JudgeOptions {
  judgeModel: string;
  criteria?: EvaluationCriteria[];
  includeToolUseCriteria?: boolean;
}

export interface ModelOutput {
  modelId: string;
  modelName: string;
  output: string;
  toolCalls?: Array<{ name: string; args: unknown; result: unknown }>;
}

// Default judge models in order of preference
export const JUDGE_MODELS = [
  { name: "Mimo v2 Flash", value: "xiaomi/mimo-v2-flash:free", description: "Free, fast Xiaomi model" },
  { name: "Deepseek v3.2", value: "deepseek/deepseek-v3.2", description: "High quality Deepseek model" },
];

export async function evaluateResponses(
  originalPrompt: string,
  responses: ModelOutput[],
  options: JudgeOptions
): Promise<EvaluationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const openrouter = createOpenRouter({ apiKey });

  // Determine which criteria to use
  let criteria = options.criteria ?? DEFAULT_CRITERIA;
  if (options.includeToolUseCriteria) {
    criteria = TOOL_USE_CRITERIA;
  }

  // Format responses for the judge
  const formattedResponses: FormattedResponse[] = responses.map((r) => ({
    modelId: r.modelId,
    output: r.output,
    toolCalls: r.toolCalls
      ? r.toolCalls
          .map(
            (tc) =>
              `  - ${tc.name}(${JSON.stringify(tc.args)}) => ${formatResult(
                tc.result
              )}`
          )
          .join("\n")
      : undefined,
  }));

  const judgePrompt = buildJudgePrompt(
    originalPrompt,
    formattedResponses,
    criteria
  );

  try {
    const { text } = await generateText({
      model: openrouter.chat(options.judgeModel),
      prompt: judgePrompt,
      temperature: 0.3, // Lower temperature for more consistent judging
      maxOutputTokens: 2048,
    });

    return parseJudgeResponse(
      text,
      responses.map((r) => r.modelId)
    );
  } catch (error) {
    console.error("Judge evaluation failed:", error);
    throw new Error(
      `Evaluation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function pairwiseCompare(
  originalPrompt: string,
  responseA: ModelOutput,
  responseB: ModelOutput,
  judgeModel: string
): Promise<PairwiseResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const openrouter = createOpenRouter({ apiKey });

  const formattedA: FormattedResponse = {
    modelId: responseA.modelId,
    output: responseA.output,
    toolCalls: responseA.toolCalls
      ? responseA.toolCalls
          .map((tc) => `${tc.name}(${JSON.stringify(tc.args)})`)
          .join(", ")
      : undefined,
  };

  const formattedB: FormattedResponse = {
    modelId: responseB.modelId,
    output: responseB.output,
    toolCalls: responseB.toolCalls
      ? responseB.toolCalls
          .map((tc) => `${tc.name}(${JSON.stringify(tc.args)})`)
          .join(", ")
      : undefined,
  };

  const prompt = buildPairwisePrompt(originalPrompt, formattedA, formattedB);

  try {
    const { text } = await generateText({
      model: openrouter.chat(judgeModel),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    return parsePairwiseResponse(text);
  } catch (error) {
    console.error("Pairwise comparison failed:", error);
    throw new Error(
      `Comparison failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function formatResult(result: unknown): string {
  if (result === undefined) return "undefined";
  if (result === null) return "null";
  if (typeof result === "object") {
    try {
      const str = JSON.stringify(result);
      return str.length > 100 ? str.slice(0, 100) + "..." : str;
    } catch {
      return "[Object]";
    }
  }
  return String(result);
}

// Re-export types
export type { EvaluationResult, PairwiseResult } from "./scoring";
export type { EvaluationCriteria, FormattedResponse } from "./prompts";
