// Shared data consumed by renderers and exporters. Provider formats stay in adapters.
export type AgentId = "claude" | "antigravity" | "opencode" | "codex"
export type EffortLevel = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"

export interface RateLimit {
  label: string
  /** Source bucket and rolling duration when the host identifies the window. */
  limitId?: string
  windowMinutes?: number | null
  /** Percentage used; null for buckets that report only an absolute balance. */
  pct: number | null
  /** Unix timestamp in seconds. Legacy adapters use zero for an unknown reset. */
  resetsAt: number | null
  remaining: number | null
  disabled: boolean
}

export interface ConfigSummary {
  instructionFiles: { name: string; count: number }[]
  rules: number
  mcps: number
  hooks: number
}

export interface SessionData {
  agent: AgentId
  effortLevel: EffortLevel | null
  /** null when the host does not report estimate metadata. */
  costEstimated: boolean | null
  state: string | null
  model: string
  contextPercent: number | null
  /**
   * Host-reported context occupancy. Claude counts input and cache; OpenCode
   * also counts output and reasoning. Null when occupancy is unknown.
   */
  contextTokens: number | null
  cost: number | null
  durationMs: number | null
  linesAdded: number | null
  linesRemoved: number | null
  cwd: string
  contextWindowSize: number | null
  sessionName: string | null
  /** Provider conversation ID; Claude falls back to its transcript filename. */
  sessionId: string | null
  rateLimits: RateLimit[]
  vimMode: string | null
  worktree: string | null
  /**
   * Output style preset name (e.g. "explanatory", "succinct"). `null` when
   * unset; `"default"` when the user is on the built-in style — the renderer
   * may choose to hide that case to keep the header uncluttered.
   */
  outputStyle: string | null
}

export interface AgentInfo {
  type: string
  description: string
  running: boolean
  /** Absent for legacy hosts that report only running/completed. */
  outcome?: "succeeded" | "failed" | "interrupted" | "unknown"
  elapsed: number | null // ms; null when the provider does not report timing
}

export interface RunningTool {
  name: string
  target: string
}

export interface McpStatus {
  ok: Set<string>      // successful Claude calls or connected OpenCode servers
  errored: Set<string> // servers with at least one error
}

/** Cumulative session counters. A null category has no observation. */
export interface TokenTotals {
  input: number | null
  output: number | null
  cacheCreate: number | null
  cacheRead: number | null
}

/**
 * One sample point from an assistant turn — used by the output-speed widget
 * to compute Δtokens/Δtime across the tail of a sliding window.
 * `output` is the session-cumulative output token count at this point.
 */
export interface AssistantSample {
  t: number       // ms epoch (timestamp of the assistant turn)
  output: number  // cumulative session output tokens at this sample
}

export interface ActivityData {
  tools: Map<string, number>  // name → completed count
  /** Separate failures when the host reports tool outcomes. */
  failedTools?: Map<string, number>
  runningTools: RunningTool[]  // currently running tools
  agents: AgentInfo[]
  todos: { total: number; completed: number; current: string | null }
  mcpStatus: McpStatus
  /** Wall-clock time of the most recent assistant message, in ms epoch. Null if no assistant turns seen. */
  lastAssistantTimestamp: number | null
  /** Up to 16 most recent assistant samples (for output-speed rate math). Oldest first. */
  assistantSamples: AssistantSample[]
}

