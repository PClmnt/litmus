// History view - browse past benchmark runs
import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { getDatabase, getRecentRuns, searchRuns, deleteRun, type RunWithResponses } from "../db";
import { getResponsesForRun } from "../db/queries/responses";
import { getLatestEvaluationForRun } from "../db/queries/evaluations";

interface HistoryViewProps {
  onRunSelect?: (runId: number) => void;
  focused: boolean;
}

export function HistoryView({ onRunSelect, focused }: HistoryViewProps) {
  const [runs, setRuns] = useState<RunWithResponses[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [focusedElement, setFocusedElement] = useState<"search" | "list">("list");

  const loadRuns = useCallback(() => {
    const db = getDatabase();
    if (searchQuery.trim()) {
      setRuns(searchRuns(db, searchQuery, 50));
    } else {
      setRuns(getRecentRuns(db, 50));
    }
  }, [searchQuery]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleDelete = useCallback(() => {
    if (runs.length === 0) return;
    const run = runs[selectedIndex];
    if (!run) return;

    const db = getDatabase();
    deleteRun(db, run.id);
    loadRuns();
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, [runs, selectedIndex, loadRuns]);

  useKeyboard((key) => {
    if (!focused) return;

    // Toggle search focus
    if (key.name === "/" || (key.name === "tab" && focusedElement === "list")) {
      setFocusedElement("search");
      setIsSearching(true);
      return;
    }

    if (key.name === "escape") {
      setFocusedElement("list");
      setIsSearching(false);
      return;
    }

    if (focusedElement === "list") {
      if (key.name === "j" || key.name === "down") {
        setSelectedIndex((prev) => Math.min(runs.length - 1, prev + 1));
      } else if (key.name === "k" || key.name === "up") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.name === "return" && runs[selectedIndex]) {
        onRunSelect?.(runs[selectedIndex].id);
      } else if (key.name === "d") {
        handleDelete();
      } else if (key.name === "r") {
        loadRuns();
      }
    }
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString().slice(0, 5);
  };

  const truncatePrompt = (prompt: string, maxLength: number = 40) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.slice(0, maxLength - 3) + "...";
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Search Bar */}
      <box
        borderStyle={focusedElement === "search" ? "double" : "rounded"}
        marginBottom={1}
        height={3}
      >
        <input
          placeholder="Search prompts... (press / to focus)"
          value={searchQuery}
          onInput={(value) => {
            setSearchQuery(value);
          }}
          focused={focusedElement === "search" && focused}
          style={{ focusedBackgroundColor: "#1a1a2e" }}
        />
      </box>

      {/* Stats */}
      <box marginBottom={1}>
        <text attributes={TextAttributes.DIM}>
          {runs.length} run(s) found | j/k: navigate | Enter: view | d: delete | r: refresh
        </text>
      </box>

      {/* Runs List */}
      <box
        borderStyle="rounded"
        flexGrow={1}
        flexDirection="column"
        title="Run History"
      >
        {runs.length === 0 ? (
          <box
            flexGrow={1}
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
          >
            <text attributes={TextAttributes.DIM}>
              No runs found
            </text>
            <text attributes={TextAttributes.DIM}>
              Run a benchmark to see history here
            </text>
          </box>
        ) : (
          <scrollbox flexGrow={1}>
            {/* Header */}
            <box flexDirection="row" padding={1} backgroundColor="#1a1a2e">
              <text style={{ fg: "#6699CC" }}>
                {"ID".padEnd(6)}{"Date".padEnd(18)}{"Prompt".padEnd(42)}{"Models".padEnd(8)}{"Score"}
              </text>
            </box>

            {/* Rows */}
            {runs.map((run, index) => {
              const isSelected = index === selectedIndex && focused;
              return (
                <box
                  key={run.id}
                  flexDirection="row"
                  padding={1}
                  backgroundColor={isSelected ? "#2a4a6a" : undefined}
                >
                  <text
                    style={{
                      fg: isSelected ? "#FFFFFF" : "#CCCCCC",
                    }}
                  >
                    {String(run.id).padEnd(6)}
                    {formatDate(run.created_at).padEnd(18)}
                    {truncatePrompt(run.prompt_text).padEnd(42)}
                    {String(run.model_count).padEnd(8)}
                    {run.avg_score !== null
                      ? run.avg_score.toFixed(1)
                      : run.has_evaluation
                      ? "Yes"
                      : "-"}
                  </text>
                </box>
              );
            })}
          </scrollbox>
        )}
      </box>
    </box>
  );
}
