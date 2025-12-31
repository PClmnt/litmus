// Code executor tool for testing model tool-use capabilities
import { z } from "zod";
import { tool } from "ai";

export const codeExecutorTool = tool({
  description:
    "Execute JavaScript code in a sandboxed environment. Returns the result of the last expression or console output. Useful for calculations, data transformations, and testing code snippets.",
  inputSchema: z.object({
    code: z.string().describe("JavaScript code to execute"),
    timeout: z
      .number()
      .optional()
      .default(5000)
      .describe(
        "Execution timeout in milliseconds (default: 5000, max: 10000)"
      ),
  }),
  execute: async ({
    code,
    timeout = 5000,
  }: {
    code: string;
    timeout?: number;
  }) => {
    const logs: string[] = [];
    let result: unknown;
    const startTime = Date.now();
    const maxTimeout = Math.min(timeout, 10000); // Cap at 10 seconds

    try {
      // Create sandboxed console
      const sandboxConsole = {
        log: (...args: unknown[]) =>
          logs.push(args.map((a) => formatValue(a)).join(" ")),
        error: (...args: unknown[]) =>
          logs.push(`[ERROR] ${args.map((a) => formatValue(a)).join(" ")}`),
        warn: (...args: unknown[]) =>
          logs.push(`[WARN] ${args.map((a) => formatValue(a)).join(" ")}`),
        info: (...args: unknown[]) =>
          logs.push(`[INFO] ${args.map((a) => formatValue(a)).join(" ")}`),
      };

      // Restricted globals for sandbox
      const sandbox = {
        console: sandboxConsole,
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Symbol,
        BigInt,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURI,
        decodeURI,
        encodeURIComponent,
        decodeURIComponent,
        setTimeout: undefined,
        setInterval: undefined,
        fetch: undefined,
        require: undefined,
        process: undefined,
        Bun: undefined,
      };

      // Execute with timeout
      const executeWithTimeout = async (): Promise<unknown> => {
        const wrappedCode = `
          "use strict";
          let __result__;
          try {
            __result__ = (function() {
              ${code}
            })();
          } catch (e) {
            throw e;
          }
          __result__;
        `;

        const fn = new Function(...Object.keys(sandbox), wrappedCode);
        return fn(...Object.values(sandbox));
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timeout (${maxTimeout}ms)`)),
          maxTimeout
        )
      );

      result = await Promise.race([executeWithTimeout(), timeoutPromise]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: result !== undefined ? formatValue(result) : undefined,
        logs,
        executionTime: `${executionTime}ms`,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs,
        executionTime: `${executionTime}ms`,
      };
    }
  },
});

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "bigint") return `${value}n`;
  if (Array.isArray(value)) {
    if (value.length > 10) {
      return `[${value.slice(0, 10).map(formatValue).join(", ")}, ... (${
        value.length
      } items)]`;
    }
    return `[${value.map(formatValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value, null, 2);
      if (str.length > 500) {
        return str.slice(0, 500) + "... (truncated)";
      }
      return str;
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}
