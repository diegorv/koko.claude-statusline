// Component: completed tool usage counts

import { c } from "../format"

/**
 * Renders completed tool usage counts, sorted by frequency.
 * @param tools - Map of tool name to completion count (pre-sorted).
 * @param limit - Maximum number of tools to display (default: 5).
 * @returns Array of formatted tool count strings.
 */
export function renderCompletedTools(tools: Map<string, number>, limit = 5): string[] {
  const parts: string[] = []
  let count = 0
  for (const [name, n] of tools) {
    if (count++ >= limit) break
    parts.push(`${c("green", "✓")} ${name} ×${n}`)
  }
  return parts
}
