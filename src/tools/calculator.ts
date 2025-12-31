// Calculator tool for testing model tool-use capabilities
import { z } from "zod";
import { tool } from "ai";

export const calculatorTool = tool({
  description:
    "Evaluate a mathematical expression. Supports basic arithmetic: +, -, *, /, parentheses, and common functions like sqrt, pow, abs, sin, cos, tan, log, exp, floor, ceil, round.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5', 'sqrt(16)')"
      ),
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      // Define safe math functions
      const mathFunctions: Record<string, (...args: number[]) => number> = {
        sqrt: Math.sqrt,
        pow: Math.pow,
        abs: Math.abs,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log,
        log10: Math.log10,
        exp: Math.exp,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,
        min: Math.min,
        max: Math.max,
      };

      // Replace function names for evaluation
      let sanitized = expression
        .replace(/\^/g, "**") // Support ^ for exponentiation
        .replace(/PI/gi, "(" + Math.PI + ")")
        .replace(/E(?![xp])/gi, "(" + Math.E + ")");

      // Create safe evaluator with math functions
      const fn = new Function(
        ...Object.keys(mathFunctions),
        `"use strict"; return (${sanitized});`
      );

      const result = fn(...Object.values(mathFunctions));

      if (typeof result !== "number" || !isFinite(result)) {
        throw new Error("Result is not a valid number");
      }

      return {
        expression,
        result: Number(result),
        success: true,
      };
    } catch (error) {
      return {
        expression,
        error: `Failed to evaluate: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        success: false,
      };
    }
  },
});
