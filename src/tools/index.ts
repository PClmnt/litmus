// Tool registry - exports all available tools
import { calculatorTool } from "./calculator";
import { webSearchTool } from "./web-search";
import { codeExecutorTool } from "./code-executor";
import type { Tool, ToolSet } from "ai";

export const AVAILABLE_TOOLS: Record<string, Tool> = {
  calculator: calculatorTool,
  webSearch: webSearchTool,
  codeExecutor: codeExecutorTool,
};

export const TOOL_DESCRIPTIONS: Record<
  string,
  { name: string; description: string }
> = {
  calculator: {
    name: "Calculator",
    description: "Evaluate mathematical expressions",
  },
  webSearch: {
    name: "Web Search",
    description: "Search for information (mock)",
  },
  codeExecutor: {
    name: "Code Executor",
    description: "Run JavaScript code",
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
export { calculatorTool } from "./calculator";
export { webSearchTool } from "./web-search";
export { codeExecutorTool } from "./code-executor";
