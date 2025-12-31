// Benchmark view - the main model comparison interface
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import {
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  readUIMessageStream,
} from "ai";
import { useCallback, useState } from "react";

import { createAssistantUIMessageStream } from "../ai";
import { getEnabledTools, TOOL_DESCRIPTIONS, getAllToolNames } from "../tools";
import { getDatabase, createRun, createResponse } from "../db";
import type { ToolCall, BenchmarkModel } from "../types";

// Popular OpenRouter models for benchmarking
const AVAILABLE_MODELS = [
  {
    name: "AllenAI: Olmo 3 7B Think",
    value: "allenai/olmo-3-7b-think",
    description: "AllenAI's Olmo 3 7B Think model",
  },
  {
    name: "Grok 4.1 Fast",
    value: "x-ai/grok-4.1-fast",
    description: "Grok 4.1 Fast model",
  },
  {
    name: "Qwen3 14B",
    value: "qwen/qwen3-14b",
    description: "Qwen3 14B model",
  },
];

interface ExtendedBenchmarkModel extends BenchmarkModel {
  toolCalls: ToolCall[];
}

interface BenchmarkViewProps {
  focused: boolean;
  onRunComplete?: (runId: number) => void;
}

export function BenchmarkView({ focused, onRunComplete }: BenchmarkViewProps) {
  const renderer = useRenderer();
  const [prompt, setPrompt] = useState("Write a haiku about coding");
  const [selectedModels, setSelectedModels] = useState<
    ExtendedBenchmarkModel[]
  >([]);
  const [focusedElement, setFocusedElement] = useState<
    "prompt" | "models" | "tools" | "actions" | "output"
  >("models");
  const [isStreaming, setIsStreaming] = useState(false);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [toolIndex, setToolIndex] = useState(0);
  const [lastRunId, setLastRunId] = useState<number | null>(null);

  const [actionIndex, setActionIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);

  const allToolNames = getAllToolNames();

  const toggleTool = useCallback((toolName: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  }, []);

  const addModel = useCallback(
    (modelValue: string) => {
      const modelDef = AVAILABLE_MODELS.find((m) => m.value === modelValue);
      if (!modelDef) return;

      if (selectedModels.some((m) => m.model === modelValue)) return;

      setSelectedModels((prev) => [
        ...prev,
        {
          id: `${modelValue}-${Date.now()}`,
          model: modelValue,
          modelName: modelDef.name,
          output: [{ type: "text", text: "" }],
          toolCalls: [],
          status: "idle",
        },
      ]);
    },
    [selectedModels]
  );

  const removeModel = useCallback((id: string) => {
    setSelectedModels((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedModels([]);
    setFocusedElement("models");
  }, []);

  const streamModel = async (
    model: ExtendedBenchmarkModel,
    promptText: string
  ) => {
    const controller = new AbortController();
    const startTime = Date.now();

    setSelectedModels((prev) =>
      prev.map((m) =>
        m.id === model.id
          ? {
              ...m,
              status: "streaming",
              output: [{ type: "text", text: "" }],
              toolCalls: [],
              startTime,
              error: undefined,
            }
          : m
      )
    );

    try {
      const tools =
        enabledTools.length > 0 ? getEnabledTools(enabledTools) : undefined;
      const stream = createAssistantUIMessageStream({
        prompt: promptText,
        abortSignal: controller.signal,
        model: model.model,
        tools,
      });

      let accumulatedToolCalls: ToolCall[] = [];

      for await (const uiMessage of readUIMessageStream({
        stream,
        onError: (err) => {
          setSelectedModels((prev) =>
            prev.map((m) =>
              m.id === model.id
                ? {
                    ...m,
                    status: "error",
                    error: err instanceof Error ? err.message : String(err),
                  }
                : m
            )
          );
        },
        terminateOnError: true,
      })) {
        if (controller.signal.aborted) return;

        const text = uiMessage.parts
          .filter(isTextUIPart)
          .map((part) => part.text)
          .join("");

        const reasoning = uiMessage.parts
          .filter(isReasoningUIPart)
          .map((part) => part.text)
          .join("");

        const tools = uiMessage.parts.filter(isToolUIPart).map((part) => ({
          name: part.title ?? "",
          args: part.input ?? {},
          result: part.output,
        }));

        accumulatedToolCalls = [...accumulatedToolCalls, ...tools];
        console.log(accumulatedToolCalls);
        setSelectedModels((prev) =>
          prev.map((m) =>
            m.id === model.id
              ? {
                  ...m,
                  output: [
                    { type: "text", text },
                    { type: "reasoning", text: reasoning || "" },
                  ],
                  toolCalls: accumulatedToolCalls,
                }
              : m
          )
        );
      }

      const endTime = Date.now();
      setSelectedModels((prev) =>
        prev.map((m) =>
          m.id === model.id && m.status !== "error"
            ? { ...m, status: "done", endTime }
            : m
        )
      );

      return {
        success: true,
        startTime,
        endTime,
        toolCalls: accumulatedToolCalls,
      };
    } catch (err) {
      if (controller.signal.aborted) return { success: false };
      setSelectedModels((prev) =>
        prev.map((m) =>
          m.id === model.id
            ? {
                ...m,
                status: "error",
                error: err instanceof Error ? err.message : String(err),
              }
            : m
        )
      );
      return { success: false, error: err };
    }
  };

  const runBenchmark = useCallback(async () => {
    if (selectedModels.length === 0 || isStreaming) return;

    setIsStreaming(true);

    const db = getDatabase();
    const runId = createRun(db, {
      prompt_text: prompt,
      tools_enabled: enabledTools.length > 0 ? enabledTools : undefined,
    });
    setLastRunId(runId);

    await Promise.all(
      selectedModels.map((model) => streamModel(model, prompt))
    );

    setSelectedModels((currentModels) => {
      for (const model of currentModels) {
        const textOutput =
          model.output.find((p) => p.type === "text")?.text || "";
        const reasoningOutput = model.output.find(
          (p) => p.type === "reasoning"
        )?.text;

        createResponse(db, {
          run_id: runId,
          model_id: model.model,
          model_name: model.modelName,
          output_text: textOutput,
          reasoning_text: reasoningOutput,
          tool_calls: model.toolCalls.length > 0 ? model.toolCalls : undefined,
          status:
            model.status === "done"
              ? "completed"
              : model.status === "error"
              ? "error"
              : "completed",
          error_message: model.error,
          start_time: model.startTime || Date.now(),
          end_time: model.endTime,
          duration_ms:
            model.startTime && model.endTime
              ? model.endTime - model.startTime
              : undefined,
        });
      }
      return currentModels;
    });

    setIsStreaming(false);
    onRunComplete?.(runId);
  }, [selectedModels, prompt, isStreaming, enabledTools, onRunComplete]);

  useKeyboard((key) => {
    if (!focused) return;

    if (key.ctrl && key.name === "k") {
      renderer?.console.toggle();
      return;
    }

    if (
      key.name === "g" &&
      focusedElement !== "prompt" &&
      !isStreaming &&
      selectedModels.length > 0
    ) {
      runBenchmark();
      return;
    }

    if (key.name === "tab") {
      setFocusedElement((prev) => {
        if (prev === "prompt") return "models";
        if (prev === "models") return "tools";
        if (prev === "tools") return "actions";
        if (prev === "actions") return "output";
        return "prompt";
      });
      return;
    }

    if (focusedElement === "tools") {
      if (key.name === "left") {
        setToolIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "right") {
        setToolIndex((prev) => Math.min(allToolNames.length - 1, prev + 1));
      } else if (
        key.name === "return" ||
        key.name === "space" ||
        key.name === "linefeed"
      ) {
        const toolName = allToolNames[toolIndex];
        if (toolName) toggleTool(toolName);
      }
    }

    if (focusedElement === "actions") {
      if (key.name === "left") {
        setActionIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "right") {
        setActionIndex((prev) => Math.min(1, prev + 1));
      } else if (key.name === "return" || key.name === "linefeed") {
        if (actionIndex === 0) runBenchmark();
        else if (actionIndex === 1) clearAll();
      }
    }

    if (focusedElement === "output") {
      if (key.name === "left") {
        setSelectedModelIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "right") {
        setSelectedModelIndex((prev) => Math.max(0, prev + 1));
      }
    }

    if (
      focusedElement === "models" &&
      key.name === "d" &&
      selectedModels.length > 0
    ) {
      const lastModel = selectedModels[selectedModels.length - 1];
      if (lastModel) removeModel(lastModel.id);
    }
  });

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return "";
    const seconds = ((end - start) / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const getStatusColor = (status: BenchmarkModel["status"]) => {
    switch (status) {
      case "streaming":
        return "#FFA500";
      case "done":
        return "#00FF00";
      case "error":
        return "#FF0000";
      default:
        return "#888888";
    }
  };

  const getStatusMessage = () => {
    if (isStreaming) return "Streaming responses...";
    if (selectedModels.length === 0) return "Select models to compare";
    const readyCount = selectedModels.filter((m) => m.status === "idle").length;
    if (readyCount > 0)
      return `${selectedModels.length} model(s) ready - press Enter or 'g' to generate`;
    const doneCount = selectedModels.filter((m) => m.status === "done").length;
    if (doneCount === selectedModels.length)
      return `All ${doneCount} model(s) complete${
        lastRunId ? ` (Run #${lastRunId})` : ""
      }`;
    return `${selectedModels.length} model(s) selected`;
  };

  const actions = ["Generate", "Clear"];

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Prompt Input */}
      <box borderStyle="rounded" title="Prompt" marginBottom={1} height={3}>
        <input
          placeholder="Enter your prompt..."
          value={prompt}
          onInput={setPrompt}
          focused={focusedElement === "prompt" && focused}
          style={{ focusedBackgroundColor: "#1a1a2e" }}
        />
      </box>

      {/* Model Selector and Controls */}
      <box flexDirection="row" gap={2} marginBottom={1}>
        <box
          borderStyle="rounded"
          title="Add Model (Enter to add)"
          width={35}
          height={12}
        >
          <select
            options={AVAILABLE_MODELS}
            focused={focusedElement === "models" && focused}
            showDescription
            onSelect={(_, option) => option?.value && addModel(option.value)}
            style={{
              height: 10,
              selectedBackgroundColor: "#2a4a6a",
              focusedBackgroundColor: "#1a1a2e",
            }}
          />
        </box>

        <box flexDirection="column" gap={1} flexGrow={1}>
          {/* Tools Selection */}
          <box
            borderStyle={
              focusedElement === "tools" && focused ? "double" : "rounded"
            }
            title="Tools (Space to toggle)"
            padding={1}
          >
            <box flexDirection="row" gap={2}>
              {allToolNames.map((toolName, i) => {
                const isEnabled = enabledTools.includes(toolName);
                const isFocused =
                  focusedElement === "tools" && toolIndex === i && focused;
                const toolInfo = TOOL_DESCRIPTIONS[toolName];

                return (
                  <box
                    key={toolName}
                    backgroundColor={isFocused ? "#2a4a6a" : undefined}
                    padding={0}
                  >
                    <text
                      style={{
                        fg: isEnabled ? "#00FF00" : "#888888",
                      }}
                    >
                      [{isEnabled ? "x" : " "}] {toolInfo?.name || toolName}
                    </text>
                  </box>
                );
              })}
            </box>
          </box>

          {/* Status */}
          <text
            style={{
              fg: isStreaming
                ? "#FFA500"
                : selectedModels.length > 0
                ? "#00FF00"
                : "#888888",
            }}
          >
            {getStatusMessage()}
          </text>
          <text attributes={TextAttributes.DIM}>
            Tab: focus | g: generate | d: remove | Ctrl+K: console
          </text>

          {/* Action Buttons */}
          <box flexDirection="row" gap={1}>
            {actions.map((action, i) => (
              <box
                key={i}
                padding={1}
                borderStyle={
                  focusedElement === "actions" && actionIndex === i && focused
                    ? "double"
                    : "single"
                }
                backgroundColor={
                  focusedElement === "actions" && actionIndex === i && focused
                    ? "#2a4a6a"
                    : undefined
                }
              >
                <text>{action}</text>
              </box>
            ))}
          </box>
        </box>
      </box>

      {/* Output Grid */}
      <box flexDirection="row" gap={1} flexGrow={1} flexWrap="wrap">
        {selectedModels.length === 0 ? (
          <box
            borderStyle="rounded"
            borderColor="#444"
            flexGrow={1}
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
            gap={1}
          >
            <text attributes={TextAttributes.DIM}>
              Select models from the dropdown above
            </text>
            <text attributes={TextAttributes.DIM}>
              Press Enter on a model to add it for comparison
            </text>
          </box>
        ) : (
          selectedModels.map((model, i) => (
            <box
              key={model.id}
              borderStyle="rounded"
              borderColor={getStatusColor(model.status)}
              width={40}
              height={20}
              flexDirection="column"
              backgroundColor={
                focusedElement === "output" &&
                selectedModelIndex === i &&
                focused
                  ? "#2a4a6a"
                  : undefined
              }
            >
              {/* Model header */}
              <box
                backgroundColor={getStatusColor(model.status) + "33"}
                padding={1}
              >
                <text style={{ fg: getStatusColor(model.status) }}>
                  {model.modelName}
                  {model.status === "done" &&
                    ` (${formatDuration(model.startTime, model.endTime)})`}
                </text>
              </box>

              {/* Tool calls display */}
              {model.toolCalls.length > 0 && (
                <box backgroundColor="#1a1a2e" padding={1}>
                  <text style={{ fg: "#6699CC" }}>
                    Tools: {model.toolCalls.map((tc) => tc.name).join(", ")}
                  </text>
                </box>
              )}

              {/* Output content */}
              <scrollbox flexGrow={1} padding={1}>
                <text wrapMode="word">
                  {model.status === "error"
                    ? `Error: ${model.error}`
                    : model.status === "idle"
                    ? "Ready - press 'g' or Enter on Generate"
                    : model.output.find((p) => p.type === "text")?.text || ""}
                </text>
              </scrollbox>
            </box>
          ))
        )}
      </box>
    </box>
  );
}
