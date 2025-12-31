// Settings view - configure defaults and manage data
import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { getDatabase, getRunCount } from "../db";
import { JUDGE_MODELS } from "../evaluation";
import { TOOL_DESCRIPTIONS, getAllToolNames } from "../tools";

interface SettingsViewProps {
  focused: boolean;
}

interface Settings {
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultJudgeModel: string;
  autoSaveRuns: boolean;
}

export function SettingsView({ focused }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings>({
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    defaultJudgeModel: JUDGE_MODELS[0]?.value ?? "openai/gpt-4o",
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

  useKeyboard((key) => {
    if (!focused) return;

    if (key.name === "tab") {
      setFocusedSection((prev) => {
        if (prev === "model") return "judge";
        if (prev === "judge") return "tools";
        if (prev === "tools") return "data";
        return "model";
      });
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
            <text style={{ fg: "#6699CC" }}>Temperature:</text>
            <text>{settings.defaultTemperature}</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: "#6699CC" }}>Max Tokens:</text>
            <text>{settings.defaultMaxTokens}</text>
          </box>
        </box>
      </box>

      {/* Judge Configuration */}
      <box
        borderStyle={focusedSection === "judge" ? "double" : "rounded"}
        padding={1}
        title="Judge Configuration"
      >
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: "#6699CC" }}>Default Judge:</text>
            <text>
              {JUDGE_MODELS.find((m) => m.value === settings.defaultJudgeModel)
                ?.name || settings.defaultJudgeModel}
            </text>
          </box>
          <box flexDirection="row" gap={2} flexWrap="wrap">
            <text style={{ fg: "#888888" }}>Available:</text>
            {JUDGE_MODELS.map((model) => (
              <text
                key={model.value}
                style={{
                  fg:
                    model.value === settings.defaultJudgeModel
                      ? "#00FF00"
                      : "#666666",
                }}
              >
                {model.name}
              </text>
            ))}
          </box>
        </box>
      </box>

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
                <text style={{ fg: "#00FF00" }}>{info?.name || toolName}</text>
                <text style={{ fg: "#888888" }}>
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
            <text style={{ fg: "#6699CC" }}>Database:</text>
            <text>data/Litmus.db</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: "#6699CC" }}>Total Runs:</text>
            <text>{runCount}</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text style={{ fg: "#6699CC" }}>Auto-save:</text>
            <text style={{ fg: settings.autoSaveRuns ? "#00FF00" : "#FF0000" }}>
              {settings.autoSaveRuns ? "Enabled" : "Disabled"}
            </text>
          </box>
        </box>
      </box>

      {/* Help */}
      <box marginTop={1}>
        <text attributes={TextAttributes.DIM}>
          Tab: switch sections | Settings are automatically saved
        </text>
      </box>
    </box>
  );
}
