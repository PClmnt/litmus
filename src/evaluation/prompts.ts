// Judge prompt templates for LLM-as-judge evaluation

export interface EvaluationCriteria {
  name: string;
  description: string;
  weight: number;
}

export const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    name: "accuracy",
    description: "Factual correctness and precision of the response",
    weight: 1.0,
  },
  {
    name: "clarity",
    description: "How clear and understandable the response is",
    weight: 0.8,
  },
  {
    name: "completeness",
    description: "Whether the response fully addresses the prompt",
    weight: 0.9,
  },
  {
    name: "relevance",
    description: "How relevant the response is to the prompt",
    weight: 0.9,
  },
];

export const TOOL_USE_CRITERIA: EvaluationCriteria[] = [
  ...DEFAULT_CRITERIA,
  {
    name: "tool_appropriateness",
    description: "Whether tools were used appropriately for the task",
    weight: 1.0,
  },
  {
    name: "tool_efficiency",
    description: "Whether tool use was efficient (not excessive or unnecessary)",
    weight: 0.7,
  },
];

export const CODING_CRITERIA: EvaluationCriteria[] = [
  {
    name: "correctness",
    description: "Whether the code would work correctly",
    weight: 1.0,
  },
  {
    name: "clarity",
    description: "Code readability and organization",
    weight: 0.8,
  },
  {
    name: "efficiency",
    description: "Algorithmic and runtime efficiency",
    weight: 0.7,
  },
  {
    name: "best_practices",
    description: "Adherence to coding best practices and conventions",
    weight: 0.6,
  },
];

export interface FormattedResponse {
  modelId: string;
  output: string;
  toolCalls?: string;
}

export function buildJudgePrompt(
  originalPrompt: string,
  responses: FormattedResponse[],
  criteria: EvaluationCriteria[]
): string {
  const criteriaList = criteria
    .map((c) => `- **${c.name}**: ${c.description} (weight: ${c.weight})`)
    .join("\n");

  const responsesText = responses
    .map(
      (r, i) => `
### Response ${i + 1} (Model: ${r.modelId})
${r.output}
${r.toolCalls ? `\n**Tool calls made:**\n${r.toolCalls}` : ""}
`
    )
    .join("\n---\n");

  return `You are an expert judge evaluating AI model responses. Your task is to objectively score each response based on the given criteria.

## Original Prompt
${originalPrompt}

## Evaluation Criteria
${criteriaList}

## Responses to Evaluate
${responsesText}

## Instructions
For each response, provide:
1. A score from 0-10 for each criterion
2. A brief reasoning for your scores
3. An overall score (weighted average)

**You MUST respond with valid JSON only. No other text.**

Format your response as JSON:
{
  "evaluations": [
    {
      "model_id": "model-identifier",
      "criteria_scores": {
        "accuracy": 8,
        "clarity": 7
      },
      "overall_score": 7.5,
      "reasoning": "Brief explanation of the scores..."
    }
  ],
  "ranking": ["model-1", "model-2", "model-3"],
  "summary": "Overall comparison summary..."
}

Be objective and consistent in your scoring. Consider both strengths and weaknesses.`;
}

export function buildPairwisePrompt(
  originalPrompt: string,
  responseA: FormattedResponse,
  responseB: FormattedResponse
): string {
  return `You are an expert judge comparing two AI model responses. Your task is to determine which response is better.

## Original Prompt
${originalPrompt}

## Response A (Model: ${responseA.modelId})
${responseA.output}
${responseA.toolCalls ? `\nTool calls: ${responseA.toolCalls}` : ""}

## Response B (Model: ${responseB.modelId})
${responseB.output}
${responseB.toolCalls ? `\nTool calls: ${responseB.toolCalls}` : ""}

## Instructions
Compare the two responses and provide:
1. Which response is better (A, B, or TIE)
2. A brief explanation of your choice

**You MUST respond with valid JSON only.**

{
  "winner": "A" | "B" | "TIE",
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of why this response is better..."
}`;
}

export function getCriteriaForPrompt(promptText: string): EvaluationCriteria[] {
  const lowerPrompt = promptText.toLowerCase();

  // Check if this is a coding-related prompt
  if (
    lowerPrompt.includes("code") ||
    lowerPrompt.includes("function") ||
    lowerPrompt.includes("program") ||
    lowerPrompt.includes("implement") ||
    lowerPrompt.includes("algorithm")
  ) {
    return CODING_CRITERIA;
  }

  // Default criteria
  return DEFAULT_CRITERIA;
}
