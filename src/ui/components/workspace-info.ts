// Component: workspace metadata (worktree, vim mode)
//
// The +/- line counter is intentionally NOT here — it's a "session output
// tally" alongside tokens, so it lives on the consumption row via
// renderSessionDiff. This component covers only the spatial context: where
// I'm working (worktree) and how I'm editing (vim mode).

import type { StdinData } from "../../parsing/stdin"
import { c, dim } from "../format"
import { ICONS } from "../constants"

/**
 * Renders workspace metadata: worktree name and vim mode.
 * @returns Array of formatted string parts (may be empty).
 */
export function renderWorkspaceInfo(data: StdinData): string[] {
  const parts: string[] = []
  if (data.worktree) parts.push(c("magenta", `${ICONS.tree} ${data.worktree}`))
  if (data.vimMode) parts.push(dim(data.vimMode))
  return parts
}
