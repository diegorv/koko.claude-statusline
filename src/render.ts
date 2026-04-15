// Layout composition — 2-column grid layout

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
import type { TranscriptData } from "./transcript"
import { c, bold, dim, gradientBar, pctColor, formatDuration, formatResetIn } from "./format"

const I = {
  folder: "\uf07c",  //
  branch: "\ue0a0",  //
  clock:  "\uf017",  //
  gauge:  "\uf0e4",  //
  tree:   "\uf1bb",  //
} as const

const GAP = "   "
const RESET = "\x1b[0m"
const ANSI_RE = /\x1b\[[0-9;]*m/g

const vlen = (s: string) => [...s.replace(ANSI_RE, "")].length

// Pad a string with ANSI codes to a visual width
function col(left: string, right: string, width = 42): string {
  const pad = Math.max(2, width - vlen(left))
  return left + " ".repeat(pad) + right
}

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
  const lines: string[] = []

  // === Row 1: git identity (left) + context bar (right) ===
  let gitStr = ""
  if (git?.repo) {
    gitStr = `${bold("yellow", `${I.folder} ${git.repo}`)}  ${c("green", `${I.branch} ${git.branch}`)}`
    if (git.dirty) gitStr += c("yellow", "*")

    const stats: string[] = []
    if (git.staged > 0)    stats.push(c("green", `+${git.staged}`))
    if (git.modified > 0)  stats.push(c("yellow", `~${git.modified}`))
    if (git.untracked > 0) stats.push(dim(`?${git.untracked}`))
    if (stats.length > 0) gitStr += `  ${stats.join(" ")}`

    const sync: string[] = []
    if (git.ahead > 0)  sync.push(c("green", `↑${git.ahead}`))
    if (git.behind > 0) sync.push(c("red", `↓${git.behind}`))
    if (sync.length > 0) gitStr += `  ${sync.join(" ")}`
  }

  if (data.worktree) {
    gitStr += (gitStr ? GAP : "") + c("magenta", `${I.tree} ${data.worktree}`)
  }

  const ctxStr = `${ctxEmoji(data.ctx)} ${gradientBar(data.ctx)} ${pctColor(data.ctx)}${Math.round(data.ctx)}%${RESET}${dim(sizeLabel(data.ctxSize))}`

  if (gitStr) {
    lines.push(col(gitStr, ctxStr))
  } else {
    lines.push(ctxStr)
  }

  // === Row 2: cost + changes + duration (left) + rate limits (right) ===
  const metaParts: string[] = []
  const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
  metaParts.push(c("yellow", costLabel))
  if (data.added > 0 || data.removed > 0) {
    metaParts.push(`${c("green", `+${data.added}`)} ${c("red", `-${data.removed}`)}`)
  }
  if (data.dur >= 1000) {
    metaParts.push(dim(`${I.clock} ${formatDuration(data.dur)}`))
  }
  if (data.vimMode) {
    metaParts.push(dim(data.vimMode))
  }

  const rlParts: string[] = []
  if (data.rl5h) {
    let str = `${I.gauge} 5h ${gradientBar(data.rl5h.pct, 8)} ${pctColor(data.rl5h.pct)}${data.rl5h.pct}%${RESET}`
    const reset = data.rl5h.resetsAt ? formatResetIn(data.rl5h.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    rlParts.push(str)
  }
  if (data.rl7d) {
    let str = `7d ${gradientBar(data.rl7d.pct, 8)} ${pctColor(data.rl7d.pct)}${data.rl7d.pct}%${RESET}`
    const reset = data.rl7d.resetsAt ? formatResetIn(data.rl7d.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    rlParts.push(str)
  }

  const metaStr = metaParts.join(GAP)
  const rlStr = rlParts.join(GAP)
  if (rlStr) {
    lines.push(col(metaStr, rlStr))
  } else {
    lines.push(metaStr)
  }

  // === Row 3: config counts (left) + agents (right) ===
  const envParts: string[] = []
  if (config) {
    if (config.claudeMd > 0) envParts.push(dim(`${config.claudeMd} CLAUDE.md`))
    if (config.rules > 0)    envParts.push(dim(`${config.rules} rules`))

    const mcpOk = transcript?.mcpStatus.ok ?? new Set()
    const mcpErr = transcript?.mcpStatus.errored ?? new Set()
    const mcpSeen = new Set([...mcpOk, ...mcpErr])
    const mcpCount = Math.max(config.mcps, mcpSeen.size)
    if (mcpCount > 0) {
      if (mcpErr.size > 0) {
        envParts.push(c("red", `${mcpCount} MCPs (${mcpErr.size} ✗)`))
      } else if (mcpOk.size > 0) {
        envParts.push(c("green", `${mcpCount} MCPs ✓`))
      } else {
        envParts.push(dim(`${mcpCount} MCPs`))
      }
    }
    if (config.hooks > 0) envParts.push(dim(`${config.hooks} hooks`))
  }
  if (data.sessionName) {
    envParts.push(dim(data.sessionName))
  }

  const agentParts: string[] = []
  if (transcript) {
    for (const agent of transcript.agents) {
      if (agent.running) {
        agentParts.push(`${c("cyan", spin())} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      } else {
        agentParts.push(`${c("green", "✓")} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      }
    }
  }

  if (envParts.length > 0 || agentParts.length > 0) {
    const envStr = envParts.join(GAP)
    const agentStr = agentParts.join(GAP)
    if (envStr && agentStr) {
      lines.push(col(envStr, agentStr))
    } else {
      lines.push(envStr || agentStr)
    }
  }

  // === Row 4: tools (left) + todos (right) ===
  if (transcript) {
    const runningParts: string[] = []
    for (const t of transcript.runningTools) {
      const label = t.target ? `${t.name}: ${t.target}` : t.name
      runningParts.push(`${c("cyan", spin())} ${label}`)
    }

    const toolParts: string[] = []
    let count = 0
    for (const [name, n] of transcript.tools) {
      if (count++ >= 5) break
      toolParts.push(`${c("green", "✓")} ${name} ×${n}`)
    }

    const allTools = [...runningParts, ...toolParts]

    let todoStr = ""
    const { total, completed, current } = transcript.todos
    if (total > 0) {
      if (current) {
        const label = current.length > 35 ? current.slice(0, 32) + "..." : current
        todoStr = `${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`
      } else if (completed === total) {
        todoStr = `${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`
      }
    }

    if (allTools.length > 0 || todoStr) {
      const toolStr = allTools.join(GAP)
      if (toolStr && todoStr) {
        lines.push(col(toolStr, todoStr))
      } else {
        lines.push(toolStr || todoStr)
      }
    }
  }

  return lines
}
