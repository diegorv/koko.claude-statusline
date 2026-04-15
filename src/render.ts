// Layout composition — 2-line layout

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
import type { ConfigCounts } from "./config"
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

export function renderLines(data: StdinData, git: GitInfo | null, config: ConfigCounts | null): string[] {
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

  const lines = [line1.join(SEP)]
  if (line2.length > 0) lines.push(line2.join(SEP))
  return lines
}
