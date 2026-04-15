// Component: currently running tools with spinner

import type { RunningTool } from "../../parsing/transcript"
import { c } from "../format"
import { spin } from "../constants"

/**
 * Renders currently running tools with a spinner animation and optional target info.
 * @param tools - Array of currently running tools.
 * @returns Array of formatted running tool strings.
 */
export function renderRunningTools(tools: RunningTool[]): string[] {
  return tools.map(t => {
    const label = t.target ? `${t.name}: ${t.target}` : t.name
    return `${c("cyan", spin())} ${label}`
  })
}
