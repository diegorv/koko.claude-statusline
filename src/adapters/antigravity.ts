// Documented CLI payload: https://antigravity.google/docs/cli/statusline/
// Do not feed its transcript path into the Claude-specific JSONL parser.
import type { ActivityData, EffortLevel, RateLimit, SessionData } from "../model.ts"
import type { AgentAdapter } from "./types.ts"

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value.replace(/[\x00-\x1f\x7f]/g, "") : null
}

function effort(value: unknown): EffortLevel | null {
  switch (value) {
    case "low": case "medium": case "high": case "xhigh": case "max": return value
    default: return null
  }
}

function quotaLimits(raw: unknown, now: number): RateLimit[] {
  return Object.entries(object(raw)).flatMap(([id, value]) => {
    const bucket = object(value)
    const fraction = number(bucket.remaining_fraction)
    const remaining = number(bucket.remaining_amount)
    const disabled = bucket.disabled === true
    if (fraction === null && remaining === null && !disabled) return []
    const reset = typeof bucket.reset_time === "string" ? Date.parse(bucket.reset_time) : NaN
    const seconds = number(bucket.reset_in_seconds)
    return [{
      label: text(id) ?? id,
      pct: fraction === null ? null : Math.round((1 - Math.min(1, fraction)) * 100),
      resetsAt: Number.isFinite(reset) ? Math.floor(reset / 1000)
        : seconds !== null ? Math.floor(now / 1000 + seconds) : 0,
      remaining,
      disabled,
    }]
  })
}

export function mapAntigravityInput(raw: Record<string, unknown>, now = Date.now()): SessionData {
  const model = object(raw.model)
  const context = object(raw.context_window)
  const cost = object(raw.cost)
  const width = number(raw.terminal_width)
  return {
    agent: "antigravity",
    model: text(model.display_name) ?? text(model.id) ?? "Unknown",
    modelId: text(model.id) ?? "",
    effortLevel: effort(model.effort),
    terminalWidth: width !== null && width >= 1 ? Math.floor(width) : null,
    rightMargin: 0,
    state: text(raw.agent_state),
    contextPercent: Math.min(100, number(context.used_percentage) ?? 0),
    // current_usage is not documented as occupied context and can contradict
    // used_percentage. Keep the native percentage; do not invent a token count.
    contextTokens: null,
    contextWindowSize: number(context.context_window_size) || null,
    cost: number(cost.total_usd),
    costEstimated: cost.estimated !== false,
    durationMs: null,
    linesAdded: null,
    linesRemoved: null,
    cwd: text(object(raw.workspace).current_dir) ?? text(raw.cwd) ?? "",
    sessionName: text(raw.conversation_title),
    sessionId: text(raw.conversation_id) || text(raw.session_id) || null,
    rateLimits: quotaLimits(raw.quota, now),
    vimMode: text(object(raw.vim).mode),
    worktree: null,
    transcriptPath: text(raw.transcript_path),
    outputStyle: null,
  }
}

function readActivity(raw: Record<string, unknown>): ActivityData {
  const context = object(raw.context_window)
  const subagents = Array.isArray(raw.subagents) ? raw.subagents : []
  return {
    tools: new Map(),
    runningTools: [],
    agents: subagents.flatMap(value => {
      const agent = object(value)
      if (agent.status !== "running" && agent.status !== "completed") return []
      return [{
        type: text(agent.name) ?? text(agent.role) ?? "agent",
        description: text(agent.role) ?? "",
        running: agent.status === "running",
        elapsed: null,
      }]
    }),
    todos: { total: 0, completed: 0, current: null },
    mcpStatus: { ok: new Set(), errored: new Set() },
    lastAssistantTimestamp: null,
    tokenTotals: {
      input: number(context.total_input_tokens) ?? 0,
      output: number(context.total_output_tokens) ?? 0,
      // Only aggregate input/output counts are documented, not cache totals.
      cacheCreate: 0,
      cacheRead: 0,
    },
    assistantSamples: [],
  }
}

export const antigravityAdapter: AgentAdapter = {
  id: "antigravity",
  read(raw) {
    return {
      data: mapAntigravityInput(raw),
      activity: readActivity(raw),
      config: null,
      skipPermissions: false,
      caveman: null,
    }
  },
}
