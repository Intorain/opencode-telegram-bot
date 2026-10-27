import { afterEach, describe, expect, it } from "vitest";
import {
  countToolCall,
  emptyToolCallCounts,
  formatCompactSummary,
} from "../../../src/app/formatters/compact-summary-formatter.js";
import { resetRuntimeLocale, setRuntimeLocale } from "../../../src/i18n/index.js";

describe("app/formatters/compact-summary-formatter", () => {
  afterEach(() => {
    resetRuntimeLocale();
  });

  describe("countToolCall", () => {
    it.each([
      ["bash", { commands: 1, edits: 0, reads: 0, tools: 0 }],
      ["edit", { commands: 0, edits: 1, reads: 0, tools: 0 }],
      ["write", { commands: 0, edits: 1, reads: 0, tools: 0 }],
      ["apply_patch", { commands: 0, edits: 1, reads: 0, tools: 0 }],
      ["read", { commands: 0, edits: 0, reads: 1, tools: 0 }],
      ["grep", { commands: 0, edits: 0, reads: 0, tools: 1 }],
      ["webfetch", { commands: 0, edits: 0, reads: 0, tools: 1 }],
      ["task", { commands: 0, edits: 0, reads: 0, tools: 1 }],
      ["question", { commands: 0, edits: 0, reads: 0, tools: 0 }],
    ])("counts %s", (tool, expected) => {
      expect(countToolCall({ tool, metadata: undefined })).toEqual(expected);
    });

    it("counts the finished nested calls of an execute", () => {
      const metadata = {
        toolCalls: [
          { tool: "read", status: "completed" },
          { tool: "bash", status: "error" },
          { tool: "grep", status: "running" },
          { tool: "edit" },
          "garbage",
        ],
      };

      expect(countToolCall({ tool: "execute", metadata })).toEqual({
        commands: 0,
        edits: 0,
        reads: 1,
        tools: 1,
      });
    });

    it("counts an execute without finished nested calls as one tool", () => {
      expect(countToolCall({ tool: "execute", metadata: undefined })).toEqual({
        commands: 0,
        edits: 0,
        reads: 0,
        tools: 1,
      });
      expect(
        countToolCall({
          tool: "execute",
          metadata: { toolCalls: [{ tool: "read", status: "running" }] },
        }),
      ).toEqual({ commands: 0, edits: 0, reads: 0, tools: 1 });
    });
  });

  describe("formatCompactSummary", () => {
    it("lists non-zero counts in a fixed order", () => {
      expect(formatCompactSummary({ commands: 3, edits: 1, reads: 4, tools: 2 }, 2)).toBe(
        "✅ commands: 3, edits: 1, reads: 4, tools: 2, changed files: 2",
      );
    });

    it("leaves out zero counts", () => {
      expect(formatCompactSummary({ commands: 0, edits: 0, reads: 6, tools: 0 }, 1)).toBe(
        "✅ reads: 6, changed files: 1",
      );
    });

    it("is empty when there is nothing to count", () => {
      expect(formatCompactSummary(emptyToolCallCounts(), 0)).toBe("");
    });

    it("uses the active locale", () => {
      setRuntimeLocale("ru");

      expect(formatCompactSummary({ commands: 3, edits: 0, reads: 1, tools: 0 }, 0)).toBe(
        "✅ команды: 3, чтения: 1",
      );
    });
  });
});
