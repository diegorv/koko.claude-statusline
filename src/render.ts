// Layout composition — 2 boxes: session + activity

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
import type { TranscriptData, AgentInfo, RunningTool, McpStatus } from "./transcript"
import { c, dim, gradientBar, pctColor, formatResetIn, formatDuration, RESET } from "./format"

const I = {
  branch: "\ue0a0",  //
  gauge:  "\uf0e4",  //
  tree:   "\uf1bb",  //
} as const

const GAP = "   "
const SEP = dim("  │  ")

const SPINNER = ["◐", "◓", "◑", "◒"]

function spin(): string {
  return SPINNER[Math.floor(Date.now() / 300) % SPINNER.length]
}

// ── Exported section renderers ──────────────────────────────────────

/**
 * Renders git branch and working tree status as a formatted string.
 * Includes branch name, dirty indicator, staged/modified/untracked counts, and ahead/behind.
 * @param git - Git repository information.
 * @returns Formatted git status string, or empty string if no repo.
 */
export function renderGitStatus(git: GitInfo): string {
  if (!git.repo) return ""

  let str = `${c("green", `${I.branch} ${git.branch}`)}`
  if (git.dirty) str += c("yellow", "*")

  const stats: string[] = []
  if (git.staged > 0)    stats.push(c("green", `+${git.staged}`))
  if (git.modified > 0)  stats.push(c("yellow", `~${git.modified}`))
  if (git.untracked > 0) stats.push(dim(`?${git.untracked}`))
  if (stats.length > 0) str += `  ${stats.join(" ")}`

  const sync: string[] = []
  if (git.ahead > 0)  sync.push(c("green", `↑${git.ahead}`))
  if (git.behind > 0) sync.push(c("red", `↓${git.behind}`))
  if (sync.length > 0) str += `  ${sync.join(" ")}`

  return str
}

/**
 * Renders workspace metadata parts: worktree name, file change counts, and vim mode.
 * @param data - Parsed stdin data with workspace info.
 * @returns Array of formatted string parts (may be empty).
 */
export function renderWorkspaceInfo(data: StdinData): string[] {
  const parts: string[] = []
  if (data.worktree) parts.push(c("magenta", `${I.tree} ${data.worktree}`))
  if (data.linesAdded > 0 || data.linesRemoved > 0) parts.push(`${c("green", `+${data.linesAdded}`)} ${c("red", `-${data.linesRemoved}`)}`)
  if (data.vimMode) parts.push(dim(data.vimMode))
  return parts
}

/**
 * Renders a single rate limit as a formatted string with gradient bar, percentage, and reset countdown.
 * @param label - Display label for the rate limit (e.g. "5h", "7d").
 * @param rateLimit - Rate limit data with percentage and reset timestamp.
 * @returns Formatted rate limit string.
 */
export function renderRateLimit(label: string, rateLimit: { pct: number; resetsAt: number }): string {
  const prefix = label === "5h" ? `${I.gauge} ` : ""
  let str = `${prefix}${label} ${gradientBar(rateLimit.pct, 8)} ${pctColor(rateLimit.pct)}${rateLimit.pct}%${RESET}`
  const reset = rateLimit.resetsAt ? formatResetIn(rateLimit.resetsAt) : ""
  if (reset) str += dim(` (${reset})`)
  return str
}

/**
 * Renders currently running tools with a spinner animation and optional target info.
 * @param tools - Array of currently running tools.
 * @returns Array of formatted running tool strings.
 */
export function renderRunningTools(tools: RunningTool[]): string[] {
  return tools.map(t => {
    const label = t.target ? `${t.name}: ${t.target}` : t.name
    return `${c("cyan", spin())} ${label}`
  })
}

/**
 * Renders completed tool usage counts, sorted by frequency.
 * @param tools - Map of tool name to completion count (pre-sorted).
 * @param limit - Maximum number of tools to display (default: 5).
 * @returns Array of formatted tool count strings.
 */
export function renderCompletedTools(tools: Map<string, number>, limit = 5): string[] {
  const parts: string[] = []
  let count = 0
  for (const [name, n] of tools) {
    if (count++ >= limit) break
    parts.push(`${c("green", "✓")} ${name} ×${n}`)
  }
  return parts
}

/**
 * Renders agent execution status with spinner (running) or checkmark (completed) and elapsed time.
 * @param agents - Array of agent info objects.
 * @returns Array of formatted agent status strings.
 */
