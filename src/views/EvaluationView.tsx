// Evaluation view - display and run LLM-as-judge evaluations
import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { getDatabase } from "../db";
import { getResponsesForRun } from "../db/queries/responses";
import { getRun } from "../db/queries/runs";
import {
  createEvaluation,
  createEvaluationScore,
  getLatestEvaluationForRun,
  type EvaluationWithScores,
} from "../db/queries/evaluations";
import {
  evaluateResponses,
  getScoreColor,
  formatScoreDisplay,
  type EvaluationResult,
} from "../evaluation";
import { listJudgeModels } from "../db/queries/saved-models";
import type { ModelResponse } from "../types";
import { theme } from "../theme";

interface EvaluationViewProps {
  runId: number | null;
  focused: boolean;
  onBack?: () => void;
}

interface JudgeModelOption {
  name: string;
  value: string;
  description?: string;
}

export function EvaluationView({
  runId,
  focused,
  onBack,
}: EvaluationViewProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationWithScores | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedJudgeIndex, setSelectedJudgeIndex] = useState(0);
  const [promptText, setPromptText] = useState<string>("");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [judgeModels, setJudgeModels] = useState<JudgeModelOption[]>([]);

  useEffect(() => {
    const db = getDatabase();
    const judges = listJudgeModels(db);
    setJudgeModels(
      judges.map((j) => ({
        name: j.model_name,
        value: j.model_id,
        description: `ctx ${j.context_length?.toLocaleString() ?? "n/a"}`,
      }))
    );
  }, []);

  useEffect(() => {
    if (runId) {
      const db = getDatabase();
      const run = getRun(db, runId);
      if (run) {
        setPromptText(run.prompt_text);
        setResponses(getResponsesForRun(db, runId));
        const existingEval = getLatestEvaluationForRun(db, runId);
        if (existingEval) {
          setEvaluation(existingEval);
        }
      }
    }
  }, [runId]);

  const runEvaluation = useCallback(async () => {
    if (!runId || isEvaluating || responses.length === 0 || judgeModels.length === 0) return;

    setIsEvaluating(true);
    setError(null);

    try {
      const selectedJudge = judgeModels[selectedJudgeIndex];
      if (!selectedJudge) {
        throw new Error("No judge model selected");
      }
      const judgeModel = selectedJudge.value;
      const db = getDatabase();

      const modelOutputs = responses.map((r) => ({
        modelId: r.model_id,
        modelName: r.model_name,
        output: r.output_text || "",
        toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
      }));

      const hasToolUse = modelOutputs.some((m) => m.toolCalls?.length > 0);

      const result = await evaluateResponses(promptText, modelOutputs, {
        judgeModel,
        includeToolUseCriteria: hasToolUse,
      });

      const evalId = createEvaluation(db, {
        run_id: runId,
        judge_model: judgeModel,
        evaluation_prompt: promptText,
      });

      for (const evalResult of result.evaluations) {
        const response = responses.find(
          (r) => r.model_id === evalResult.modelId
        );
        if (response) {
          createEvaluationScore(db, {
            evaluation_id: evalId,
            model_response_id: response.id,
            score: evalResult.overallScore,
            reasoning: evalResult.reasoning,
            criteria_scores: evalResult.criteriaScores,
            raw_response: result.rawResponse,
          });
        }
      }

      const newEval = getLatestEvaluationForRun(db, runId);
      setEvaluation(newEval);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  }, [runId, isEvaluating, responses, promptText, selectedJudgeIndex, judgeModels]);

  useKeyboard((key) => {
    if (!focused) return;

    if (key.name === "escape" || key.name === "q") {
      onBack?.();
      return;
    }

    if (key.name === "e" && !isEvaluating) {
      runEvaluation();
      return;
    }

    if (key.name === "left") {
      setSelectedJudgeIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "right") {
      setSelectedJudgeIndex((prev) =>
        Math.min(judgeModels.length - 1, prev + 1)
      );
    }
  });

  if (!runId) {
    return (
      <box flexGrow={1} justifyContent="center" alignItems="center">
        <text attributes={TextAttributes.DIM}>
          No run selected. Go to History and select a run to evaluate.
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box marginBottom={1}>
        <text style={{ fg: theme.accent.blue }}>Evaluation for Run #{runId}</text>
      </box>

      {/* Prompt */}
      <box borderStyle="rounded" borderColor={theme.ui.border} marginBottom={1} padding={1}>
        <text wrapMode="word">{promptText || "Loading..."}</text>
      </box>

      {/* Judge Selection */}
      <box flexDirection="row" gap={2} marginBottom={1}>
        <text style={{ fg: theme.fg.muted }}>Judge:</text>
        {judgeModels.length === 0 ? (
          <text style={{ fg: theme.status.error }}>
            No judge models configured. Go to Settings to add judge models.
          </text>
        ) : (
          judgeModels.map((model, i) => (
            <box
              key={model.value}
              paddingLeft={1}
              paddingRight={1}
            >
              <text
                style={{ fg: i === selectedJudgeIndex ? theme.fg.default : theme.fg.faint }}
              >
                {model.name}
              </text>
            </box>
          ))
        )}
      </box>

      {/* Status */}
      <box marginBottom={1}>
        {isEvaluating ? (
          <text style={{ fg: theme.status.loading }}>
            Evaluating with {judgeModels[selectedJudgeIndex]?.name ?? "judge"}
            ...
          </text>
        ) : error ? (
          <text style={{ fg: theme.status.error }}>Error: {error}</text>
        ) : judgeModels.length === 0 ? (
          <text attributes={TextAttributes.DIM}>
            Configure judge models in Settings | q: back
          </text>
        ) : (
          <text attributes={TextAttributes.DIM}>
            Press 'e' to run evaluation | Left/Right: select judge | q: back
          </text>
        )}
      </box>

      {/* Results */}
      {evaluation && (
        <box
          borderStyle="rounded"
          borderColor={theme.ui.border}
          flexGrow={1}
          flexDirection="column"
        >
          {/* Ranking Header */}
          <box flexDirection="row" padding={1} backgroundColor={theme.bg.surface}>
            <text style={{ fg: theme.accent.blue }}>
              {"Rank".padEnd(6)}
              {"Model".padEnd(25)}
              {"Score".padEnd(10)}
              {"Reasoning"}
            </text>
          </box>

          {/* Scores */}
          <scrollbox flexGrow={1}>
            {evaluation.scores.map((score, index) => (
              <box
                key={score.id}
                flexDirection="column"
                padding={1}
              >
                <box flexDirection="row">
                  <text style={{ fg: theme.fg.default }}>
                    {String(index + 1).padEnd(6)}
                    {score.model_name.padEnd(25)}
                  </text>
                  <text style={{ fg: getScoreColor(score.score) }}>
                    {formatScoreDisplay(score.score).padEnd(10)}
                  </text>
                </box>
                {score.reasoning && (
                  <box flexDirection="column" marginTop={1}>
                    <text style={{ fg: theme.fg.muted }} wrapMode="word">
                      {score.reasoning}
                    </text>
                  </box>
                )}
              </box>
            ))}
          </scrollbox>
        </box>
      )}

      {!evaluation && !isEvaluating && responses.length > 0 && judgeModels.length === 0 && (
        <box
          borderStyle="rounded"
          borderColor={theme.ui.border}
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <text attributes={TextAttributes.DIM}>
            No judge models configured
          </text>
          <text attributes={TextAttributes.DIM}>
            Go to Settings to configure judge models
          </text>
        </box>
      )}

      {!evaluation && !isEvaluating && responses.length > 0 && judgeModels.length > 0 && (
        <box
          borderStyle="rounded"
          borderColor={theme.ui.border}
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <text attributes={TextAttributes.DIM}>
            {responses.length} model response(s) ready for evaluation
          </text>
          <text attributes={TextAttributes.DIM}>
            Press 'e' to run evaluation
          </text>
        </box>
      )}
    </box>
  );
}
