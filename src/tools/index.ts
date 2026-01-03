// Tool registry - exports all available tools
import { webSearchTool } from "./web-search";
import type { Tool, ToolSet } from "ai";

export const AVAILABLE_TOOLS: Record<string, Tool> = {
  webSearch: webSearchTool,
};

export const TOOL_DESCRIPTIONS: Record<
  string,
  { name: string; description: string }
> = {
  webSearch: {
    name: "Web Search",
    description: "Search for information (mock)",
  },
};

export function getEnabledTools(enabledNames: string[]): ToolSet {
  const tools: Record<string, Tool> = {};
  for (const name of enabledNames) {
    if (AVAILABLE_TOOLS[name]) {
      tools[name] = AVAILABLE_TOOLS[name];
    }
  }
  return tools;
}

export function getAllToolNames(): string[] {
  return Object.keys(AVAILABLE_TOOLS);
}

export type ToolName = keyof typeof AVAILABLE_TOOLS;

// Re-export individual tools
export { webSearchTool } from "./web-search";
