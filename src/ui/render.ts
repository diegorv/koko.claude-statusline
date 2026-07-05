// Layout compositor — emits one row per semantic category so each line is
// visually self-contained (git, rate limits, tools, agents, todos).

import type { StdinData } from "../parsing/stdin.ts"
import type { GitInfo } from "../collection/git.ts"
import type { ConfigCounts } from "../collection/config.ts"
import type { TranscriptData } from "../parsing/transcript.ts"
import type { CavemanState } from "../collection/caveman.ts"
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
  renderCaveman,
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
  /** caveman chip for the header; null/absent when caveman isn't active/installed. */
  caveman?: string | null
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
 * @param data - Parsed stdin data from Claude Code.
 * @param git - Git repository info (null if not in a repo).
 * @param config - Config counts (null if no cwd).
 * @param transcript - Parsed transcript data (null if no transcript).
 */
export function render(
  data: StdinData,
  git: GitInfo | null,
  config: ConfigCounts | null,
  transcript: TranscriptData | null = null,
  skipPermissions: boolean = false,
  caveman: CavemanState | null = null,
): RenderResult {
  const session: string[] = []

  // Row 1 (git, green): branch / dirty / stats / ahead-behind / SHA / fork +
  // workspace context (worktree, vim mode). The +/- session diff lives on
  // the consumption row instead, since it's a session-output tally.
  const gitRowParts: string[] = []
  if (git) {
    const gitStr = renderGitStatus(git)
    if (gitStr) gitRowParts.push(gitStr)
  }
  gitRowParts.push(...renderWorkspaceInfo(data))
  if (gitRowParts.length > 0) session.push(GUTTERS.git + gitRowParts.join(SEP))

  // Row 2 (consumption, yellow): rate limits → tok/s → +/- → tokens.
  // Ordered most-stable to most-variable in character width so the items the
  // eye anchors on (rate limits with fixed-shape bars/countdowns) don't shift
  // horizontally as token totals and session diff grow over the session.
  // Wrap logic in lines.ts splits at SEP boundaries when the row exceeds
  // terminal width.
  const consumptionParts: string[] = []
  if (data.rateLimit5h) consumptionParts.push(renderRateLimit("5h", data.rateLimit5h))
  if (data.rateLimit7d) consumptionParts.push(renderRateLimit("7d", data.rateLimit7d))
  const outputSpeed = transcript ? renderOutputSpeed(transcript.assistantSamples) : null
  if (outputSpeed) consumptionParts.push(outputSpeed)
  const sessionDiff = renderSessionDiff(data)
  if (sessionDiff) consumptionParts.push(sessionDiff)
  const tokenBreakdown = transcript ? renderTokenBreakdown(transcript.tokenTotals) : null
  if (tokenBreakdown) consumptionParts.push(tokenBreakdown)
  if (consumptionParts.length > 0) session.push(GUTTERS.consumption + consumptionParts.join(SEP))

  const activity: string[] = []

  if (transcript) {
    // Row 3 (tools, cyan): running with spinner + completed with counts.
    const toolParts = [
      ...renderRunningTools(transcript.runningTools),
      ...renderCompletedTools(transcript.tools),
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
  const effort = renderEffort(config?.effortLevel ?? null)
  const cavemanChip = renderCaveman(caveman)

  return { session, activity, activityTitle, effort, caveman: cavemanChip }
}
