// AI streaming module with tool support
import {
  stepCountIs,
  streamText,
  type UIMessageChunk,
  type Tool,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ModelConfig, UsageData } from "./types";

export interface StreamOptions {
  model: string;
  prompt: string;
  abortSignal?: AbortSignal;
  tools?: Record<string, Tool>;
  config?: ModelConfig;
}

export interface StreamResult {
  stream: ReadableStream<UIMessageChunk>;
  getUsage: () => Promise<UsageData | undefined>;
  getFinishReason: () => Promise<string | undefined>;
}

export function createAssistantUIMessageStream(
  options: StreamOptions
): StreamResult {
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

  return {
    stream: result.toUIMessageStream(),
    getUsage: async () => {
      try {
        const usage = await result.usage;
        return {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          inputTokenDetails: usage.inputTokenDetails ? {
            cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
            cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
          } : undefined,
          outputTokenDetails: usage.outputTokenDetails ? {
            reasoningTokens: usage.outputTokenDetails.reasoningTokens,
          } : undefined,
        };
      } catch {
        return undefined;
      }
    },
    getFinishReason: async () => {
      try {
        return await result.finishReason;
      } catch {
        return undefined;
      }
    },
  };
}
