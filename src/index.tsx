import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { readUIMessageStream, type UIMessageChunk } from "ai";
import { useEffect, useState } from "react";

import { createAssistantUIMessageStream } from "./ai";

interface Prompt {
  id: number;
  prompt: string;
  model: string;
  output: string;
}

function App() {
  const InitialPrompt: Prompt = {
    id: 1,
    prompt: "Write a short story about a cat",
    model: "x-ai/grok-4.1-fast",
    output: "",
  };
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([InitialPrompt]);

  async function handleStream(prompt?: Prompt) {
    if (!prompt) return;
    const controller = new AbortController();
    setStatus("streaming");

    try {
      const stream = createAssistantUIMessageStream({
        prompt: prompt.prompt,
        abortSignal: controller.signal,
        model: prompt.model,
      });

      for await (const uiMessage of readUIMessageStream({
        stream,
        onError: (err) => {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        },
        terminateOnError: true,
      })) {
        if (controller.signal.aborted) return;

        const text = uiMessage.parts
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((part) => part.text)
          .join("");
        setPrompts((prev) =>
          prev.map((p) => (p.id === prompt.id ? { ...p, output: text } : p))
        );
      }

      setStatus((prev) => (prev === "error" ? prev : "done"));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  useEffect(() => {
    (async () => {
      await handleStream(prompts[0]);
    })();
  }, []);

  return (
    <box alignItems="center" flexGrow={1}>
      <box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        gap={1}
      >
        <ascii-font font="tiny" text="TUI Bench" />
        <text attributes={TextAttributes.DIM}>
          {status === "streaming"
            ? "Streaming…"
            : status === "done"
            ? "Done"
            : status === "error"
            ? "Error"
            : "Idle"}
        </text>
        <box flexDirection="row" gap={1}>
          {prompts.map((box, index) => (
            <box
              key={index}
              padding={1}
              borderStyle="rounded"
              width={30}
              height={30}
            >
              <text alignItems="center" justifyContent="center" wrapMode="word">
                {box.output}
              </text>
            </box>
          ))}
        </box>
      </box>
    </box>
  );
}

const renderer = await createCliRenderer();

renderer.console.toggle();

createRoot(renderer).render(<App />);
