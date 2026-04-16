// Component: git branch and working tree status

import type { GitInfo } from "../../collection/git"
import { c, dim } from "../format"
import { ICONS } from "../constants"

/**
 * Renders git branch and working tree status as a formatted string.
 * Includes branch name, dirty indicator, staged/modified/untracked counts, and ahead/behind.
 * @param git - Git repository information.
 * @returns Formatted git status string, or empty string if no repo.
 */
export function renderGitStatus(git: GitInfo): string {
  if (!git.repo) return ""

  const branchDisplay = git.branch.length > 25 ? git.branch.slice(0, 22) + "..." : git.branch
  let str = `${c("green", `${ICONS.branch} ${branchDisplay}`)}`
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

  return str
}
