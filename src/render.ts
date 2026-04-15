// Layout composition — up to 4 lines with semantic grouping

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
import type { TranscriptData } from "./transcript"
import { c, dim, gradientBar, pctColor, formatDuration, formatResetIn } from "./format"

const I = {
  folder: "\uf07c",  //
  branch: "\ue0a0",  //
  clock:  "\uf017",  //
  gauge:  "\uf0e4",  //
  tree:   "\uf1bb",  //
} as const

const GAP = "   " // 3 spaces within a group
const SEP = dim("  │  ") // between different semantic groups
const RESET = "\x1b[0m"

function ctxEmoji(pct: number): string {
  if (pct >= 90) return "🚨"
  if (pct >= 70) return "🔥"
  if (pct >= 20) return "⚡"
  return "🟢"
}

function sizeLabel(size: number | null): string {
  if (!size) return ""
  return size >= 1000000 ? " (1M)" : " (200K)"
}

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

export function renderLines(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): string[] {
  // --- Line 1: session (all elements, spaces only) ---
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

  if (data.worktree) {
    line1.push(c("magenta", `${I.tree} ${data.worktree}`))
  }

  line1.push(`${ctxEmoji(data.ctx)} ${gradientBar(data.ctx)} ${pctColor(data.ctx)}${Math.round(data.ctx)}%${RESET}${dim(sizeLabel(data.ctxSize))}`)

  const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
  line1.push(c("yellow", costLabel))

  if (data.added > 0 || data.removed > 0) {
    line1.push(`${c("green", `+${data.added}`)} ${c("red", `-${data.removed}`)}`)
  }

  if (data.dur >= 1000) {
    line1.push(dim(`${I.clock} ${formatDuration(data.dur)}`))
  }

  if (data.vimMode) {
    line1.push(dim(data.vimMode))
  }

  // --- Line 2: rate limits (own line, spaces only) ---
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

  // --- Line 3: environment (config counts + session name) ---
  const line3: string[] = []

  if (config) {
    if (config.claudeMd > 0) line3.push(dim(`${config.claudeMd} CLAUDE.md`))
    if (config.rules > 0)    line3.push(dim(`${config.rules} rules`))

    const mcpOk = transcript?.mcpStatus.ok ?? new Set()
    const mcpErr = transcript?.mcpStatus.errored ?? new Set()
    const mcpSeen = new Set([...mcpOk, ...mcpErr])
    const mcpCount = Math.max(config.mcps, mcpSeen.size)
    if (mcpCount > 0) {
      if (mcpErr.size > 0) {
        line3.push(c("red", `${mcpCount} MCPs (${mcpErr.size} ✗)`))
      } else if (mcpOk.size > 0) {
        line3.push(c("green", `${mcpCount} MCPs ✓`))
      } else {
        line3.push(dim(`${mcpCount} MCPs`))
      }
    }

    if (config.hooks > 0) line3.push(dim(`${config.hooks} hooks`))
  }

  if (data.sessionName) {
    line3.push(dim(data.sessionName))
  }

  // --- Line 4: activity (tools │ agents │ todos) ---
  const line4: string[] = []

  if (transcript) {
    // Running tools (with spinner + target)
    const runningParts: string[] = []
    for (const t of transcript.runningTools) {
      const label = t.target ? `${t.name}: ${t.target}` : t.name
      runningParts.push(`${c("cyan", spin())} ${label}`)
    }

    // Completed tools (top 5 by count)
    const toolParts: string[] = []
    let count = 0
    for (const [name, n] of transcript.tools) {
      if (count++ >= 5) break
      toolParts.push(`${c("green", "✓")} ${name} ×${n}`)
    }

    const allTools = [...runningParts, ...toolParts]
    if (allTools.length > 0) line4.push(allTools.join(GAP))

    // Agents (last 3)
    const agentParts: string[] = []
    for (const agent of transcript.agents) {
      if (agent.running) {
        agentParts.push(`${c("cyan", spin())} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      } else {
        agentParts.push(`${c("green", "✓")} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      }
    }
    if (agentParts.length > 0) line4.push(agentParts.join(GAP))

    // Todos
    const { total, completed, current } = transcript.todos
    if (total > 0) {
      if (current) {
        const label = current.length > 40 ? current.slice(0, 37) + "..." : current
        line4.push(`${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`)
      } else if (completed === total) {
        line4.push(`${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`)
      }
    }
  }

  // Assemble lines
  const lines = [line1.join(GAP)]
  if (line2.length > 0) lines.push(line2.join(GAP))
  if (line3.length > 0) lines.push(line3.join(GAP))
  if (line4.length > 0) lines.push(line4.join(SEP))
  return lines
}
