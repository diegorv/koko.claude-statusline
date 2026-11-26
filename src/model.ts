// Shared data consumed by renderers and exporters. Provider formats stay in adapters.
export type AgentId = "claude" | "antigravity"
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max"

export interface RateLimit {
  label: string
  /** Percentage used; null for buckets that report only an absolute balance. */
  pct: number | null
  /** Unix timestamp in seconds; 0 when unknown. */
  resetsAt: number
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
  terminalWidth: number | null
  /** Columns reserved by default for the host CLI's overlays; env overrides win. */
  rightMargin: number
  costEstimated: boolean
  state: string | null
  model: string
  /** The model's id; empty when the provider does not send it. */
  modelId: string
  contextPercent: number
  /**
   * Total tokens currently occupying the context window (input + cache_creation + cache_read),
   * excluding output tokens.
   * `null` before the first API call in a session.
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
  transcriptPath: string | null
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
  elapsed: number | null // ms; null when the provider does not report timing
}

export interface RunningTool {
  name: string
  target: string
}

export interface McpStatus {
  ok: Set<string>      // servers with at least one successful call
  errored: Set<string> // servers with at least one error
}

export interface TokenTotals {
  input: number
  output: number
  cacheCreate: number
  cacheRead: number
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
  runningTools: RunningTool[]  // currently running tools
  agents: AgentInfo[]
  todos: { total: number; completed: number; current: string | null }
  mcpStatus: McpStatus
  /** Wall-clock time of the most recent assistant message, in ms epoch. Null if no assistant turns seen. */
  lastAssistantTimestamp: number | null
  /** Session-level token usage; transcript adapters must deduplicate repeated records. */
  tokenTotals: TokenTotals
  /** Up to 16 most recent assistant samples (for output-speed rate math). Oldest first. */
  assistantSamples: AssistantSample[]
}

