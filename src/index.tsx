import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import {
  isTextUIPart,
  readUIMessageStream,
  type UIDataTypes,
  type UIMessagePart,
  type UITools,
} from "ai";
import { useCallback, useState } from "react";

import { createAssistantUIMessageStream } from "./ai";
import { Detail } from "./detail";

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

interface BenchmarkModel {
  id: string;
  model: string;
  modelName: string;
  output: UIMessagePart<UIDataTypes, UITools>[];
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  startTime?: number;
  endTime?: number;
}

function App() {
  const renderer = useRenderer();
  const [prompt, setPrompt] = useState("Write a haiku about coding");
  const [selectedModels, setSelectedModels] = useState<BenchmarkModel[]>([]);
  const [focusedElement, setFocusedElement] = useState<
    "prompt" | "models" | "actions" | "output"
  >("models");
  const [isStreaming, setIsStreaming] = useState(false);

  const [actionIndex, setActionIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [detailVisible, setDetailVisible] = useState(false);
  const addModel = useCallback(
    (modelValue: string) => {
      const modelDef = AVAILABLE_MODELS.find((m) => m.value === modelValue);
      if (!modelDef) return;

      // Don't add duplicates
      if (selectedModels.some((m) => m.model === modelValue)) return;

      setSelectedModels((prev) => [
        ...prev,
        {
          id: `${modelValue}-${Date.now()}`,
          model: modelValue,
          modelName: modelDef.name,
          output: [{ type: "text", text: "" }],
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

  const streamModel = async (model: BenchmarkModel, promptText: string) => {
    const controller = new AbortController();
    const startTime = Date.now();

    setSelectedModels((prev) =>
      prev.map((m) =>
        m.id === model.id
          ? {
              ...m,
              status: "streaming",
              output: [{ type: "text", text: "" }],
              startTime,
              error: undefined,
            }
          : m
      )
    );

    try {
      const stream = createAssistantUIMessageStream({
        prompt: promptText,
        abortSignal: controller.signal,
        model: model.model,
      });

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
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((part) => part.text)
          .join("");

        const reasoning = uiMessage.parts
          .filter(
            (part): part is { type: "reasoning"; text: string } =>
              part.type === "reasoning"
          )
          .map((part) => part.text)
          .join("");

        setSelectedModels((prev) =>
          prev.map((m) =>
            m.id === model.id
              ? {
                  ...m,
                  output: [
                    { type: "text", text },
                    { type: "reasoning", text: reasoning || "" },
                  ],
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
    } catch (err) {
      if (controller.signal.aborted) return;
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
    }
  };

  const runBenchmark = useCallback(async () => {
    if (selectedModels.length === 0 || isStreaming) return;

    setIsStreaming(true);

    // Stream all models in parallel
    await Promise.all(
      selectedModels.map((model) => streamModel(model, prompt))
    );

    setIsStreaming(false);
  }, [selectedModels, prompt, isStreaming]);

  useKeyboard((key) => {
    // Toggle console with Ctrl+K
    if (key.ctrl && key.name === "k") {
      renderer?.console.toggle();
      return;
    }

    // Global shortcut: 'g' to generate (works from anywhere except prompt input)
    if (
      key.name === "g" &&
      focusedElement !== "prompt" &&
      !isStreaming &&
      selectedModels.length > 0
    ) {
      runBenchmark();
      return;
    }

    // Tab to switch focus areas
    if (key.name === "tab") {
      setFocusedElement((prev) => {
        if (prev === "prompt") return "models";
        if (prev === "models") return "actions";
        if (prev === "actions") return "output";
        return "prompt";
      });
      return;
    }

    // Handle action keys when actions are focused
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
      } else if (key.name === "return") {
        setDetailVisible(true);
      }
    }

    // Delete model with 'd' key when models focused
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

  // Dynamic status message
  const getStatusMessage = () => {
    if (isStreaming) return "⏳ Streaming responses...";
    if (selectedModels.length === 0) return "← Select models to compare";
    const readyCount = selectedModels.filter((m) => m.status === "idle").length;
    if (readyCount > 0)
      return `${selectedModels.length} model(s) ready — press Enter or 'g' to generate`;
    const doneCount = selectedModels.filter((m) => m.status === "done").length;
    if (doneCount === selectedModels.length)
      return `✓ All ${doneCount} model(s) complete`;
    return `${selectedModels.length} model(s) selected`;
  };

  const actions = ["▶ Generate", "✕ Clear"];

  return detailVisible ? (
    <Detail toggleDetail={() => setDetailVisible(false)} />
  ) : (
    <box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <box justifyContent="center" flexDirection="row" marginBottom={1}>
        <ascii-font font="tiny" text="TUI Bench" />
      </box>

      {/* Prompt Input */}
      <box borderStyle="rounded" title="Prompt" marginBottom={1} height={3}>
        <input
          placeholder="Enter your prompt..."
          value={prompt}
          onInput={setPrompt}
          focused={focusedElement === "prompt"}
          style={{ focusedBackgroundColor: "#1a1a2e" }}
        />
      </box>

      {/* Model Selector and Actions */}
      <box flexDirection="row" gap={2} marginBottom={1}>
        <box
          borderStyle="rounded"
          title="Add Model (Enter to add)"
          width={35}
          height={12}
        >
          <select
            options={AVAILABLE_MODELS}
            focused={focusedElement === "models"}
            showDescription
            onSelect={(_, option) => option?.value && addModel(option.value)}
            style={{
              height: 10,
              selectedBackgroundColor: "#2a4a6a",
              focusedBackgroundColor: "#1a1a2e",
            }}
          />
        </box>

        <box flexDirection="column" gap={1}>
          {/* Dynamic status with color */}
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
          <box flexDirection="row" gap={1} marginTop={1}>
            {actions.map((action, i) => (
              <box
                key={i}
                padding={1}
                borderStyle={
                  focusedElement === "actions" && actionIndex === i
                    ? "double"
                    : "single"
                }
                backgroundColor={
                  focusedElement === "actions" && actionIndex === i
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
              ↑ Select models from the dropdown above
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
              onKeyDown={(key) => {
                console.log("SOME NONSENSE", key);
                if (key.name === "return") {
                  console.log("return");
                  setDetailVisible(true);
                }
              }}
              backgroundColor={
                focusedElement === "output" && selectedModelIndex === i
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

              {/* Output content */}
              <scrollbox flexGrow={1} padding={1}>
                <text wrapMode="word">
                  {model.status === "error"
                    ? `Error: ${model.error}`
                    : model.status === "idle"
                    ? "Ready — press 'g' or Enter on Generate"
                    : model.output.find(isTextUIPart)?.text}
                </text>
              </scrollbox>
            </box>
          ))
        )}
      </box>
    </box>
  );
}

const renderer = await createCliRenderer();
renderer.console.toggle();
createRoot(renderer).render(<App />);
