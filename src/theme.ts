// Everforest Dark Medium Color Theme
// Based on https://github.com/sainnhe/everforest

export const theme = {
  // Background colors (dark medium)
  bg: {
    dim: "#232A2E",      // Dimmed background
    base: "#2D353B",     // Default background
    surface: "#343F44",  // Cursor line, panels
    elevated: "#3D484D", // Popup, floating windows
    muted: "#475258",    // List chars, inactive tabs
    subtle: "#4F585E",   // Separators
    
    // Semantic backgrounds
    visual: "#543A48",   // Visual selection
    red: "#514045",      // Error highlights, diff deleted
    yellow: "#4D4C43",   // Warning highlights
    green: "#425047",    // Success highlights, diff added
    blue: "#3A515D",     // Info highlights, diff changed
    purple: "#4A444E",   // Special highlights
  },

  // Foreground colors
  fg: {
    default: "#D3C6AA",  // Default text
    muted: "#9DA9A0",    // Secondary text, cursor line number
    subtle: "#859289",   // Comments, disabled
    faint: "#7A8478",    // Line numbers, UI elements
  },

  // Accent colors
  accent: {
    red: "#E67E80",      // Errors, keywords, deletions
    orange: "#E69875",   // Operators, labels, titles
    yellow: "#DBBC7F",   // Types, warnings
    green: "#A7C080",    // Success, functions, strings
    aqua: "#83C092",     // Constants, macros
    blue: "#7FBBB3",     // Identifiers, info
    purple: "#D699B6",   // Numbers, booleans
  },

  // Status colors (mapped from accents for semantic use)
  status: {
    success: "#A7C080",  // green
    warning: "#DBBC7F",  // yellow
    error: "#E67E80",    // red
    info: "#7FBBB3",     // blue
    loading: "#E69875",  // orange
  },

  // UI-specific colors
  ui: {
    border: "#3D484D",          // Default borders - softer/more subtle
    borderFocused: "#5C6A72",   // Focused element borders - subtle highlight
    borderActive: "#7A8478",    // Active/selected borders - muted
    
    selection: "#3D484D",       // Selected item background - subtle
    highlight: "#343F44",       // Hover/focus background - minimal
  },
} as const;

// Helper to get status color based on status string
export function getStatusColor(status: "idle" | "streaming" | "done" | "error"): string {
  switch (status) {
    case "streaming":
      return theme.status.loading;
    case "done":
      return theme.status.success;
    case "error":
      return theme.status.error;
    default:
      return theme.fg.faint;
  }
}
