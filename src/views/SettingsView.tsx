// Settings view - configure defaults and manage data
import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { getDatabase, getRunCount } from "../db";
import { TOOL_DESCRIPTIONS, getAllToolNames } from "../tools";
import { useModelSelector } from "../hooks/useModelSelector";
import { theme } from "../theme";

interface SettingsViewProps {
  focused: boolean;
}

interface Settings {
  defaultTemperature: number;
  defaultMaxTokens: number;
  judgeModels: string[]; // Now supports multiple judge models
  autoSaveRuns: boolean;
}

const MAX_SEARCH_RESULTS = 200;

export function SettingsView({ focused }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings>({
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    judgeModels: [],
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
    setJudgeModelIndex((prev) =>
      Math.min(prev, Math.max(0, settings.judgeModels.length - 1))
    );
  }, [settings.judgeModels.length]);

  // Custom deleteSavedModel that also removes from judge models
  const handleDeleteSavedModel = useCallback(
    (modelId: string) => {
      deleteSavedModel(modelId);
      // Also remove from judge models if present
      setSettings((prev) => ({
        ...prev,
        judgeModels: prev.judgeModels.filter((id) => id !== modelId),
      }));
    },
    [deleteSavedModel]
  );

  const addJudgeModel = useCallback(
    (modelId: string) => {
      if (settings.judgeModels.includes(modelId)) return;
      setSettings((prev) => ({
        ...prev,
        judgeModels: [...prev.judgeModels, modelId],
      }));
    },
    [settings.judgeModels]
  );

  const removeJudgeModel = useCallback((modelId: string) => {
    setSettings((prev) => ({
      ...prev,
      judgeModels: prev.judgeModels.filter((id) => id !== modelId),
    }));
  }, []);

  useKeyboard((key) => {
    if (!focused) return;

    // Handle model search modal
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

    if (key.name === "tab") {
      setFocusedSection((prev) => {
        if (prev === "model") return "judge";
        if (prev === "judge") return "tools";
        if (prev === "tools") return "data";
        return "model";
      });
      return;
    }

    // Judge section keyboard handling
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

      if (key.name === "d" && settings.judgeModels.length > 0) {
        const modelId = settings.judgeModels[judgeModelIndex];
        if (modelId) removeJudgeModel(modelId);
        return;
      }
    }
  });

  const allTools = getAllToolNames();

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      {/* Model Defaults */}
      <box
        borderStyle={focusedSection === "model" ? "double" : "rounded"}
        padding={1}
        title="Model Defaults"
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
        borderStyle={focusedSection === "judge" ? "double" : "rounded"}
        padding={1}
        title="Judge Models (Enter to add, / to search, d to remove)"
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
              Selected Judges ({settings.judgeModels.length}):
            </text>
            <scrollbox flexGrow={1}>
              {settings.judgeModels.length === 0 ? (
                <text attributes={TextAttributes.DIM}>None selected</text>
              ) : (
                <box flexDirection="column">
                  {settings.judgeModels.map((modelId, i) => {
                    const model = savedModels.find((m) => m.model_id === modelId);
                    const isFocused = judgeModelIndex === i;
                    return (
                      <box
                        key={modelId}
                        backgroundColor={isFocused ? theme.ui.selection : undefined}
                      >
                        <text style={{ fg: theme.accent.green }}>
                          {model?.model_name || modelId}
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
              {filteredOpenRouterModels.length} matches | Enter: save | Esc: close
            </text>
          </box>
        </box>
      )}

      {/* Tool Configuration */}
      <box
        borderStyle={focusedSection === "tools" ? "double" : "rounded"}
        padding={1}
        title="Available Tools"
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
        borderStyle={focusedSection === "data" ? "double" : "rounded"}
        padding={1}
        title="Data Management"
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
          Tab: switch sections | /: search models | Backspace: remove saved | d: remove judge | Enter: add judge
        </text>
      </box>
    </box>
  );
}
