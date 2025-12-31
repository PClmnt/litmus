// Litmus - Multi-model LLM benchmarking application
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useState, useCallback } from "react";

import { Navigation, getViewFromKey } from "./components/Navigation";
import { BenchmarkView } from "./views/BenchmarkView";
import { HistoryView } from "./views/HistoryView";
import { EvaluationView } from "./views/EvaluationView";
import { SettingsView } from "./views/SettingsView";
import { OutputDetailView } from "./views/OutputDetailView";
import type { ViewName, BenchmarkModel, ToolCall } from "./types";

interface SelectedModelData {
  model: BenchmarkModel & { toolCalls: ToolCall[] };
  prompt: string;
}

function App() {
  const renderer = useRenderer();
  const [currentView, setCurrentView] = useState<ViewName>("benchmark");
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [navigationFocused, setNavigationFocused] = useState(false);
  const [selectedModelData, setSelectedModelData] =
    useState<SelectedModelData | null>(null);

  const handleViewChange = useCallback((view: ViewName) => {
    setCurrentView(view);
    setNavigationFocused(false);
    setSelectedModelData(null);
  }, []);

  const handleModelSelect = useCallback(
    (model: BenchmarkModel & { toolCalls: ToolCall[] }, prompt: string) => {
      setSelectedModelData({ model, prompt });
    },
    []
  );

  const handleBackFromDetail = useCallback(() => {
    setSelectedModelData(null);
  }, []);

  const handleRunSelect = useCallback((runId: number) => {
    setSelectedRunId(runId);
    setCurrentView("evaluations");
  }, []);

  const handleRunComplete = useCallback((runId: number) => {
    setSelectedRunId(runId);
  }, []);

  useKeyboard((key) => {
    // Toggle console with Ctrl+K
    if (key.ctrl && key.name === "k") {
      renderer?.console.toggle();
      return;
    }

    // Number keys for quick navigation (1-4)
    const viewFromKey = getViewFromKey(key.name);
    if (viewFromKey) {
      handleViewChange(viewFromKey);
      return;
    }

    // Escape to go back or focus navigation
    if (key.name === "escape") {
      if (selectedModelData) {
        setSelectedModelData(null);
      } else if (currentView !== "benchmark") {
        setNavigationFocused(true);
      }
    }
  });

  const renderView = () => {
    // Show detail view if a model is selected during benchmark
    if (selectedModelData && currentView === "benchmark") {
      return (
        <OutputDetailView
          model={selectedModelData.model}
          prompt={selectedModelData.prompt}
          focused={true}
          onBack={handleBackFromDetail}
        />
      );
    }

    switch (currentView) {
      case "benchmark":
        return (
          <BenchmarkView
            focused={!navigationFocused}
            onRunComplete={handleRunComplete}
            onModelSelect={handleModelSelect}
          />
        );
      case "history":
        return (
          <HistoryView
            focused={!navigationFocused}
            onRunSelect={handleRunSelect}
          />
        );
      case "evaluations":
        return (
          <EvaluationView
            runId={selectedRunId}
            focused={!navigationFocused}
            onBack={() => setCurrentView("history")}
          />
        );
      case "settings":
        return <SettingsView focused={!navigationFocused} />;
      default:
        return (
          <BenchmarkView
            focused={!navigationFocused}
            onRunComplete={handleRunComplete}
          />
        );
    }
  };

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <box justifyContent="center" flexDirection="row" marginBottom={1}>
        <ascii-font font="tiny" text="Litmus" />
      </box>

      {/* Navigation */}
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        focused={navigationFocused}
      />

      {/* View Content */}
      {renderView()}
    </box>
  );
}

const renderer = await createCliRenderer();
renderer.console.toggle();
createRoot(renderer).render(<App />);
