// AI streaming module with tool support
import {
  stepCountIs,
  streamText,
  type UIMessageChunk,
  type Tool,
  wrapLanguageModel,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ModelConfig } from "./types";

export interface StreamOptions {
  model: string;
  prompt: string;
  abortSignal?: AbortSignal;
  tools?: Record<string, Tool>;
  config?: ModelConfig;
}

export function createAssistantUIMessageStream(
  options: StreamOptions
): ReadableStream<UIMessageChunk> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(options.model),
    prompt: options.prompt,
    abortSignal: options.abortSignal,
    tools: options.tools,
    toolChoice: options.tools ? "auto" : "none",
    stopWhen: options.tools ? stepCountIs(5) : undefined,
    temperature: options.config?.temperature ?? 0.7,
    maxOutputTokens: options.config?.maxTokens ?? 2048,
    onError: ({ error }) => {
      console.error(error);
    },
  });

  return result.toUIMessageStream();
}
