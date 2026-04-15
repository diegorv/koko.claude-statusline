// Layout composition — up to 3 lines

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

const SEP = dim("  │  ")
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

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  return `${min}m ${sec % 60}s`
}

export function renderLines(data: StdinData, git: GitInfo | null, config: ConfigCounts | null, transcript: TranscriptData | null = null): string[] {
  // --- Line 1: session (git + context + cost + changes + duration + vim) ---
  const line1: string[] = []

  if (git?.repo) {
    let str = `${bold("yellow", `${I.folder} ${git.repo}`)}  ${c("green", `${I.branch} ${git.branch}`)}`
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

  line1.push(`${ctxEmoji(data.ctx)} ${gradientBar(data.ctx)} ${pctColor(data.ctx)}${Math.round(data.ctx)}%${RESET}${dim(sizeLabel(data.ctxSize))}`)
  line1.push(c("yellow", `$${data.cost.toFixed(2)}`))

  if (data.added > 0 || data.removed > 0) {
    line1.push(`${c("green", `+${data.added}`)} ${c("red", `-${data.removed}`)}`)
  }

  if (data.dur > 0) {
    line1.push(dim(`${I.clock} ${formatDuration(data.dur)}`))
  }

  if (data.vimMode) {
    line1.push(dim(data.vimMode))
  }

  // --- Line 2: environment (rate limits + config counts + worktree + session name) ---
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

  if (config) {
    const counts: string[] = []
    if (config.claudeMd > 0) counts.push(`${config.claudeMd} CLAUDE.md`)
    if (config.rules > 0)    counts.push(`${config.rules} rules`)
    if (config.mcps > 0)     counts.push(`${config.mcps} MCPs`)
    if (config.hooks > 0)    counts.push(`${config.hooks} hooks`)
    for (const ct of counts) line2.push(dim(ct))
  }

  if (data.worktree) {
    line2.push(c("magenta", `${I.tree} ${data.worktree}`))
  }

  if (data.sessionName) {
    line2.push(dim(data.sessionName))
  }

  // --- Line 3: activity (tools + agents + todos) ---
  const line3: string[] = []

  if (transcript) {
    // Tools: top 5 by count
    const toolParts: string[] = []
    let count = 0
    for (const [name, n] of transcript.tools) {
      if (count++ >= 5) break
      toolParts.push(`${c("green", "✓")} ${name} ×${n}`)
    }
    if (toolParts.length > 0) line3.push(toolParts.join("  "))

    // Agents: last 3
    for (const agent of transcript.agents) {
      if (agent.running) {
        line3.push(`${c("cyan", "◐")} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      } else {
        line3.push(`${c("green", "✓")} ${agent.type} ${dim(`(${formatElapsed(agent.elapsed)})`)}`)
      }
    }

    // Todos
    const { total, completed, current } = transcript.todos
    if (total > 0) {
      if (current) {
        const label = current.length > 40 ? current.slice(0, 37) + "..." : current
        line3.push(`${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`)
      } else if (completed === total) {
        line3.push(`${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`)
      }
    }
  }

  const lines = [line1.join(SEP)]
  if (line2.length > 0) lines.push(line2.join(SEP))
  if (line3.length > 0) lines.push(line3.join(SEP))
  return lines
}
