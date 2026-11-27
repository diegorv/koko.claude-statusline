import type { EffortLevel, RateLimit } from "../../src/core/model.ts"
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

function observed(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

function windowLabel(minutes: number | null, slot: string): string {
  if (minutes === null) return slot
  if (minutes > 0 && minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes > 0 && minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

function quotaWindows(account: unknown): RateLimit[] {
  const buckets = object(account)?.rate_limits
  if (!Array.isArray(buckets)) return []
  const limits: RateLimit[] = []
  for (const bucket of buckets) {
    const source = object(bucket)
    const limitId = text(source?.limit_id)
    if (!source || !limitId) continue
    const windows: RateLimit[] = []
    for (const slot of ["primary", "secondary"]) {
      const window = object(source[`${slot}_limit`])
      if (!window) continue
      const minutes = observed(window.window_minutes)
      windows.push({
        limitId, windowMinutes: minutes, label: `${limitId} ${windowLabel(minutes, slot)}`,
        pct: observed(window.used_percent), resetsAt: observed(window.resets_at),
        disabled: false, remaining: null,
      })
    }
    // Keep short windows first regardless of which slot the host used.
    windows.sort((a, b) => (a.windowMinutes ?? Infinity) - (b.windowMinutes ?? Infinity))
    limits.push(...windows)
  }
  return limits
}

/** Each read describes the displayed thread, even when two threads share a cwd. */
export function mapCodexSnapshot(state: unknown): AgentSnapshot {
  const snapshot = object(state)
  const thread = object(snapshot?.thread)
  const context = object(object(thread?.usage)?.context)
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
      contextPercent: observed(context?.used_percentage),
      contextTokens: observed(context?.used_tokens),
      contextWindowSize: observed(context?.context_window_size),
      cost: null,
      costEstimated: null,
      durationMs: null,
      linesAdded: null,
      linesRemoved: null,
      rateLimits: quotaWindows(snapshot?.account),
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
