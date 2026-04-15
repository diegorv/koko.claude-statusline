// Component: workspace metadata (worktree, file changes, vim mode)

import type { StdinData } from "../../parsing/stdin"
import { c, dim } from "../format"
import { ICONS } from "../constants"

/**
 * Renders workspace metadata parts: worktree name, file change counts, and vim mode.
 * @param data - Parsed stdin data with workspace info.
 * @returns Array of formatted string parts (may be empty).
 */
export function renderWorkspaceInfo(data: StdinData): string[] {
  const parts: string[] = []
  if (data.worktree) parts.push(c("magenta", `${ICONS.tree} ${data.worktree}`))
  if (data.linesAdded > 0 || data.linesRemoved > 0) parts.push(`${c("green", `+${data.linesAdded}`)} ${c("red", `-${data.linesRemoved}`)}`)
  if (data.vimMode) parts.push(dim(data.vimMode))
  return parts
}
