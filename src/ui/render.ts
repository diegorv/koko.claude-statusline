// Layout compositor — assembles section components into session + activity boxes

import type { StdinData } from "../parsing/stdin"
import type { GitInfo } from "../collection/git"
import type { ConfigCounts } from "../collection/config"
import type { TranscriptData } from "../parsing/transcript"
import { SEP, GAP } from "./constants"
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
  session: string[]
  activity: string[]
  activityTitle: string
}

/**
 * Composes the full render output for the two status boxes (session + activity).
 * Delegates to individual component renderers and joins their output.
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
