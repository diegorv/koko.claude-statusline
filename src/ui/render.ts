// Layout compositor — emits one row per semantic category so each line is
// visually self-contained (git, rate limits, tools, agents, todos).

import type { StdinData } from "../parsing/stdin"
import type { GitInfo } from "../collection/git"
import type { ConfigCounts } from "../collection/config"
import type { TranscriptData } from "../parsing/transcript"
import { SEP, GAP } from "./constants"
import { c } from "./format"
import {
  renderGitStatus,
  renderWorkspaceInfo,
  renderRateLimit,
  renderRunningTools,
  renderCompletedTools,
  renderAgents,
  renderTodos,
  renderActivityTitle,
} from "./components"

export interface RenderResult {
  /** One row per session category (git+workspace, rate limits). */
  session: string[]
  /** One row per activity category (tools, agents, todos). */
  activity: string[]
  /** Right-side header content (config counts + session name). */
  activityTitle: string
}

/** A colored left "gutter" anchors each row visually so categories don't blur together. */
const GUTTER_CHAR = "▎"
const gutter = (color: string) => c(color, GUTTER_CHAR) + " "

const GUTTER = {
  git: gutter("green"),
  rateLimit: gutter("yellow"),
  tools: gutter("cyan"),
  agents: gutter("magenta"),
  todos: gutter("yellow"),
} as const

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
  if (gitRowParts.length > 0) session.push(GUTTER.git + gitRowParts.join(SEP))

  // Row: rate limits (5h and 7d on the same row — they're conceptually paired).
  const rateLimitParts: string[] = []
  if (data.rateLimit5h) rateLimitParts.push(renderRateLimit("5h", data.rateLimit5h))
  if (data.rateLimit7d) rateLimitParts.push(renderRateLimit("7d", data.rateLimit7d))
  if (rateLimitParts.length > 0) session.push(GUTTER.rateLimit + rateLimitParts.join(SEP))

  const activity: string[] = []

  if (transcript) {
    // Row: tools (running with spinner + completed with counts).
    const toolParts = [
      ...renderRunningTools(transcript.runningTools),
      ...renderCompletedTools(transcript.tools),
    ]
    if (toolParts.length > 0) activity.push(GUTTER.tools + toolParts.join(GAP))

    // Row: agents.
    const agentParts = renderAgents(transcript.agents)
    if (agentParts.length > 0) activity.push(GUTTER.agents + agentParts.join(GAP))

    // Row: todos.
    const todoLine = renderTodos(transcript.todos)
    if (todoLine) activity.push(GUTTER.todos + todoLine)
  }

  const activityTitle = renderActivityTitle(config, transcript?.mcpStatus ?? null, data.sessionName)

  return { session, activity, activityTitle }
}
