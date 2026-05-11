// Layout compositor — emits one row per semantic category so each line is
// visually self-contained (git, rate limits, tools, agents, todos).

import type { StdinData } from "../parsing/stdin"
import type { GitInfo } from "../collection/git"
import type { ConfigCounts } from "../collection/config"
import type { TranscriptData } from "../parsing/transcript"
import { SEP, GAP, inRuleColor } from "./constants"
import {
  renderGitStatus,
  renderWorkspaceInfo,
  renderRateLimit,
  renderRunningTools,
  renderCompletedTools,
  renderAgents,
  renderTodos,
  renderActivityTitle,
  renderEffort,
  renderTokenBreakdown,
  renderOutputSpeed,
} from "./components"

export interface RenderResult {
  /** One row per session category (git+workspace, rate limits). */
  session: string[]
  /** One row per activity category (tools, agents, todos). */
  activity: string[]
  /** Right-side header content (config counts + session name). */
  activityTitle: string
  /** /effort chip for the header; null when the level is unset. */
  effort: string | null
}

/**
 * Left "gutter" marker shared by every body row. Uses the same mid-gray as the
 * horizontal rule so the whole body reads as a unified block — per-row emphasis
 * lives in the content (branch colors, spinners, etc.), not in this chrome.
 */
const GUTTER = inRuleColor("│") + " "

/**
 * Composes status line rows. Each emitted row is a complete, standalone line —
 * the renderer prints them in order without further joining.
 *
 * @param data - Parsed stdin data from Claude Code.
 * @param git - Git repository info (null if not in a repo).
 * @param config - Config counts (null if no cwd).
 * @param transcript - Parsed transcript data (null if no transcript).
 */
export function render(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): RenderResult {
  const session: string[] = []

  // Row: git + workspace metadata (worktree, line changes, vim mode).
  // Both describe the working tree, so they share a row.
  const gitRowParts: string[] = []
  if (git) {
    const gitStr = renderGitStatus(git)
    if (gitStr) gitRowParts.push(gitStr)
  }
  gitRowParts.push(...renderWorkspaceInfo(data))
  if (gitRowParts.length > 0) session.push(GUTTER + gitRowParts.join(SEP))

  // Row: rate limits + token breakdown + output speed (all session-level
  // consumption). Wrap logic in lines.ts splits at SEP boundaries when the row
  // exceeds terminal width.
  const consumptionParts: string[] = []
  const tokenBreakdown = transcript ? renderTokenBreakdown(transcript.tokenTotals) : null
  if (tokenBreakdown) consumptionParts.push(tokenBreakdown)
  const outputSpeed = transcript ? renderOutputSpeed(transcript.assistantSamples) : null
  if (outputSpeed) consumptionParts.push(outputSpeed)
  if (data.rateLimit5h) consumptionParts.push(renderRateLimit("5h", data.rateLimit5h))
  if (data.rateLimit7d) consumptionParts.push(renderRateLimit("7d", data.rateLimit7d))
  if (consumptionParts.length > 0) session.push(GUTTER + consumptionParts.join(SEP))

  const activity: string[] = []

  if (transcript) {
    // Row: tools (running with spinner + completed with counts).
    const toolParts = [
      ...renderRunningTools(transcript.runningTools),
      ...renderCompletedTools(transcript.tools),
    ]
    if (toolParts.length > 0) activity.push(GUTTER + toolParts.join(GAP))

    // Row: agents.
    const agentParts = renderAgents(transcript.agents)
    if (agentParts.length > 0) activity.push(GUTTER + agentParts.join(GAP))

    // Row: todos.
    const todoLine = renderTodos(transcript.todos)
    if (todoLine) activity.push(GUTTER + todoLine)
  }

  const activityTitle = renderActivityTitle(config, transcript?.mcpStatus ?? null, data.sessionName)
  const effort = renderEffort(config?.effortLevel ?? null)

  return { session, activity, activityTitle, effort }
}
