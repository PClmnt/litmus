// Benchmark view - the main model comparison interface
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import {
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  readUIMessageStream,
} from "ai";
import { useCallback, useEffect, useState } from "react";

import { createAssistantUIMessageStream, type ImageAttachment } from "../ai";
import { getEnabledTools, TOOL_DESCRIPTIONS, getAllToolNames } from "../tools";
import { getDatabase, createRun, createResponse } from "../db";
import type { ToolCall, BenchmarkModel, UsageData } from "../types";
import { useModelSelector } from "../hooks/useModelSelector";
import { theme, getStatusColor } from "../theme";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { platform } from "os";

async function readImageFromClipboard(): Promise<ImageAttachment | null> {
  const os = platform();

  if (os === "darwin") {
    const tmpfile = "/tmp/litmus-clipboard.png";
    try {
      const proc = Bun.spawn(["osascript", "-e", 'set imageData to the clipboard as "PNGf"', "-e", `set fileRef to open for access POSIX file "${tmpfile}" with write permission`, "-e", "set eof fileRef to 0", "-e", "write imageData to fileRef", "-e", "close access fileRef"], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
      await proc.exited;
      const file = Bun.file(tmpfile);
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 0) {
        return { data: Buffer.from(buffer).toString("base64"), mimeType: "image/png" };
      }
    } catch {
    } finally {
      try {
        const rmProc = Bun.spawn(["rm", "-f", tmpfile], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
        await rmProc.exited;
      } catch {}
    }
  }

  if (os === "linux") {
    try {
      const waylandProc = Bun.spawn(["wl-paste", "-t", "image/png"], { stdin: "ignore", stdout: "pipe", stderr: "ignore" });
      const wayland = await Bun.readableStreamToArrayBuffer(waylandProc.stdout);
      if (wayland.byteLength > 0) {
        return { data: Buffer.from(wayland).toString("base64"), mimeType: "image/png" };
      }
    } catch {}
    try {
      const x11Proc = Bun.spawn(["xclip", "-selection", "clipboard", "-t", "image/png", "-o"], { stdin: "ignore", stdout: "pipe", stderr: "ignore" });
      const x11 = await Bun.readableStreamToArrayBuffer(x11Proc.stdout);
      if (x11.byteLength > 0) {
        return { data: Buffer.from(x11).toString("base64"), mimeType: "image/png" };
      }
    } catch {}
  }

  return null;
}

export interface ExtendedBenchmarkModel extends BenchmarkModel {
  toolCalls: ToolCall[];
  usage?: UsageData;
  finishReason?: string;
}

export interface BenchmarkState {
  prompt: string;
  selectedModels: ExtendedBenchmarkModel[];
  enabledTools: string[];
  lastRunId: number | null;
  attachedImages: ImageAttachment[];
}

interface BenchmarkViewProps {
  focused: boolean;
  onRunComplete?: (runId: number) => void;
  onModelSelect?: (model: ExtendedBenchmarkModel, prompt: string) => void;
  onSearchActiveChange?: (isActive: boolean) => void;
  state: BenchmarkState;
  onStateChange: (
    state: BenchmarkState | ((prev: BenchmarkState) => BenchmarkState)
  ) => void;
}

const MAX_SEARCH_RESULTS = 200;

export function BenchmarkView({
  focused,
  onRunComplete,
  onModelSelect,
  onSearchActiveChange,
  state,
  onStateChange,
}: BenchmarkViewProps) {
  const renderer = useRenderer();

  // Use lifted state from parent
  const { prompt, selectedModels, enabledTools, lastRunId, attachedImages } = state;

  // Helper to update specific fields in the lifted state
  const setPrompt = useCallback(
    (value: string | ((prev: string) => string)) => {
      onStateChange((prev) => ({
        ...prev,
        prompt: typeof value === "function" ? value(prev.prompt) : value,
      }));
    },
    [onStateChange]
  );

  const setSelectedModels = useCallback(
    (
      value:
        | ExtendedBenchmarkModel[]
        | ((prev: ExtendedBenchmarkModel[]) => ExtendedBenchmarkModel[])
    ) => {
      onStateChange((prev) => ({
        ...prev,
        selectedModels:
          typeof value === "function" ? value(prev.selectedModels) : value,
      }));
    },
    [onStateChange]
  );

  const setEnabledTools = useCallback(
    (value: string[] | ((prev: string[]) => string[])) => {
      onStateChange((prev) => ({
        ...prev,
        enabledTools:
          typeof value === "function" ? value(prev.enabledTools) : value,
      }));
    },
    [onStateChange]
  );

  const setLastRunId = useCallback(
    (value: number | null | ((prev: number | null) => number | null)) => {
      onStateChange((prev) => ({
        ...prev,
        lastRunId: typeof value === "function" ? value(prev.lastRunId) : value,
      }));
    },
    [onStateChange]
  );

  const setAttachedImages = useCallback(
    (value: ImageAttachment[] | ((prev: ImageAttachment[]) => ImageAttachment[])) => {
      onStateChange((prev) => ({
        ...prev,
        attachedImages: typeof value === "function" ? value(prev.attachedImages) : value,
      }));
    },
    [onStateChange]
  );

  // Local UI state (doesn't need to persist)
  const [focusedElement, setFocusedElement] = useState<
    "prompt" | "models" | "tools" | "output"
  >("models");
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolIndex, setToolIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageInputPath, setImageInputPath] = useState("");

  const allToolNames = getAllToolNames();

  // Function to attach an image from a file path
  const attachImageFromPath = useCallback((inputPath: string) => {
    const text = inputPath.trim();
    if (!text) return false;
    
    // Check if it's a base64 data URL for an image
    if (text.startsWith("data:image/")) {
      const mimeMatch = text.match(/^data:(image\/[^;]+);base64,/);
      const mimeType = mimeMatch?.[1] || "image/png";
      setAttachedImages((prev) => [...prev, { data: text, mimeType }]);
      return true;
    }
    
    // Check if it's a file path to an image
    const imagePath = text.startsWith("~") 
      ? text.replace("~", process.env.HOME || "")
      : text;
    const resolvedPath = resolve(imagePath);
    
    if (existsSync(resolvedPath)) {
      const ext = resolvedPath.toLowerCase().split(".").pop();
      const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
      
      if (ext && imageExtensions.includes(ext)) {
        try {
          const fileData = readFileSync(resolvedPath);
          const base64 = fileData.toString("base64");
          const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          const dataUrl = `data:${mimeType};base64,${base64}`;
          setAttachedImages((prev) => [...prev, { data: dataUrl, mimeType }]);
          return true;
        } catch (err) {
          // Failed to read file
          return false;
        }
      }
    }
    return false;
  }, []);

  // Handle paste events for image attachment
  useEffect(() => {
    const handlePaste = (event: { text: string }) => {
      attachImageFromPath(event.text);
    };

    renderer?.keyInput?.on("paste", handlePaste);
    return () => {
      renderer?.keyInput?.off("paste", handlePaste);
    };
  }, [renderer, attachImageFromPath]);

  // Use the shared model selector hook
  const modelSelector = useModelSelector();
  const {
    savedModels,
    savedModelIndex,
    setSavedModelIndex,
    savedModelOptions,
    visibleOpenRouterModels,
    openRouterOptions,
    filteredOpenRouterModels,
    modelsLoading,
    modelsError,
    showModelSearch,
    modelSearchQuery,
    setModelSearchQuery,
    modelSearchFocus,
    setModelSearchFocus,
    modelSearchIndex,
    setModelSearchIndex,
    openModelSearch,
    closeModelSearch,
    addSavedModel,
    deleteSavedModel,
  } = modelSelector;

  useEffect(() => {
    setSelectedModelIndex((prev) =>
      Math.min(prev, Math.max(0, selectedModels.length - 1))
    );
  }, [selectedModels.length]);

  const toggleTool = useCallback((toolName: string) => {
    setEnabledTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  }, []);

  const addModel = useCallback(
    (modelValue: string) => {
      const modelDef = savedModels.find((m) => m.model_id === modelValue);
      if (!modelDef) return;

      if (selectedModels.some((m) => m.model === modelValue)) return;

      setSelectedModels((prev) => [
        ...prev,
        {
          id: `${modelValue}-${Date.now()}`,
          model: modelValue,
          modelName: modelDef.model_name,
          output: [{ type: "text", text: "" }],
          toolCalls: [],
          status: "idle",
        },
      ]);
    },
    [selectedModels, savedModels]
  );

  const removeModel = useCallback((id: string) => {
    setSelectedModels((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const streamModel = async (
    model: ExtendedBenchmarkModel,
    promptText: string,
    images?: ImageAttachment[]
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
              usage: undefined,
              finishReason: undefined,
            }
          : m
      )
    );

    try {
      const tools =
        enabledTools.length > 0 ? getEnabledTools(enabledTools) : undefined;
      const streamResult = createAssistantUIMessageStream({
        prompt: promptText,
        images: images && images.length > 0 ? images : undefined,
        abortSignal: controller.signal,
        model: model.model,
        tools,
      });

      let accumulatedToolCalls: ToolCall[] = [];

      for await (const uiMessage of readUIMessageStream({
        stream: streamResult.stream,
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

      // Get usage and finish reason after streaming completes
      const [usage, finishReason] = await Promise.all([
        streamResult.getUsage(),
        streamResult.getFinishReason(),
      ]);

      const endTime = Date.now();
      setSelectedModels((prev) =>
        prev.map((m) =>
          m.id === model.id && m.status !== "error"
            ? { ...m, status: "done", endTime, usage, finishReason }
            : m
        )
      );

      return {
        success: true,
        startTime,
        endTime,
        toolCalls: accumulatedToolCalls,
        usage,
        finishReason,
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
      selectedModels.map((model) => streamModel(model, prompt, attachedImages))
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
  }, [selectedModels, prompt, isStreaming, enabledTools, attachedImages, onRunComplete]);

  useKeyboard((key) => {
    if (!focused) return;

    // Handle image input modal
    if (showImageInput) {
      if (key.name === "escape") {
        setShowImageInput(false);
        setImageInputPath("");
        return;
      }
      if (key.name === "return" || key.name === "linefeed") {
        if (attachImageFromPath(imageInputPath)) {
          setShowImageInput(false);
          setImageInputPath("");
        }
        return;
      }
      return;
    }

    if (showModelSearch) {
      if (key.name === "escape") {
        closeModelSearch();
        return;
      }

      if (key.name === "tab") {
        setModelSearchFocus(modelSearchFocus === "search" ? "list" : "search");
        return;
      }

      if (key.name === "down" && modelSearchFocus === "search") {
        setModelSearchFocus("list");
        return;
      }

      if (
        key.name === "up" &&
        modelSearchFocus === "list" &&
        modelSearchIndex === 0
      ) {
        setModelSearchFocus("search");
        return;
      }

      if (
        (key.name === "return" || key.name === "linefeed") &&
        modelSearchFocus === "list"
      ) {
        const model = visibleOpenRouterModels[modelSearchIndex];
        if (model) addSavedModel(model);
        return;
      }

      return;
    }

    if (key.ctrl && key.name === "k") {
      renderer?.console.toggle();
      return;
    }

    // Handle Ctrl+V for clipboard image paste
    if (key.ctrl && key.name === "v") {
      readImageFromClipboard().then((image) => {
        if (image) {
          setAttachedImages((prev) => [...prev, image]);
        }
      });
      return;
    }

    // Open image input dialog with 'i' key (not in prompt mode)
    if (key.name === "i" && focusedElement !== "prompt") {
      setShowImageInput(true);
      setImageInputPath("");
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
        if (prev === "tools") return "output";
        return "prompt";
      });
      return;
    }

    if (
      focusedElement === "models" &&
      (key.name === "slash" || key.raw === "/" || key.name === "a")
    ) {
      openModelSearch();
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

    if (focusedElement === "models" && key.name === "backspace") {
      const model = savedModels[savedModelIndex];
      if (model) deleteSavedModel(model.model_id);
      return;
    }

    if (focusedElement === "output") {
      if (key.name === "left") {
        setSelectedModelIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "right") {
        setSelectedModelIndex((prev) =>
          Math.min(selectedModels.length - 1, prev + 1)
        );
      } else if (
        (key.name === "return" || key.name === "linefeed") &&
        selectedModels[selectedModelIndex]?.status === "done"
      ) {
        const model = selectedModels[selectedModelIndex];
        if (model && onModelSelect) {
          onModelSelect(model, prompt);
        }
      }
    }

    if (
      focusedElement === "output" &&
      key.name === "d" &&
      selectedModels.length > 0
    ) {
      const model = selectedModels[selectedModelIndex];
      if (model) removeModel(model.id);
    }

    if (key.name === "c" && focusedElement !== "prompt") {
      setSelectedModels([]);
      setAttachedImages([]);
      setFocusedElement("models");
    }

    // Remove last attached image with 'x' key when not in prompt
    if (key.name === "x" && focusedElement !== "prompt" && attachedImages.length > 0) {
      setAttachedImages((prev) => prev.slice(0, -1));
    }
  });

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return "";
    const seconds = ((end - start) / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const getModelStatusColor = (status: BenchmarkModel["status"]) => {
    return getStatusColor(status);
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

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Attached Images Indicator */}
      {attachedImages.length > 0 && (
        <box flexDirection="row" gap={1} marginBottom={1}>
          {attachedImages.map((_, i) => (
            <box
              key={i}
              backgroundColor={theme.bg.blue}
              padding={0}
              borderStyle="rounded"
              borderColor={theme.accent.blue}
            >
              <text style={{ fg: theme.accent.blue }}> Image {i + 1} </text>
            </box>
          ))}
          <text attributes={TextAttributes.DIM}>(x to remove last, c to clear all)</text>
        </box>
      )}

      {/* Prompt Input */}
      <box borderStyle="rounded" title="Prompt" marginBottom={1} height={3}>
        <input
          placeholder="Enter your prompt... (paste image path or data URL to attach)"
          value={prompt}
          onInput={setPrompt}
          focused={focusedElement === "prompt" && focused}
          style={{ focusedBackgroundColor: theme.bg.surface }}
        />
      </box>

      {/* Model Selector and Controls */}
      <box flexDirection="row" gap={2} marginBottom={1}>
        <box flexDirection="column" width={35} gap={1}>
          {/* Tools Selection */}
          <box
            borderStyle={
              focusedElement === "tools" && focused ? "double" : "rounded"
            }
            title="Tools (Space to toggle)"
            padding={1}
            height={6}
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
                      backgroundColor={isFocused ? theme.ui.highlight : undefined}
                      padding={0}
                    >
                      <text
                        style={{
                          fg: isEnabled ? theme.accent.green : theme.fg.faint,
                        }}
                      >
                        [{isEnabled ? "x" : " "}] {toolInfo?.name || toolName}
                      </text>
                    </box>
                  );
              })}
            </box>
          </box>

          {/* Help Text */}
          <text attributes={TextAttributes.DIM}>
            Tab: focus | /: add model | g: generate | c: clear | i: attach image
            | x: remove image | Ctrl+V: paste image from clipboard | Paste path to attach
          </text>
        </box>

        <box flexDirection="column" gap={1} flexGrow={1}>
          <box
            borderStyle={
              focusedElement === "models" && focused ? "double" : "rounded"
            }
            title="Models (Enter to add, / to search)"
            padding={1}
            height={12}
          >
            {savedModelOptions.length === 0 ? (
              <box
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                flexGrow={1}
                gap={1}
              >
                <text attributes={TextAttributes.DIM}>No saved models yet</text>
                <text attributes={TextAttributes.DIM}>
                  Press / to search OpenRouter models
                </text>
              </box>
            ) : (
              <select
                options={savedModelOptions}
                focused={focusedElement === "models" && focused}
                showDescription
                selectedIndex={savedModelIndex}
                onChange={(index) => setSavedModelIndex(index)}
                onSelect={(_, option) =>
                  option?.value && addModel(option.value)
                }
                style={{
                  height: 8,
                  selectedBackgroundColor: theme.ui.selection,
                  focusedBackgroundColor: theme.bg.surface,
                }}
              />
            )}
          </box>

          {/* Status */}
          <text
            style={{
              fg: isStreaming
                ? theme.status.loading
                : selectedModels.length > 0
                ? theme.status.success
                : theme.fg.faint,
            }}
          >
            {getStatusMessage()}
          </text>
        </box>
      </box>

      {showModelSearch && (
        <box
          style={{
            position: "absolute",
            left: "50%",
            top: "35%",
            width: 90,
            height: 20,
            marginLeft: -45,
            marginTop: -10,
            border: true,
            borderStyle: "double",
            borderColor: theme.ui.borderFocused,
            backgroundColor: theme.bg.surface,
            padding: 1,
            zIndex: 100,
          }}
          title="Search OpenRouter Models"
          titleAlignment="center"
        >
          <box flexDirection="column" gap={1} flexGrow={1}>
            <input
              placeholder="Search by name or id..."
              value={modelSearchQuery}
              onInput={(value) => {
                setModelSearchQuery(value);
                setModelSearchIndex(0);
              }}
              focused={modelSearchFocus === "search" && focused}
              style={{ focusedBackgroundColor: theme.bg.elevated }}
            />
            {modelsLoading ? (
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text style={{ fg: theme.status.loading }}>Loading models...</text>
              </box>
            ) : modelsError ? (
              <box flexDirection="column" gap={1}>
                <text style={{ fg: theme.status.error }}>
                  Failed to load models: {modelsError}
                </text>
                <text attributes={TextAttributes.DIM}>
                  Check OPENROUTER_API_KEY and try again
                </text>
              </box>
            ) : openRouterOptions.length === 0 ? (
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text attributes={TextAttributes.DIM}>
                  No models match your search
                </text>
              </box>
            ) : (
              <select
                options={openRouterOptions}
                focused={modelSearchFocus === "list" && focused}
                showDescription
                selectedIndex={modelSearchIndex}
                onChange={(index) => setModelSearchIndex(index)}
                onSelect={(_, option) => {
                  const model = visibleOpenRouterModels.find(
                    (item) => item.id === option?.value
                  );
                  if (model) addSavedModel(model);
                }}
                style={{
                  height: 12,
                  selectedBackgroundColor: theme.ui.selection,
                  focusedBackgroundColor: theme.bg.surface,
                }}
              />
            )}
            <text attributes={TextAttributes.DIM}>
              Showing{" "}
              {Math.min(filteredOpenRouterModels.length, MAX_SEARCH_RESULTS)} of{" "}
              {filteredOpenRouterModels.length} matches | Enter: save | Esc:
              close
            </text>
          </box>
        </box>
      )}

      {/* Image Input Modal */}
      {showImageInput && (
        <box
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            width: 70,
            height: 7,
            marginLeft: -35,
            marginTop: -3,
            border: true,
            borderStyle: "double",
            borderColor: theme.ui.borderFocused,
            backgroundColor: theme.bg.surface,
            padding: 1,
            zIndex: 100,
          }}
          title="Attach Image"
          titleAlignment="center"
        >
          <box flexDirection="column" gap={1}>
            <input
              placeholder="Enter image file path (e.g., ~/photos/image.png)"
              value={imageInputPath}
              onInput={setImageInputPath}
              focused={showImageInput && focused}
              style={{ focusedBackgroundColor: theme.bg.elevated }}
            />
            <text attributes={TextAttributes.DIM}>
              Enter: attach | Esc: cancel | Supports: png, jpg, gif, webp, bmp
            </text>
          </box>
        </box>
      )}

      {/* Output Grid */}
      <box flexDirection="row" gap={1} flexGrow={1} flexWrap="wrap">
        {selectedModels.length === 0 ? (
          <box
            borderStyle="rounded"
            borderColor={theme.ui.border}
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
              borderColor={getModelStatusColor(model.status)}
              width={40}
              height={20}
              flexDirection="column"
              backgroundColor={
                focusedElement === "output" &&
                selectedModelIndex === i &&
                focused
                  ? theme.ui.highlight
                  : undefined
              }
            >
              {/* Model header */}
              <box
                backgroundColor={theme.bg.surface}
                padding={1}
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <text style={{ fg: getModelStatusColor(model.status) }}>
                  {model.modelName}
                  {model.status === "done" &&
                    ` (${formatDuration(model.startTime, model.endTime)})`}
                </text>
                {model.status === "done" && model.usage && (
                  <text style={{ fg: theme.fg.faint }}>
                    {model.usage.totalTokens
                      ? `${model.usage.totalTokens} tokens`
                      : model.usage.inputTokens && model.usage.outputTokens
                      ? `${model.usage.inputTokens}/${model.usage.outputTokens} tokens`
                      : ""}
                  </text>
                )}
              </box>

              {/* Tool calls display */}
              {model.toolCalls.length > 0 && (
                <box backgroundColor={theme.bg.dim} padding={1}>
                  <text style={{ fg: theme.accent.blue }}>
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
