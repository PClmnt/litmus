// Score parsing and normalization for LLM-as-judge evaluations

export interface ModelEvaluation {
  modelId: string;
  criteriaScores: Record<string, number>;
  overallScore: number;
  reasoning: string;
}

export interface EvaluationResult {
  evaluations: ModelEvaluation[];
  ranking: string[];
  summary: string;
  rawResponse: string;
}

export interface PairwiseResult {
  winner: "A" | "B" | "TIE";
  confidence: number;
  reasoning: string;
  rawResponse: string;
}

export function parseJudgeResponse(
  response: string,
  expectedModels: string[]
): EvaluationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in judge response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    if (!parsed.evaluations || !Array.isArray(parsed.evaluations)) {
      throw new Error("Invalid evaluations array in response");
    }

    const evaluations: ModelEvaluation[] = parsed.evaluations.map((e: any) => ({
      modelId: e.model_id || e.modelId || "unknown",
      criteriaScores: e.criteria_scores || e.criteriaScores || {},
      overallScore: normalizeScore(e.overall_score || e.overallScore || 0),
      reasoning: e.reasoning || "No reasoning provided",
    }));

    // Generate ranking if not provided
    const ranking =
      parsed.ranking ||
      evaluations
        .sort((a, b) => b.overallScore - a.overallScore)
        .map((e) => e.modelId);

    return {
      evaluations,
      ranking,
      summary: parsed.summary || "No summary provided",
      rawResponse: response,
    };
  } catch (error) {
    console.error("Failed to parse judge response:", error);

    // Fallback: create default evaluations for expected models
    return {
      evaluations: expectedModels.map((modelId) => ({
        modelId,
        criteriaScores: {},
        overallScore: 0,
        reasoning: `Failed to parse evaluation: ${error instanceof Error ? error.message : "Unknown error"}`,
      })),
      ranking: expectedModels,
      summary: "Evaluation parsing failed - please try again",
      rawResponse: response,
    };
  }
}

export function parsePairwiseResponse(response: string): PairwiseResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in pairwise response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const winner = parsed.winner?.toUpperCase();
    if (!["A", "B", "TIE"].includes(winner)) {
      throw new Error("Invalid winner value");
    }

    return {
      winner: winner as "A" | "B" | "TIE",
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || "No reasoning provided",
      rawResponse: response,
    };
  } catch (error) {
    return {
      winner: "TIE",
      confidence: 0,
      reasoning: `Failed to parse: ${error instanceof Error ? error.message : "Unknown error"}`,
      rawResponse: response,
    };
  }
}

function normalizeScore(score: number): number {
  // Ensure score is between 0 and 10
  const numScore = Number(score);
  if (isNaN(numScore)) return 0;
  return Math.max(0, Math.min(10, numScore));
}

export function calculateWeightedScore(
  criteriaScores: Record<string, number>,
  weights: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [criterion, score] of Object.entries(criteriaScores)) {
    const weight = weights[criterion] || 1.0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

export function formatScoreDisplay(score: number): string {
  return score.toFixed(1);
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "#00FF00"; // Green
  if (score >= 6) return "#90EE90"; // Light green
  if (score >= 4) return "#FFA500"; // Orange
  if (score >= 2) return "#FF6347"; // Tomato
  return "#FF0000"; // Red
}
