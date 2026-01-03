// Tab navigation component
import type { ViewName } from "../types";
import { theme } from "../theme";

interface NavigationProps {
  currentView: ViewName;
  onViewChange: (view: ViewName) => void;
  focused: boolean;
}

const TABS: Array<{ name: string; view: ViewName; key: string }> = [
  { name: "Benchmark", view: "benchmark", key: "1" },
  { name: "History", view: "history", key: "2" },
  { name: "Evaluations", view: "evaluations", key: "3" },
  { name: "Settings", view: "settings", key: "4" },
];

export function Navigation({
  currentView,
  onViewChange,
  focused,
}: NavigationProps) {
  return (
    <box flexDirection="row" gap={1} marginBottom={1}>
      {TABS.map((tab) => {
        const isActive = currentView === tab.view;
        return (
          <box
            key={tab.view}
            padding={1}
            borderStyle={isActive ? "double" : "single"}
            borderColor={isActive ? theme.ui.borderActive : focused ? theme.ui.borderFocused : theme.ui.border}
            backgroundColor={isActive ? theme.bg.green : undefined}
          >
            <text
              style={{
                fg: isActive ? theme.accent.green : theme.fg.faint,
              }}
            >
              [{tab.key}] {tab.name}
            </text>
          </box>
        );
      })}
    </box>
  );
}

export function getViewFromKey(key: string): ViewName | null {
  const tab = TABS.find((t) => t.key === key);
  return tab?.view ?? null;
}

export { TABS };
