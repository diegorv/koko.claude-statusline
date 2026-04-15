// Layout composition — 2 boxes: session + activity

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
import type { TranscriptData } from "./transcript"
import { c, dim, gradientBar, pctColor, formatResetIn } from "./format"

const I = {
  branch: "\ue0a0",  //
  gauge:  "\uf0e4",  //
  tree:   "\uf1bb",  //
} as const

const GAP = "   "
const SEP = dim("  │  ")
const RESET = "\x1b[0m"

const SPINNER = ["◐", "◓", "◑", "◒"]

function spin(): string {
  return SPINNER[Math.floor(Date.now() / 300) % SPINNER.length]
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  return `${min}m ${sec % 60}s`
}

export interface RenderResult {
  session: string[]
  activity: string[]   // title line for activity box
  activityTitle: string
}

export function render(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): RenderResult {
  // ===== BOX 1: SESSION =====
  const session: string[] = []

  // Line 1: branch + git stats + worktree + vim
  const line1: string[] = []
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

    line1.push(str)
  }
  if (data.worktree) line1.push(c("magenta", `${I.tree} ${data.worktree}`))
  if (data.added > 0 || data.removed > 0) line1.push(`${c("green", `+${data.added}`)} ${c("red", `-${data.removed}`)}`)
  if (data.vimMode) line1.push(dim(data.vimMode))
  if (line1.length > 0) session.push(line1.join(GAP))

  // Line 2: rate limits
  const line2: string[] = []
  if (data.rl5h) {
    let str = `${I.gauge} 5h ${gradientBar(data.rl5h.pct, 8)} ${pctColor(data.rl5h.pct)}${data.rl5h.pct}%${RESET}`
    const reset = data.rl5h.resetsAt ? formatResetIn(data.rl5h.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    line2.push(str)
  }
  if (data.rl7d) {
    let str = `7d ${gradientBar(data.rl7d.pct, 8)} ${pctColor(data.rl7d.pct)}${data.rl7d.pct}%${RESET}`
    const reset = data.rl7d.resetsAt ? formatResetIn(data.rl7d.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    line2.push(str)
  }
  if (line2.length > 0) session.push(line2.join(GAP))

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
        agentParts.push(`${c("cyan", spin())} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      } else {
        agentParts.push(`${c("green", "✓")} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
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
