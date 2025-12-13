import { streamText, type UIMessageChunk } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function createAssistantUIMessageStream(options: {
  model: string;
  prompt: string;
  abortSignal?: AbortSignal;
}): ReadableStream<UIMessageChunk> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(options.model),
    prompt: options.prompt,
    abortSignal: options.abortSignal,
    onError: ({ error }) => {
      console.error(error);
    },
  });
  return result.toUIMessageStream();
}