export function renderAgents(agents: AgentInfo[]): string[] {
  return agents.map(agent => {
    const icon = agent.running ? c("cyan", spin()) : c("green", "✓")
    return `${icon} ${agent.type} ${dim(`(${formatDuration(agent.elapsed)})`)}`
  })
}

/**
 * Renders todo progress: current in-progress task or "All complete" message.
 * @param todos - Todo progress data with total, completed count, and current task.
 * @returns Formatted todo progress string, or null if no todos.
 */
export function renderTodos(todos: { total: number; completed: number; current: string | null }): string | null {
  const { total, completed, current } = todos
  if (total <= 0) return null
  if (current) {
    const label = current.length > 35 ? current.slice(0, 32) + "..." : current
    return `${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`
  }
  if (completed === total) {
    return `${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`
  }
  return null
}

/**
 * Renders the activity box title with config counts (CLAUDE.md, MCPs, hooks, rules) and session name.
 * @param config - Configuration counts (may be null).
 * @param mcpStatus - MCP server health status (may be null).
 * @param sessionName - Current session name (may be null).
 * @returns Formatted title string for the activity box right side.
 */
export function renderActivityTitle(config: ConfigCounts | null, mcpStatus: McpStatus | null, sessionName: string | null): string {
  const titleParts: string[] = []
  if (config) {
    if (config.claudeMd > 0) titleParts.push(`${config.claudeMd} CLAUDE.md`)

    const mcpOk = mcpStatus?.ok ?? new Set()
    const mcpErr = mcpStatus?.errored ?? new Set()
    const mcpSeen = new Set([...mcpOk, ...mcpErr])
    const mcpCount = Math.max(config.mcps, mcpSeen.size)
    if (mcpCount > 0) {
      if (mcpErr.size > 0) {
        titleParts.push(c("red", `${mcpCount} MCPs (${mcpErr.size} ✗)`))
      } else if (mcpOk.size > 0) {
        titleParts.push(c("green", `${mcpCount} MCPs ✓`))
      } else {
        titleParts.push(`${mcpCount} MCPs`)
      }
    }
    if (config.hooks > 0) titleParts.push(`${config.hooks} hooks`)
    if (config.rules > 0) titleParts.push(`${config.rules} rules`)
  }
  if (sessionName) titleParts.push(sessionName)
  return titleParts.join(GAP)
}

// ── Main compositor ─────────────────────────────────────────────────

export interface RenderResult {
  session: string[]
  activity: string[]
  activityTitle: string
}

/**
 * Composes the full render output for the two status boxes (session + activity).
 * Delegates to individual section renderers and joins their output.
 * @param data - Parsed stdin data from Claude Code.
 * @param git - Git repository info (null if not in a repo).
 * @param config - Config counts (null if no cwd).
 * @param transcript - Parsed transcript data (null if no transcript).
 * @returns RenderResult with session lines, activity lines, and activity title.
 */
export function render(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): RenderResult {
  // ===== BOX 1: SESSION =====
  const sessionParts: string[] = []

  if (git) {
    const gitStr = renderGitStatus(git)
    if (gitStr) sessionParts.push(gitStr)
  }
  sessionParts.push(...renderWorkspaceInfo(data))
  if (data.rateLimit5h) sessionParts.push(renderRateLimit("5h", data.rateLimit5h))
  if (data.rateLimit7d) sessionParts.push(renderRateLimit("7d", data.rateLimit7d))

  const session: string[] = []
  if (sessionParts.length > 0) session.push(sessionParts.join(SEP))

  // ===== BOX 2: ACTIVITY =====
  const activityParts: string[] = []

  if (transcript) {
    const runningParts = renderRunningTools(transcript.runningTools)
    const completedParts = renderCompletedTools(transcript.tools)
    const allTools = [...runningParts, ...completedParts]
    if (allTools.length > 0) activityParts.push(allTools.join(GAP))

    const agentParts = renderAgents(transcript.agents)
    if (agentParts.length > 0) activityParts.push(agentParts.join(GAP))

    const todoLine = renderTodos(transcript.todos)
    if (todoLine) activityParts.push(todoLine)
  }

  const activity: string[] = []
  if (activityParts.length > 0) activity.push(activityParts.join(SEP))

  const activityTitle = renderActivityTitle(config, transcript?.mcpStatus ?? null, data.sessionName)

  return { session, activity, activityTitle }
}
