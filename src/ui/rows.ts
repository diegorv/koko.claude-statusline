// Layout compositor — emits one row per semantic category so each line is
// visually self-contained (git, rate limits, tools, agents, todos).

import type { AgentSnapshot } from "../core/snapshot.ts"
import type { WorkspaceSnapshot } from "../core/workspace.ts"
import { SEP, GAP, ICONS } from "./constants.ts"
import { c } from "./format.ts"
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
  renderSessionDiff,
} from "./components/index.ts"

export interface RenderResult {
  /** One row per session category (git+workspace, rate limits). */
  session: string[]
  /** One row per activity category (tools, agents, todos). */
  activity: string[]
  /** Right-side header content (config counts + session name). */
  activityTitle: string
  /** /effort chip for the header; null when the level is unset. */
  effort: string | null
  /** Agent-owned annotations displayed in the shared header. */
  headerBadges?: string[]
}

/**
 * Per-domain gutters. Each body row starts with a colored Nerd Font icon that
 * marks its domain — git (branch), consumption (gauge), tools (cog), agents
 * (rocket). The icon replaces the previous neutral `│` so the row is
 * self-labeling: a glance at the gutter is enough to know what's on the line.
 */
const GUTTERS = {
  git:         c("green",   ICONS.branch) + "  ",
  consumption: c("yellow",  ICONS.gauge)  + "  ",
  tools:       c("cyan",    ICONS.tools)  + "  ",
  agents:      c("magenta", ICONS.agents) + "  ",
}

/**
 * Composes status line rows. Each emitted row is a complete, standalone line —
 * the renderer prints them in order without further joining.
 *
 * @param snapshot - Normalized data and annotations from the selected agent.
 * @param workspace - Git and Worktrunk data from the active host.

 */
export function composeRows(
  snapshot: AgentSnapshot,
  { git, worktrunk }: WorkspaceSnapshot,
): RenderResult {
  const { data, config, activity: transcript, skipPermissions, headerAnnotations } = snapshot
  const session: string[] = []

  // Row 1 (git, green): branch / dirty / stats / ahead-behind / SHA / fork +
  // workspace context (worktree, vim mode). The +/- session diff lives on
  // the consumption row instead, since it's a session-output tally.
  const gitRowParts: string[] = []
  if (git) {
    const gitStr = renderGitStatus(git, worktrunk)
    if (gitStr) gitRowParts.push(gitStr)
  }
  gitRowParts.push(...renderWorkspaceInfo(data, git?.worktree))
  if (gitRowParts.length > 0) session.push(GUTTERS.git + gitRowParts.join(SEP))

  // Row 2 (consumption, yellow): rate limits → tok/s → +/- → tokens.
  // Ordered most-stable to most-variable in character width so the items the
  // eye anchors on (rate limits with fixed-shape bars/countdowns) don't shift
  // horizontally as token totals and session diff grow over the session.
  // Wrap logic in lines.ts splits at SEP boundaries when the row exceeds
  // terminal width.
  const consumptionParts: string[] = []
  for (const limit of data.rateLimits) consumptionParts.push(renderRateLimit(limit.label, limit))
  const outputSpeed = transcript ? renderOutputSpeed(transcript.assistantSamples) : null
  if (outputSpeed) consumptionParts.push(outputSpeed)
  const sessionDiff = renderSessionDiff(data)
  if (sessionDiff) consumptionParts.push(sessionDiff)
  const tokenBreakdown = transcript ? renderTokenBreakdown(transcript.tokenTotals) : null
  if (tokenBreakdown) consumptionParts.push(tokenBreakdown)
  if (consumptionParts.length > 0) session.push(GUTTERS.consumption + consumptionParts.join(SEP))

  const activity: string[] = []
  if (data.state) activity.push(GUTTERS.tools + data.state)

  if (transcript) {
    // Row 3 (tools, cyan): running with spinner + completed with counts.
    const toolParts = [
      ...renderRunningTools(transcript.runningTools),
      ...renderCompletedTools(transcript.tools),
      ...(transcript.failedTools ? renderCompletedTools(transcript.failedTools, 5, "error") : []),
    ]
    if (toolParts.length > 0) activity.push(GUTTERS.tools + toolParts.join(GAP))

    // Row 4 (agents, magenta): agent execution + todo progress share the
    // domain "ongoing work" — both surface state of in-flight or recent work.
    const agentParts = renderAgents(transcript.agents)
    if (agentParts.length > 0) activity.push(GUTTERS.agents + agentParts.join(GAP))

    const todoLine = renderTodos(transcript.todos)
    if (todoLine) activity.push(GUTTERS.agents + todoLine)
  }

  const activityTitle = renderActivityTitle(config, transcript?.mcpStatus ?? null, data.sessionName, data.outputStyle, skipPermissions)
  const effort = renderEffort(data.effortLevel)

  const headerBadges = headerAnnotations.map(({ color, parts }) => parts.map(text => c(color, text)).join(" "))
  return { session, activity, activityTitle, effort, headerBadges }
}
