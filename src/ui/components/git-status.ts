// Component: git branch and working tree status

import type { GitInfo } from "../../collection/git.ts"
import { c, dim } from "../format.ts"

/**
 * Renders git branch and working tree status as a formatted string.
 * Includes branch name, dirty indicator, staged/modified/untracked counts, and ahead/behind.
 * @param git - Git repository information.
 * @returns Formatted git status string, or empty string if no repo.
 */
export function renderGitStatus(git: GitInfo): string {
  if (!git.repo) return ""

  // Only truncate pathologically long names; the row wraps at SEP boundaries
  // when needed, so a normal branch like `feat/table-of-contents-plugin`
  // should pass through intact.
  const branchDisplay = git.branch.length > 80 ? git.branch.slice(0, 77) + "..." : git.branch
  // Fork marker (⑂) precedes the branch name so the user notices the repo
  // isn't the canonical upstream before reading anything else on the row.
  // Branch icon comes from the row's gutter (see render.ts), not here.
  const forkPrefix = git.isFork ? c("magenta", "⑂ ") : ""
  let str = `${forkPrefix}${c("green", branchDisplay)}`
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

  // Short SHA tail — dim so it reads as a low-importance breadcrumb next to
  // the colored branch / status section.
  if (git.sha) str += `  ${dim(git.sha)}`

  return str
}
