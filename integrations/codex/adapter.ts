import type { EffortLevel } from "../../src/core/model.ts"
import type { AgentSnapshot } from "../../src/core/snapshot.ts"

export function object(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function effort(value: unknown): EffortLevel | null {
  switch (value) {
    case "none": case "minimal": case "low": case "medium": case "high": case "xhigh": case "max":
      return value
    default: return null
  }
}

/** Each read describes the displayed thread, even when two threads share a cwd. */
export function mapCodexSnapshot(state: unknown): AgentSnapshot {
  const thread = object(object(state)?.thread)
  const model = object(thread?.model)
  return {
    data: {
      agent: "codex",
      model: text(model?.display_name) ?? text(model?.id) ?? "",
      effortLevel: effort(model?.reasoning_level),
      state: text(object(thread?.agent)?.state),
      sessionId: text(thread?.id),
      sessionName: text(thread?.name),
      cwd: text(object(thread?.workspace)?.cwd) ?? "",
      contextPercent: null,
      contextTokens: null,
      contextWindowSize: null,
      cost: null,
      costEstimated: null,
      durationMs: null,
      linesAdded: null,
      linesRemoved: null,
      rateLimits: [],
      vimMode: null,
      worktree: null,
      outputStyle: null,
    },
    activity: null,
    config: null,
    skipPermissions: false,
    headerAnnotations: [],
  }
}
