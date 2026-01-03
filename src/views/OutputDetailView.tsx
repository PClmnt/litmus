// Output Detail View - Shows detailed information about a model's response
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { BenchmarkModel, ToolCall, UsageData } from "../types";
import { theme, getStatusColor } from "../theme";

interface OutputDetailViewProps {
  model: BenchmarkModel & { toolCalls: ToolCall[] };
  prompt: string;
  focused: boolean;
  onBack: () => void;
}

export function OutputDetailView({
  model,
  prompt,
  focused,
  onBack,
}: OutputDetailViewProps) {
  useKeyboard((key) => {
    if (!focused) return;

    if (key.name === "escape" || key.name === "q") {
      onBack();
    }
  });

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return "N/A";
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUsage = (usage?: UsageData) => {
    if (!usage) return null;

    const parts: string[] = [];

    if (usage.inputTokens !== undefined) {
      parts.push(`Input: ${usage.inputTokens}`);
    }
    if (usage.outputTokens !== undefined) {
      parts.push(`Output: ${usage.outputTokens}`);
    }
    if (usage.totalTokens !== undefined) {
      parts.push(`Total: ${usage.totalTokens}`);
    }

    return parts.length > 0 ? parts.join(" | ") : null;
  };

  const textOutput = model.output.find((p) => p.type === "text")?.text || "";
  const reasoningOutput = model.output.find(
    (p) => p.type === "reasoning"
  )?.text;

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box
        marginBottom={1}
        paddingLeft={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <text style={{ fg: theme.fg.default }}>{model.modelName}</text>
        <text attributes={TextAttributes.DIM}>esc back</text>
      </box>

      {/* Two column layout */}
      <box flexDirection="row" gap={1} flexGrow={1}>
        {/* Left column - Output content */}
        <box
          flexDirection="column"
          flexGrow={1}
          flexBasis={0}
          borderStyle="rounded"
          borderColor={theme.ui.border}
        >
          <scrollbox flexGrow={1} padding={1}>
            <text wrapMode="word">{textOutput || "(No output)"}</text>
          </scrollbox>
        </box>

        {/* Right column - Details */}
        <box flexDirection="column" width={45}>
          {/* Prompt */}
          <box borderStyle="rounded" borderColor={theme.ui.border} marginBottom={1} height={5}>
            <scrollbox padding={1} flexGrow={1}>
              <text wrapMode="word" style={{ fg: theme.fg.muted }}>
                {prompt}
              </text>
            </scrollbox>
          </box>

          {/* Stats */}
          <box borderStyle="rounded" borderColor={theme.ui.border} marginBottom={1}>
            <box flexDirection="column" padding={1} gap={1}>
              <box flexDirection="row" justifyContent="space-between">
                <text attributes={TextAttributes.DIM}>Duration:</text>
                <text>{formatDuration(model.startTime, model.endTime)}</text>
              </box>
              <box flexDirection="row" justifyContent="space-between">
                <text attributes={TextAttributes.DIM}>Status:</text>
                <text
                  style={{
                    fg: getStatusColor(model.status),
                  }}
                >
                  {model.status}
                </text>
              </box>
              {model.finishReason && (
                <box flexDirection="row" justifyContent="space-between">
                  <text attributes={TextAttributes.DIM}>Finish Reason:</text>
                  <text>{model.finishReason}</text>
                </box>
              )}
            </box>
          </box>

          {/* Usage Tokens */}
          <box borderStyle="rounded" borderColor={theme.ui.border} marginBottom={1}>
            <box flexDirection="column" padding={1} gap={1}>
              {model.usage ? (
                <>
                  {model.usage.inputTokens !== undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>Input Tokens:</text>
                      <text style={{ fg: theme.accent.blue }}>
                        {model.usage.inputTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                  {model.usage.outputTokens !== undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>
                        Output Tokens:
                      </text>
                      <text style={{ fg: theme.accent.aqua }}>
                        {model.usage.outputTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                  {model.usage.totalTokens !== undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>Total Tokens:</text>
                      <text style={{ fg: theme.fg.default }}>
                        {model.usage.totalTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                  {model.usage.inputTokenDetails?.cacheReadTokens !==
                    undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>Cache Read:</text>
                      <text style={{ fg: theme.accent.purple }}>
                        {model.usage.inputTokenDetails.cacheReadTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                  {model.usage.inputTokenDetails?.cacheWriteTokens !==
                    undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>Cache Write:</text>
                      <text style={{ fg: theme.accent.purple }}>
                        {model.usage.inputTokenDetails.cacheWriteTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                  {model.usage.outputTokenDetails?.reasoningTokens !==
                    undefined && (
                    <box flexDirection="row" justifyContent="space-between">
                      <text attributes={TextAttributes.DIM}>
                        Reasoning Tokens:
                      </text>
                      <text style={{ fg: theme.accent.yellow }}>
                        {model.usage.outputTokenDetails.reasoningTokens.toLocaleString()}
                      </text>
                    </box>
                  )}
                </>
              ) : (
                <text attributes={TextAttributes.DIM}>
                  No usage data available
                </text>
              )}
            </box>
          </box>

          {/* Reasoning (if available) */}
          {reasoningOutput && (
            <box
              borderStyle="rounded"
              borderColor={theme.ui.border}
              marginBottom={1}
              height={8}
            >
              <scrollbox padding={1} flexGrow={1}>
                <text wrapMode="word" style={{ fg: theme.accent.yellow }}>
                  {reasoningOutput}
                </text>
              </scrollbox>
            </box>
          )}

          {/* Tool Calls */}
          {model.toolCalls && model.toolCalls.length > 0 && (
            <box borderStyle="rounded" borderColor={theme.ui.border} flexGrow={1}>
              <scrollbox padding={1} flexGrow={1}>
                <box flexDirection="column" gap={1}>
                  {model.toolCalls.map((tc, i) => (
                    <box
                      key={i}
                      flexDirection="column"
                      padding={1}
                    >
                      <text style={{ fg: theme.accent.blue }} attributes={TextAttributes.BOLD}>
                        {tc.name}
                      </text>
                      <text attributes={TextAttributes.DIM}>Args:</text>
                      <text wrapMode="word" style={{ fg: theme.fg.faint }}>
                        {JSON.stringify(tc.args, null, 2)}
                      </text>
                      {tc.result !== undefined && (
                        <>
                          <text attributes={TextAttributes.DIM}>Result:</text>
                          <text wrapMode="word" style={{ fg: theme.accent.aqua }}>
                            {typeof tc.result === "string"
                              ? tc.result
                              : JSON.stringify(tc.result, null, 2)}
                          </text>
                        </>
                      )}
                    </box>
                  ))}
                </box>
              </scrollbox>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}
