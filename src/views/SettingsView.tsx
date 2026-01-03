// Settings view - configure defaults and manage data
import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { getDatabase, getRunCount } from "../db";
import { TOOL_DESCRIPTIONS, getAllToolNames } from "../tools";
import { useJudgeModelSelector } from "../hooks/useJudgeModelSelector";
import { theme } from "../theme";

interface SettingsViewProps {
  focused: boolean;
}

interface Settings {
  defaultTemperature: number;
  defaultMaxTokens: number;
  autoSaveRuns: boolean;
}

const MAX_SEARCH_RESULTS = 200;

export function SettingsView({ focused }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings>({
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    autoSaveRuns: true,
  });

  const [focusedSection, setFocusedSection] = useState<
    "model" | "judge" | "tools" | "data"
  >("model");

  const [runCount, setRunCount] = useState(() => {
    try {
      const db = getDatabase();
      return getRunCount(db);
    } catch {
      return 0;
    }
  });

  const [judgeModelIndex, setJudgeModelIndex] = useState(0);

  const judgeModelSelector = useJudgeModelSelector();
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
    addJudgeModel,
    removeJudgeModel,
    isJudgeModel,
  } = judgeModelSelector;

  const judgeModels = savedModels.filter((m) => m.is_judge === 1);

  useEffect(() => {
    setJudgeModelIndex((prev) =>
      Math.min(prev, Math.max(0, judgeModels.length - 1))
    );
  }, [judgeModels.length]);

  const handleDeleteSavedModel = useCallback(
    (modelId: string) => {
      deleteSavedModel(modelId);
    },
    [deleteSavedModel]
  );

  useKeyboard((key) => {
    if (!focused) return;

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
        (key.name === "up" || key.name === "backtab") &&
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
        if (model) {
          addSavedModel(model);
          addJudgeModel(model.id);
        }
        return;
      }

      return;
    }

    if (key.name === "tab") {
      setFocusedSection((prev) => {
        if (prev === "model") return "judge";
        if (prev === "judge") return "tools";
        if (prev === "tools") return "data";
        return "model";
      });
      return;
    }

    if (focusedSection === "judge") {
      if (key.name === "slash" || key.raw === "/" || key.name === "a") {
        openModelSearch();
        return;
      }

      if (key.name === "backspace" && savedModels.length > 0) {
        const model = savedModels[savedModelIndex];
        if (model) handleDeleteSavedModel(model.model_id);
        return;
      }

      if (key.name === "d" && judgeModels.length > 0) {
        const modelId = judgeModels[judgeModelIndex]?.model_id;
        if (modelId) removeJudgeModel(modelId);
        return;
      }

      if (key.name === "left" && judgeModels.length > 0) {
        setJudgeModelIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.name === "right" && judgeModels.length > 0) {
        setJudgeModelIndex((prev) => Math.min(judgeModels.length - 1, prev + 1));
        return;
      }

      if (
        (key.name === "return" || key.name === "linefeed") &&
        savedModels.length > 0 &&
        savedModelIndex < savedModels.length
      ) {
        const model = savedModels[savedModelIndex];
        if (model) {
          if (isJudgeModel(model.model_id)) {
            removeJudgeModel(model.model_id);
          } else {
            addJudgeModel(model.model_id);
          }
        }
        return;
      }
    }
  });

  const allTools = getAllToolNames();

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      {/* Model Defaults */}
      <box
        borderStyle="rounded"
        borderColor={focusedSection === "model" && focused ? theme.ui.borderFocused : theme.ui.border}
        padding={1}
      >
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: theme.accent.blue }}>Temperature:</text>
            <text>{settings.defaultTemperature}</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: theme.accent.blue }}>Max Tokens:</text>
            <text>{settings.defaultMaxTokens}</text>
          </box>
        </box>
      </box>

      {/* Judge Configuration */}
      <box
        borderStyle="rounded"
        borderColor={focusedSection === "judge" && focused ? theme.ui.borderFocused : theme.ui.border}
        padding={1}
        height={14}
      >
        <box flexDirection="row" gap={2} flexGrow={1}>
          {/* Saved Models List */}
          <box flexDirection="column" flexGrow={1}>
            <text style={{ fg: theme.accent.blue }} attributes={TextAttributes.DIM}>
              Available Models:
            </text>
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
                focused={focusedSection === "judge" && focused && !showModelSearch}
                showDescription
                selectedIndex={savedModelIndex}
                onChange={(index) => setSavedModelIndex(index)}
                onSelect={(_, option) =>
                  option?.value && addJudgeModel(option.value)
                }
                style={{
                  height: 8,
                  selectedBackgroundColor: theme.ui.selection,
                  focusedBackgroundColor: theme.bg.surface,
                }}
              />
            )}
          </box>

          {/* Selected Judge Models */}
          <box flexDirection="column" width={30}>
            <text style={{ fg: theme.accent.blue }} attributes={TextAttributes.DIM}>
              Selected Judges ({judgeModels.length}):
            </text>
            <scrollbox flexGrow={1}>
              {judgeModels.length === 0 ? (
                <text attributes={TextAttributes.DIM}>None selected</text>
              ) : (
                <box flexDirection="column">
                  {judgeModels.map((model, i) => {
                    const isFocused = judgeModelIndex === i;
                    return (
                      <box
                        key={model.model_id}
                        backgroundColor={isFocused ? theme.ui.selection : undefined}
                      >
                        <text style={{ fg: theme.accent.green }}>
                          {model.model_name}
                        </text>
                      </box>
                    );
                  })}
                </box>
              )}
            </scrollbox>
          </box>
        </box>
      </box>

      {/* Model Search Modal */}
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
            borderStyle: "rounded",
            borderColor: theme.ui.border,
            backgroundColor: theme.bg.surface,
            padding: 1,
            zIndex: 100,
          }}
          title="Search Models"
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
                  if (model) {
                    addSavedModel(model);
                    addJudgeModel(model.id);
                  }
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
              {filteredOpenRouterModels.length} matches | Enter: save & add as judge | Esc: close
            </text>
          </box>
        </box>
      )}

      {/* Tool Configuration */}
      <box
        borderStyle="rounded"
        borderColor={focusedSection === "tools" && focused ? theme.ui.borderFocused : theme.ui.border}
        padding={1}
      >
        <box flexDirection="column" gap={1}>
          {allTools.map((toolName) => {
            const info = TOOL_DESCRIPTIONS[toolName];
            return (
              <box key={toolName} flexDirection="row" gap={2}>
                <text style={{ fg: theme.accent.green }}>{info?.name || toolName}</text>
                <text style={{ fg: theme.fg.faint }}>
                  {info?.description || "No description"}
                </text>
              </box>
            );
          })}
        </box>
      </box>

      {/* Data Management */}
      <box
        borderStyle="rounded"
        borderColor={focusedSection === "data" && focused ? theme.ui.borderFocused : theme.ui.border}
        padding={1}
      >
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: theme.accent.blue }}>Database:</text>
            <text>data/Litmus.db</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: theme.accent.blue }}>Total Runs:</text>
            <text>{runCount}</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: theme.accent.blue }}>Auto-save:</text>
            <text style={{ fg: settings.autoSaveRuns ? theme.status.success : theme.status.error }}>
              {settings.autoSaveRuns ? "Enabled" : "Disabled"}
            </text>
          </box>
        </box>
      </box>

      {/* Help */}
      <box marginTop={1}>
        <text attributes={TextAttributes.DIM}>
          Tab: switch sections | /: search models | Enter: toggle judge | Backspace: remove saved | d: remove judge | Left/Right: navigate judges
        </text>
      </box>
    </box>
  );
}
