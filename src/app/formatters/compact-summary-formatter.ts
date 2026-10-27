import type { I18nKey } from "../../i18n/en.js";
import { t } from "../../i18n/index.js";
import type { ToolInfo } from "../managers/summary-aggregation-manager.js";

/** What one finished call adds to a compact card's summary, by OpenCode's low-verbosity categories. */
export interface ToolCallCounts {
  commands: number;
  edits: number;
  reads: number;
  tools: number;
}

const EDIT_TOOLS = new Set(["edit", "write", "apply_patch"]);
// Marks the line as the bot's own note rather than the agent's reply, after the ⏳ of the working card.
const FINISHED_ICON = "✅";

export function emptyToolCallCounts(): ToolCallCounts {
  return { commands: 0, edits: 0, reads: 0, tools: 0 };
}

/** Finished nested calls of a Code Mode `execute`, as OpenCode reports them in its metadata. */
function getFinishedExecuteCalls(metadata: ToolInfo["metadata"]): string[] {
  const calls = metadata?.toolCalls;
  if (!Array.isArray(calls)) {
    return [];
  }

  return calls.flatMap((call: unknown) => {
    if (typeof call !== "object" || call === null) {
      return [];
    }

    const { tool, status } = call as { tool?: unknown; status?: unknown };
    return typeof tool === "string" && (status === "completed" || status === "error") ? [tool] : [];
  });
}

export function countToolCall(toolInfo: Pick<ToolInfo, "tool" | "metadata">): ToolCallCounts {
  const counts = emptyToolCallCounts();
  const { tool } = toolInfo;

  if (tool === "question") {
    return counts;
  }

  if (tool === "execute") {
    const nested = getFinishedExecuteCalls(toolInfo.metadata);
    if (nested.length === 0) {
      counts.tools = 1;
    }
    for (const nestedTool of nested) {
      if (nestedTool === "read") {
        counts.reads++;
      } else {
        counts.tools++;
      }
    }
    return counts;
  }

  if (tool === "bash") {
    counts.commands = 1;
  } else if (EDIT_TOOLS.has(tool)) {
    counts.edits = 1;
  } else if (tool === "read") {
    counts.reads = 1;
  } else {
    counts.tools = 1;
  }
  return counts;
}

/** The finished card's line: non-zero counts in fixed order, or "" when there is nothing to show. */
export function formatCompactSummary(counts: ToolCallCounts, changedFiles: number): string {
  const entries: Array<[I18nKey, number]> = [
    ["progress.compact.count.commands", counts.commands],
    ["progress.compact.count.edits", counts.edits],
    ["progress.compact.count.reads", counts.reads],
    ["progress.compact.count.tools", counts.tools],
    ["progress.compact.count.changed_files", changedFiles],
  ];

  const line = entries
    .filter(([, count]) => count > 0)
    .map(([key, count]) => t(key, { count }))
    .join(", ");

  return line ? `${FINISHED_ICON} ${line}` : "";
}
