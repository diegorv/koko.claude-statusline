// Layout composition

import type { StdinData } from "./stdin"
import type { GitInfo } from "./git"
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

export function renderLine(data: StdinData, git: GitInfo | null): string {
  const parts: string[] = []

  // Git: repo + branch + file stats + ahead/behind
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

    parts.push(str)
  }

  // Worktree
  if (data.worktree) {
    parts.push(c("magenta", `${I.tree} ${data.worktree}`))
  }

  // Context bar
  parts.push(`${gradientBar(data.ctx)} ${pctColor(data.ctx)}${Math.round(data.ctx)}%${RESET}`)

  // Cost
  parts.push(c("yellow", `$${data.cost.toFixed(2)}`))

  // Lines added/removed
  if (data.added > 0 || data.removed > 0) {
    parts.push(`${c("green", `+${data.added}`)} ${c("red", `-${data.removed}`)}`)
  }

  // Duration
  if (data.dur > 0) {
    parts.push(dim(`${I.clock} ${formatDuration(data.dur)}`))
  }

  // Vim mode
  if (data.vimMode) {
    parts.push(dim(data.vimMode))
  }

  // Rate limits
  if (data.rl5h) {
    let str = `${I.gauge} 5h ${gradientBar(data.rl5h.pct, 8)} ${pctColor(data.rl5h.pct)}${data.rl5h.pct}%${RESET}`
    const reset = data.rl5h.resetsAt ? formatResetIn(data.rl5h.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    parts.push(str)
  }

  if (data.rl7d) {
    let str = `7d ${gradientBar(data.rl7d.pct, 8)} ${pctColor(data.rl7d.pct)}${data.rl7d.pct}%${RESET}`
    const reset = data.rl7d.resetsAt ? formatResetIn(data.rl7d.resetsAt) : ""
    if (reset) str += dim(` (${reset})`)
    parts.push(str)
  }

  return parts.join(SEP)
}
