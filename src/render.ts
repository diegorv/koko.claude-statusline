// Layout composition — 2 boxes: session + activity

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
import type { TranscriptData } from "./transcript"
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

export interface RenderResult {
  session: string[]
  activity: string[]   // title line for activity box
  activityTitle: string
}

export function render(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): RenderResult {
  // ===== BOX 1: SESSION =====
  const session: string[] = []

  // Single line: git info │ rate limits
  const parts: string[] = []

  // Git section
  if (git?.repo) {
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

    parts.push(str)
  }
  if (data.worktree) parts.push(c("magenta", `${I.tree} ${data.worktree}`))
  if (data.linesAdded > 0 || data.linesRemoved > 0) parts.push(`${c("green", `+${data.linesAdded}`)} ${c("red", `-${data.linesRemoved}`)}`)
  if (data.vimMode) parts.push(dim(data.vimMode))

  // Rate limits section
  if (data.rateLimit5h) {
    let str = `${I.gauge} 5h ${gradientBar(data.rateLimit5h.pct, 8)} ${pctColor(data.rateLimit5h.pct)}${data.rateLimit5h.pct}%${RESET}`
    const reset = data.rateLimit5h.resetsAt ? formatResetIn(data.rateLimit5h.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    parts.push(str)
  }
  if (data.rateLimit7d) {
    let str = `7d ${gradientBar(data.rateLimit7d.pct, 8)} ${pctColor(data.rateLimit7d.pct)}${data.rateLimit7d.pct}%${RESET}`
    const reset = data.rateLimit7d.resetsAt ? formatResetIn(data.rateLimit7d.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    parts.push(str)
  }

  if (parts.length > 0) session.push(parts.join(SEP))

  // ===== BOX 2: ACTIVITY =====
  const activity: string[] = []

  // Activity content: tools + agents + todos
  const actLeft: string[] = []  // tools + agents + todos

  if (transcript) {
    // Running tools
    const runningParts: string[] = []
    for (const t of transcript.runningTools) {
      const label = t.target ? `${t.name}: ${t.target}` : t.name
      runningParts.push(`${c("cyan", spin())} ${label}`)
    }

    // Completed tools (top 5)
    const toolParts: string[] = []
    let count = 0
    for (const [name, n] of transcript.tools) {
      if (count++ >= 5) break
      toolParts.push(`${c("green", "✓")} ${name} ×${n}`)
    }

    const allTools = [...runningParts, ...toolParts]
    if (allTools.length > 0) actLeft.push(allTools.join(GAP))

    // Agents
    const agentParts: string[] = []
    for (const agent of transcript.agents) {
      if (agent.running) {
        agentParts.push(`${c("cyan", spin())} ${agent.type} ${dim(`(${formatDuration(agent.elapsed)})`)}`)
      } else {
        agentParts.push(`${c("green", "✓")} ${agent.type} ${dim(`(${formatDuration(agent.elapsed)})`)}`)
      }
    }
    if (agentParts.length > 0) actLeft.push(agentParts.join(GAP))

    // Todos
    const { total, completed, current } = transcript.todos
    if (total > 0) {
      if (current) {
        const label = current.length > 35 ? current.slice(0, 32) + "..." : current
        actLeft.push(`${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`)
      } else if (completed === total) {
        actLeft.push(`${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`)
      }
    }
  }

  if (actLeft.length > 0) activity.push(actLeft.join(SEP))

  // Activity title (right side: config counts)
  const titleParts: string[] = []
  if (config) {
    if (config.claudeMd > 0) titleParts.push(`${config.claudeMd} CLAUDE.md`)

    const mcpOk = transcript?.mcpStatus.ok ?? new Set()
    const mcpErr = transcript?.mcpStatus.errored ?? new Set()
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
  if (data.sessionName) titleParts.push(data.sessionName)

  const activityTitle = titleParts.join(GAP)

  return { session, activity, activityTitle }
}
