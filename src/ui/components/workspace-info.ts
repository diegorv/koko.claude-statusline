// Component: workspace metadata (worktree, vim mode)
//
// The +/- line counter is intentionally NOT here — it's a "session output
// tally" alongside tokens, so it lives on the consumption row via
// renderSessionDiff. This component covers only the spatial context: where
// I'm working (worktree) and how I'm editing (vim mode).

import type { StdinData } from "../../parsing/stdin.ts"
import { c, dim } from "../format.ts"
import { ICONS } from "../constants.ts"

/**
 * Renders workspace metadata: worktree name and vim mode.
 * @param gitWorktree - Linked git worktree name, used when Claude Code reports none.
 * @returns Array of formatted string parts (may be empty).
 */
export function renderWorkspaceInfo(data: StdinData, gitWorktree = ""): string[] {
  const parts: string[] = []
  const worktree = data.worktree || gitWorktree
  if (worktree) parts.push(c("magenta", `${ICONS.tree} ${worktree}`))
  if (data.vimMode) parts.push(dim(data.vimMode))
  return parts
}
